"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Floor } from "./Floor";
import { bodyHeight, GAP } from "./geometry";
import { lockMap, floorReadiness, visibleFloors } from "@/lib/floor-build";
import { floorState } from "@/lib/floor-state";
import type { Subject } from "@/data/types";
import type { Tier } from "@/lib/device-tier";

interface SpireProps {
  subject: Subject;
  subjectKey: string;
  mode: "student" | "parent";
  theme: "light" | "dark";
  focusId: string | null;
  selectedId: string | null;
  lightMode: boolean;
  reduceMotion: boolean;
  tier: Tier;
  onPick: (id: string, clientX: number, clientY: number) => void;
}

/** Цвета сцены по теме (фон/туман/свет/сетка). */
function sceneTheme(theme: "light" | "dark") {
  return theme === "light"
    ? {
        // приглушённый сине-стальной, а не выбеленный — Шпиль читается.
        // Туман заметно реже, чем в тёмной: на светлом фоне exp2-дымка
        // «умолочивает» этажи и башня теряет объём.
        bg: 0xccd6e6,
        fog: 0xc4cfe0,
        fogDensity: 0.01,
        ambient: 0x9fb0cf,
        ambientI: 0.66,
        dirI: 1.25,
        grid1: 0x54648a,
        grid2: 0x8b99b8,
        gridOpacity: 0.5,
        starColor: 0x6f80a0,
      }
    : {
        bg: 0x070a14,
        fog: 0x070a14,
        fogDensity: 0.022,
        ambient: 0x4a5878,
        ambientI: 0.95,
        dirI: 0.6,
        grid1: 0x2a3a5c,
        grid2: 0x18233b,
        gridOpacity: 0.16,
        starColor: 0x8fa6d6,
      };
}

interface Layout {
  metas: { floor: Subject["floors"][number]; baseY: number; phase: number }[];
  total: number;
}

function buildLayout(floors: Subject["floors"]): Layout {
  let y = 0;
  const metas = floors.map((floor, idx) => {
    const bH = bodyHeight(floor.geom);
    const cy = y + bH / 2;
    y += bH + GAP;
    return { floor, baseY: cy, phase: idx * 1.7 };
  });
  return { metas, total: Math.max(0, y - GAP) };
}

/**
 * Обзорная раскладка камеры под высоту ВИДИМОЙ башни.
 *  - Невысокая башня (≤ WINDOW) кадрируется ЦЕЛИКОМ: дистанция считается из
 *    вертикального FOV (46°, полу-угол 23° → dist ≳ H·1.18), с запасом.
 *  - Высокая башня не вмещается легибельно целиком → кадрируем верхнее «окно»
 *    (там фронтир, «где ты сейчас»), а низ добирается панорамой (targetT ∈ [0,total]).
 * Раньше dist=total·0.8+6.5 (cap 28) рос слишком медленно и обрезал башни выше
 * ~20 этажей — теперь наклон 1.35 реально вмещает кадр.
 */
function overviewFor(total: number) {
  const WINDOW = 22; // макс. высота кадра, при которой этажи ещё читаемы
  const framedH = Math.min(total, WINDOW);
  const dist = Math.min(40, Math.max(9, framedH * 1.35 + 4.5));
  const lift = Math.min(3.2, Math.max(1, framedH * 0.13));
  // короткая — по центру; высокая — центр кадра у вершины (фронтир)
  const target = total <= WINDOW ? total * 0.5 : total - framedH * 0.5;
  return { target, dist, lift };
}

/* ——— Камера: плавный наезд/отъезд, idle-spin, фокус-димминг ——— */
function CameraRig({
  layout,
  focusId,
  mode,
  reduceMotion,
  spireRef,
  selectorRef,
  selectorYRef,
  yawRef,
  controls,
}: {
  layout: Layout;
  focusId: string | null;
  mode: "student" | "parent";
  reduceMotion: boolean;
  spireRef: React.RefObject<THREE.Group>;
  selectorRef: React.RefObject<THREE.Mesh>;
  selectorYRef: React.MutableRefObject<number>;
  yawRef: React.MutableRefObject<number>;
  controls: React.MutableRefObject<{
    dist: number;
    distT: number;
    target: number;
    targetT: number;
    lift: number;
    liftT: number;
  }>;
}) {
  const { camera } = useThree();
  const ov = overviewFor(layout.total);

  // при смене фокуса задаём целевые значения камеры
  React.useEffect(() => {
    const c = controls.current;
    if (focusId) {
      const m = layout.metas.find((x) => x.floor.id === focusId);
      if (m) {
        c.targetT = m.baseY;
        c.distT = 6.8;
        c.liftT = 0.55;
      }
    } else {
      c.targetT = ov.target;
      c.distT = ov.dist;
      c.liftT = ov.lift;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, layout]);

  // первичная раскладка камеры под новый предмет / изменившуюся высоту башни
  React.useEffect(() => {
    const c = controls.current;
    // если сейчас в фокусе — не сбиваем наезд, только обновим цель обзора
    if (!focusId) {
      c.target = ov.target;
      c.targetT = ov.target;
      c.dist = ov.dist;
      c.distT = ov.dist;
      c.lift = ov.lift;
      c.liftT = ov.lift;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.total]);

  useFrame(({ clock }) => {
    const c = controls.current;
    c.dist += (c.distT - c.dist) * 0.09;
    c.target += (c.targetT - c.target) * 0.11;
    c.lift += (c.liftT - c.lift) * 0.11;

    const cx = Math.sin(yawRef.current) * c.dist;
    const cz = Math.cos(yawRef.current) * c.dist;
    camera.position.set(cx, c.target + c.lift, cz);
    camera.lookAt(0, c.target, 0);

    // idle-spin (выкл. при reduce-motion / родитель / фокусе)
    if (spireRef.current && !reduceMotion && mode !== "parent" && !focusId) {
      spireRef.current.rotation.y += 0.0016;
    }

    // пульс селектора
    const sel = selectorRef.current;
    if (sel && (sel.material as THREE.Material).opacity > 0) {
      sel.position.y += (selectorYRef.current - sel.position.y) * 0.18;
      const t = clock.getElapsedTime();
      sel.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
      sel.rotation.z += 0.02;
    }
  });

  return null;
}

/* ——— Звёзды (тиринг) ——— */
function Stars({
  tier,
  lightMode,
  reduceMotion,
  color = 0x8fa6d6,
}: {
  tier: Tier;
  lightMode: boolean;
  reduceMotion: boolean;
  color?: number;
}) {
  const ref = React.useRef<THREE.Points>(null);
  const geom = React.useMemo(() => {
    const count = lightMode ? 0 : tier === "high" ? 640 : tier === "mid" ? 280 : 0;
    if (!count) return null;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 16 + Math.random() * 26,
        t = Math.random() * Math.PI * 2,
        p = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = Math.random() * 30 - 4;
      pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [tier, lightMode]);

  // освобождаем буфер при смене тира / лёгкого режима
  React.useEffect(() => () => geom?.dispose(), [geom]);

  useFrame(() => {
    if (ref.current && !reduceMotion) ref.current.rotation.y += 0.0003;
  });

  if (!geom) return null;
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial
        color={color}
        size={0.07}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  );
}

/* ——— Свет: тёплый/холодный rim + акцентный «прожектор» под цвет предмета ——— */
function Lights({
  accent,
  st,
  light,
}: {
  accent: THREE.Color;
  st: ReturnType<typeof sceneTheme>;
  light: boolean;
}) {
  const rim = React.useRef<THREE.PointLight>(null);
  const core = React.useRef<THREE.PointLight>(null);
  // в светлой теме акцентный прожектор тише (иначе пересвет)
  const coreBase = light ? 0.5 : 1.5;
  const rimBase = light ? 0.35 : 0.55;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (rim.current) rim.current.intensity = rimBase + Math.sin(t * 1.2) * 0.12;
    if (core.current) core.current.intensity = coreBase + Math.sin(t * 1.8) * (light ? 0.18 : 0.5);
  });
  return (
    <>
      <ambientLight color={st.ambient} intensity={st.ambientI} />
      <directionalLight color={0xffffff} intensity={st.dirI} position={[4, 9, 7]} />
      <pointLight ref={rim} color={accent} intensity={rimBase} distance={42} position={[-5, 5, -4]} />
      {/* прожектор-сердцевина у основания: подсвечивает Шпиль цветом предмета */}
      <pointLight ref={core} color={accent} intensity={coreBase} distance={16} position={[0, 1.2, 0]} />
    </>
  );
}

/* ============================================================
   SpireAura — акцентные эффекты вокруг Шпиля:
   светящийся ореол (billboard-спрайт), энергочастицы, лучи вверх,
   светящийся пьедестал. Всё с тирингом и реакцией на reduce-motion.
   ============================================================ */

/** Радиальная мягкая текстура для ореола/частиц (рисуется один раз). */
function makeGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

function SpireAura({
  accent,
  total,
  tier,
  lightMode,
  reduceMotion,
  dim,
  isLight,
}: {
  accent: THREE.Color;
  total: number;
  tier: Tier;
  lightMode: boolean;
  reduceMotion: boolean;
  dim: boolean; // притушить (родитель/фокус)
  isLight: boolean; // светлая тема
}) {
  const glowTex = React.useMemo(() => makeGlowTexture(), []);
  const mid = total * 0.5;
  // на светлом фоне аддитивное свечение «выбеливает» — частицы приглушаем,
  // ореол почти убираем (иначе сливается с фоном)
  const blend = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;

  // энергочастицы вокруг Шпиля (число — по тиру)
  const particleCount = lightMode ? 0 : tier === "high" ? 90 : tier === "mid" ? 40 : 0;
  const particles = React.useRef<THREE.Points>(null);
  const pGeom = React.useMemo(() => {
    if (!particleCount) return null;
    const pos = new Float32Array(particleCount * 3);
    const seed = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.4 + Math.random() * 2.6;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.random() * (total + 1);
      pos[i * 3 + 2] = Math.sin(a) * r;
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("seed", new THREE.Float32BufferAttribute(seed, 1));
    return g;
  }, [particleCount, total]);

  React.useEffect(() => () => pGeom?.dispose(), [pGeom]);
  React.useEffect(() => () => glowTex.dispose(), [glowTex]);

  // лучи вверх (тонкие конусы), только на high
  const beams = tier === "high" && !lightMode ? 3 : 0;

  const auraRef = React.useRef<THREE.Sprite>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (auraRef.current) {
      const s = 5.5 + Math.sin(t * 1.6) * 0.4;
      auraRef.current.scale.set(s, total + 3.4, 1);
    }
    if (particles.current && !reduceMotion) {
      particles.current.rotation.y += 0.0009;
      const arr = particles.current.geometry.getAttribute("position") as THREE.BufferAttribute;
      const seed = particles.current.geometry.getAttribute("seed") as THREE.BufferAttribute;
      for (let i = 0; i < arr.count; i++) {
        let y = arr.getY(i) + 0.006 + seed.getX(i) * 0.004;
        if (y > total + 1) y = 0;
        arr.setY(i, y);
      }
      arr.needsUpdate = true;
    }
  });

  // ореол: в тёмной — заметный, в светлой — почти отключён (выбеливает фон)
  const auraOpacity = (isLight ? 0.05 : 0.32) * (dim ? 0.4 : 1);
  const partOpacity = (isLight ? 0.4 : 0.7) * (dim ? 0.36 : 1);
  const showBeams = !isLight; // лучи только на тёмном

  return (
    <group>
      {/* мягкий вертикальный ореол за Шпилем */}
      <sprite ref={auraRef} position={[0, mid, -0.6]}>
        <spriteMaterial
          map={glowTex}
          color={accent}
          transparent
          opacity={auraOpacity}
          depthWrite={false}
          blending={blend}
        />
      </sprite>

      {/* энергочастицы */}
      {pGeom && (
        <points ref={particles} geometry={pGeom}>
          <pointsMaterial
            map={glowTex}
            color={accent}
            size={isLight ? 0.12 : 0.16}
            transparent
            opacity={partOpacity}
            depthWrite={false}
            blending={blend}
            sizeAttenuation
          />
        </points>
      )}

      {/* лучи вверх (только тёмная тема) */}
      {showBeams &&
        Array.from({ length: beams }, (_, i) => {
          const a = (i / beams) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.3, total * 0.5, Math.sin(a) * 1.3]}>
              <coneGeometry args={[0.06, total + 2, 6, 1, true]} />
              <meshBasicMaterial
                color={accent}
                transparent
                opacity={dim ? 0.04 : 0.09}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
    </group>
  );
}

/** Светящийся пьедестал под Шпилем (диски + кольца + восходящее свечение). */
function Pedestal({ accent, dim, isLight }: { accent: THREE.Color; dim: boolean; isLight: boolean }) {
  const ringRef = React.useRef<THREE.Mesh>(null);
  const glowRef = React.useRef<THREE.Mesh>(null);
  const glowMax = isLight ? 0.0 : 0.22; // на светлом гало почти убираем
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) ringRef.current.rotation.z += 0.004;
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = (dim ? glowMax * 0.45 : glowMax) + Math.sin(t * 1.8) * (isLight ? 0.0 : 0.05);
    }
  });
  return (
    <group position={[0, -0.62, 0]}>
      {/* диск-основание (на светлом — чуть плотнее, как «тень-подложка») */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.0, 64]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={isLight ? (dim ? 0.14 : 0.28) : dim ? 0.05 : 0.12}
        />
      </mesh>
      {/* гало основания (аддитив только на тёмном) */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[4.2, 64]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={glowMax}
          blending={isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* вращающееся энергокольцо */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[2.7, 0.025, 8, 90]} />
        <meshBasicMaterial color={accent} transparent opacity={dim ? 0.45 : 0.9} />
      </mesh>
    </group>
  );
}

/** Читает текущий акцент предмета из CSS-переменной (--accent = "r g b"). */
function useAccentColor(subjectKey: string): THREE.Color {
  return React.useMemo(() => {
    if (typeof window === "undefined") return new THREE.Color(0xf2b344);
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    const parts = v.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
      return new THREE.Color(`rgb(${parts[0]},${parts[1]},${parts[2]})`);
    }
    return new THREE.Color(0xf2b344);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);
}

/* ——— Контент сцены ——— */
function SpireContent({
  subject,
  subjectKey,
  mode,
  theme,
  focusId,
  selectedId,
  lightMode,
  reduceMotion,
  tier,
  onPick,
}: SpireProps) {
  // видимые этажи: все открытые + 3 закрытых «превью». Остальное скрыто и
  // проявляется по мере готовности — башня не растёт в бесконечный небоскрёб.
  const visible = React.useMemo(() => visibleFloors(subject.floors), [subject.floors]);
  const layout = React.useMemo(() => buildLayout(visible), [visible]);

  // карта блокировок по ПОЛНОМУ списку (индекс видимого == индекс полного,
  // т.к. видимые — префикс) — один проход по этажам
  const locks = React.useMemo(() => lockMap(subject.floors), [subject.floors]);

  // «самый слабый открытый» этаж (не заблокирован, ещё не монолит) — пульс
  // «начни здесь». Если таких нет — null.
  const weakestId = React.useMemo(() => {
    let id: string | null = null;
    let min = Infinity;
    subject.floors.forEach((f, i) => {
      if (locks[i] || floorState(f) === "solid") return;
      const r = floorReadiness(f);
      if (r < min) {
        min = r;
        id = f.id;
      }
    });
    return id;
  }, [subject.floors, locks]);

  const accent = useAccentColor(subjectKey);
  const st = React.useMemo(() => sceneTheme(theme), [theme]);
  const isLight = theme === "light";
  const { scene } = useThree();
  const dimAura = mode === "parent" || !!focusId;

  // фон сцены по теме
  React.useEffect(() => {
    scene.background = new THREE.Color(st.bg);
  }, [scene, st]);

  const spireRef = React.useRef<THREE.Group>(null);
  const selectorRef = React.useRef<THREE.Mesh>(null);
  const selectorYRef = React.useRef(0);
  const yawRef = React.useRef(0.5);
  const controls = React.useRef(
    (() => {
      const o = overviewFor(layout.total);
      return { dist: o.dist, distT: o.dist, target: o.target, targetT: o.target, lift: o.lift, liftT: o.lift };
    })()
  );
  // актуальная высота башни для клампа панорамирования (без ре-биндинга слушателей)
  const totalRef = React.useRef(layout.total);
  totalRef.current = layout.total;
  const { gl } = useThree();

  // селектор следует за выбранным этажом
  React.useEffect(() => {
    const sel = selectorRef.current;
    if (!sel) return;
    const mat = sel.material as THREE.MeshBasicMaterial;
    if (selectedId) {
      const m = layout.metas.find((x) => x.floor.id === selectedId);
      if (m) {
        selectorYRef.current = m.baseY;
        sel.position.y = m.baseY;
        mat.opacity = 0.9;
      }
    } else {
      mat.opacity = 0;
    }
  }, [selectedId, layout]);

  // ——— Drag / wheel / pinch контроль (на canvas) ———
  React.useEffect(() => {
    const canvas = gl.domElement;
    let down: { x: number; y: number } | null = null;
    let dragging = false;
    // активные указатели: при 2+ пальцах идёт пинч-зум — орбиту отключаем,
    // иначе первый палец продолжает вращать сцену и её «колбасит» во время пинча
    const pointers = new Set<number>();

    const onDown = (e: PointerEvent) => {
      pointers.add(e.pointerId);
      down = { x: e.clientX, y: e.clientY };
      dragging = false;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMoveP = (e: PointerEvent) => {
      // во время мультитача (пинч) орбиту не считаем
      if (pointers.size >= 2) {
        down = null;
        dragging = false;
        return;
      }
      if (!down) return;
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true;
      if (dragging) {
        yawRef.current -= dx * 0.006;
        const c = controls.current;
        // панорама по высоте — в пределах реальной высоты видимой башни
        c.targetT = Math.max(0.2, Math.min(c.targetT - dy * 0.012, Math.max(1, totalRef.current)));
        down = { x: e.clientX, y: e.clientY };
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      down = null;
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = controls.current;
      c.distT = Math.max(5, Math.min(40, c.distT + e.deltaY * 0.012));
    };
    let pinch: number | null = null;
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinch) {
          const c = controls.current;
          c.distT = Math.max(5, Math.min(40, c.distT - (d - pinch) * 0.03));
        }
        pinch = d;
      }
    };
    const onTouchEnd = () => {
      pinch = null;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMoveP);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMoveP);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gl]);

  return (
    <>
      <fogExp2 attach="fog" args={[st.fog, st.fogDensity]} />
      <Lights accent={accent} st={st} light={isLight} />
      <Stars tier={tier} lightMode={lightMode} reduceMotion={reduceMotion} color={st.starColor} />

      {/* платформа. Материал линий — с vertexColors: gridHelper красит центр/
          сетку через цвета вершин, обычный override-материал рисовал бы всё
          одним белым и st.grid1/grid2 игнорировались бы */}
      <gridHelper args={[26, 26, st.grid1, st.grid2]} position={[0, -0.6, 0]}>
        <lineBasicMaterial attach="material" vertexColors transparent opacity={st.gridOpacity} />
      </gridHelper>

      {/* акцентный пьедестал под Шпилем */}
      <Pedestal accent={accent} dim={dimAura} isLight={isLight} />

      <group ref={spireRef}>
        {/* кольцо-селектор */}
        <mesh ref={selectorRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.9, 0.025, 8, 80]} />
          <meshBasicMaterial color={accent} transparent opacity={0} />
        </mesh>

        {layout.metas.map((m, index) => (
          <Floor
            key={m.floor.id}
            floor={m.floor}
            baseY={m.baseY}
            phase={m.phase}
            mode={mode}
            focusId={focusId}
            lightMode={lightMode}
            reduceMotion={reduceMotion}
            isLight={isLight}
            locked={locks[index]}
            selected={m.floor.id === selectedId}
            isWeakest={m.floor.id === weakestId}
            onPick={onPick}
          />
        ))}

        {/* акцентный ореол + частицы + лучи (вращаются вместе со Шпилем) */}
        <SpireAura
          accent={accent}
          total={layout.total}
          tier={tier}
          lightMode={lightMode}
          reduceMotion={reduceMotion}
          dim={dimAura}
          isLight={isLight}
        />
      </group>

      <CameraRig
        layout={layout}
        focusId={focusId}
        mode={mode}
        reduceMotion={reduceMotion}
        spireRef={spireRef}
        selectorRef={selectorRef}
        selectorYRef={selectorYRef}
        yawRef={yawRef}
        controls={controls}
      />
    </>
  );
}

export function SpireScene(props: SpireProps) {
  // high-tier телефоны/экраны рендерим резче (до 2x), mid/low — мягче ради FPS
  const dpr: [number, number] = props.lightMode
    ? [1, 1]
    : props.tier === "high"
    ? [1, 2]
    : [1, 1.5];
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: props.tier === "high", alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 46, near: 0.1, far: 200, position: [0, 6, 13.5] }}
      style={{ position: "fixed", inset: 0, zIndex: 0, touchAction: "none", cursor: "grab" }}
    >
      <SpireContent {...props} />
    </Canvas>
  );
}
