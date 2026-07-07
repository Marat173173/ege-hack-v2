"use client";

import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Floor as FloorData } from "@/data/types";
import type { Tier } from "@/lib/device-tier";
import { floorState, ringColor } from "@/lib/floor-state";
import { buildHeightFactor } from "@/lib/floor-build";
import { makeTexture } from "./textures";
import { makeHologramMaterial } from "./hologram-material";
import { bodyGeometry, bodyHeight, ringRadius } from "./geometry";

interface FloorProps {
  floor: FloorData;
  baseY: number;
  phase: number;
  mode: "student" | "parent";
  focusId: string | null;
  lightMode: boolean;
  tier: Tier;
  reduceMotion: boolean;
  isLight: boolean;
  /** Этаж заблокирован гейтингом — призрак-каркас + замок, но кликабелен. */
  locked: boolean;
  /** Этаж сейчас выбран (показываем подпись постоянно). */
  selected: boolean;
  /** Самый слабый из открытых этажей — мягкий «дыхательный» пульс «начни здесь». */
  isWeakest: boolean;
  onPick: (id: string, clientX: number, clientY: number) => void;
}

export function Floor({
  floor,
  baseY,
  phase,
  mode,
  focusId,
  lightMode,
  tier,
  reduceMotion,
  isLight,
  locked,
  selected,
  isWeakest,
  onPick,
}: FloorProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const bodyRef = React.useRef<THREE.Mesh>(null);
  const haloRef = React.useRef<THREE.Mesh>(null);
  // текущий Y-масштаб тела (для плавного «роста по готовности»)
  const scaleYRef = React.useRef(1);
  // наведение указателя (десктоп) — поднимаем этаж + ярче свечение + подпись
  const hoveredRef = React.useRef(false);
  const [hovered, setHovered] = React.useState(false);

  const tex = React.useMemo(() => makeTexture(floor.pat), [floor.pat]);
  const geom = React.useMemo(() => bodyGeometry(floor.geom), [floor.geom]);
  const bH = bodyHeight(floor.geom);
  const rR = ringRadius(floor.geom);

  // Рост по готовности применяем только к «штабелируемым» геометриям.
  // Тор/гранник/корона (особые темы/босс) — особая топология, скейл по Y
  // на повёрнутом торе выглядит странно: оставляем их в полный рост.
  const canGrow = !["torus", "facet", "core"].includes(floor.geom);

  // ——— Голограмма призрака (замена унылому wireframe) ———
  // Перф-контракт: low-tier и lightMode остаются на старом wireframe-пути
  // (дешёвый MeshStandardMaterial), reduceMotion — статичные скан-полосы
  // (uTime заморожен в useFrame ниже).
  const isGhost = locked || floorState(floor) === "ghost"; // реактивно от floor.prog
  const useHolo = isGhost && tier !== "low" && !lightMode;

  const holoMat = React.useMemo(
    () => (useHolo ? makeHologramMaterial(floor.hue) : null),
    [useHolo, floor.hue]
  );

  const material = React.useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(floor.hue),
      emissive: new THREE.Color(floor.hue),
      emissiveMap: tex,
      map: tex,
      emissiveIntensity: 0.4,
      metalness: 0.35,
      roughness: 0.45,
      transparent: true,
      opacity: 1,
      envMapIntensity: 0.6, // IBL из сцены (RoomEnvironment) — живой металл
    });
    // fresnel-rim: «стеклянный» контур по краю силуэта (~5 ALU, ок даже low).
    // Добавляем в emissive-канал, чтобы обод светился и в тумане.
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uRimColor = { value: new THREE.Color(floor.hue) };
      shader.uniforms.uRimStrength = { value: 0.5 };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;"
        )
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          float rimF = pow(1.0 - saturate(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
          totalEmissiveRadiance += uRimColor * rimF * uRimStrength;`
        );
      m.userData.shader = shader; // для рантайм-обновления силы обода
    };
    return m;
  }, [floor.hue, tex]);

  const ringMat = React.useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x647597,
        transparent: true,
        opacity: 0.5,
      }),
    []
  );

  const haloMat = React.useMemo(
    () =>
      floor.boss
        ? new THREE.MeshBasicMaterial({
            color: new THREE.Color(floor.hue),
            transparent: true,
            opacity: 0.85,
          })
        : null,
    [floor.boss, floor.hue]
  );

  // studs для этажа вероятности
  const studs = React.useMemo(() => {
    if (floor.geom !== "studded") return null;
    const sm = new THREE.MeshStandardMaterial({
      color: new THREE.Color(floor.hue),
      emissive: new THREE.Color(floor.hue),
      emissiveIntensity: 0.5,
      metalness: 0.4,
      roughness: 0.4,
    });
    const cubeGeom = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    return Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      return {
        key: k,
        geom: cubeGeom,
        mat: sm,
        pos: [Math.cos(a) * 1.4, k % 2 ? 0.18 : -0.18, Math.sin(a) * 1.4] as [
          number,
          number,
          number
        ],
      };
    });
  }, [floor.geom, floor.hue]);

  // ——— Освобождение GPU-ресурсов при размонтировании / смене предмета ———
  // Объекты, переданные через props (geometry=/material=), R3F НЕ диспоузит сам —
  // делаем это вручную, иначе при переключении предметов копится утечка.
  React.useEffect(() => () => geom.dispose(), [geom]);
  React.useEffect(() => () => material.dispose(), [material]);
  React.useEffect(() => () => holoMat?.dispose(), [holoMat]);
  React.useEffect(() => () => ringMat.dispose(), [ringMat]);
  React.useEffect(() => () => haloMat?.dispose(), [haloMat]);
  React.useEffect(() => {
    const s = studs;
    return () => {
      if (s) {
        s[0]?.geom.dispose();
        s[0]?.mat.dispose();
      }
    };
  }, [studs]);

  // ——— Применяем визуал состояния (статическая часть) ———
  React.useEffect(() => {
    applyStateVisual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor.prog, floor.stab, mode, focusId, isLight, locked, material, ringMat, haloMat, useHolo, holoMat]);

  function applyStateVisual() {
    // заблокированный этаж рендерим как «призрак-каркас» вне зависимости от
    // реального состояния — он виден на карте, но приглушён, с замком.
    const st = locked ? "ghost" : floorState(floor);
    const m = material;
    // при голограмме тело рисует holoMat — шейдер сам даёт «объём»,
    // каркас не нужен (и стандартный материал в этот момент не виден)
    m.wireframe = st === "ghost" && !useHolo;
    m.color.set(floor.hue);

    // в светлой теме материал должен быть ПЛОТНЕЕ и менее «свечёным»,
    // иначе translucent emissive-этажи сливаются с белым фоном
    if (isLight) {
      // пастельные hue (светлота ~60%) на светлом фоне выцветают — уводим
      // пигмент темнее и насыщеннее; каркас призрака темним сильнее, чтобы
      // линии читались на сине-стальном фоне, а не растворялись в нём
      m.color.offsetHSL(0, 0.06, st === "ghost" ? -0.2 : -0.1);
      m.opacity = st === "ghost" ? 0.5 : st === "forming" ? 0.9 : 1;
      m.metalness = 0.1;
      m.roughness = 0.62;
      const g = mode === "parent" ? 0.45 : 1;
      // лёгкое свечение, чтобы цвет был насыщеннее, но не выбеливал
      m.emissiveIntensity =
        (st === "ghost" ? 0.0 : st === "forming" ? 0.16 : st === "unstable" ? 0.22 : 0.3) * g;
    } else {
      // призраки 0.18 почти исчезали — демо-башня из одних «не начатых» тем
      // выглядела пустой (кольца без тел); 0.28 держит каркас различимым
      m.opacity = st === "ghost" ? 0.28 : st === "forming" ? 0.55 : st === "unstable" ? 0.94 : 1;
      m.metalness = 0.35;
      m.roughness = 0.45;
      const g = mode === "parent" ? 0.55 : 1;
      // призраку — слабое «голограммное» свечение: без эмиссии каркас на
      // почти чёрном фоне пропадал даже с поднятой непрозрачностью
      m.emissiveIntensity =
        (st === "ghost" ? 0.16 : st === "forming" ? 0.4 : st === "unstable" ? 0.7 : 0.92) * g;
    }

    // IBL-отклик и сила fresnel-обода — по теме/состоянию
    m.envMapIntensity = isLight ? 0.3 : st === "ghost" ? 0.25 : 0.65;
    const sh = m.userData.shader as
      | { uniforms?: { uRimStrength?: { value: number } } }
      | undefined;
    if (sh?.uniforms?.uRimStrength) {
      sh.uniforms.uRimStrength.value = isLight ? 0.2 : st === "ghost" ? 0.32 : 0.55;
    }

    // голограмма: тема — через uniform (пигмент темнее/альфа плотнее на светлом)
    if (holoMat) holoMat.uniforms.uLight.value = isLight ? 1 : 0;

    ringMat.color.setHex(ringColor(st, isLight));
    ringMat.opacity = st === "ghost" ? (isLight ? 0.75 : 0.4) : 1;

    if (haloMat) {
      haloMat.color.setHex(
        st === "solid" || st === "unstable"
          ? ringColor(st, isLight)
          : Number("0x" + floor.hue.slice(1))
      );
      haloMat.opacity = st === "ghost" ? 0.3 : 0.85;
    }

    // фокус: остальные этажи притухают
    if (focusId) {
      if (floor.id === focusId) {
        m.emissiveIntensity *= 1.22;
      } else {
        const dim = 0.2;
        m.opacity *= dim;
        m.emissiveIntensity *= dim;
        ringMat.opacity *= dim;
        if (haloMat) haloMat.opacity *= dim;
      }
    }
  }

  /**
   * Базовая эмиссия покоя (то же, что выставляет applyStateVisual, но как
   * чистое число). Нужна в useFrame, чтобы множители наведения/пульса
   * применялись поверх СТАБИЛЬНОЙ базы и не накапливались кадр за кадром.
   */
  function baseEmissive(): number {
    const st = locked ? "ghost" : floorState(floor);
    let e = isLight
      ? st === "ghost"
        ? 0.0
        : st === "forming"
        ? 0.16
        : st === "unstable"
        ? 0.22
        : 0.3
      : st === "ghost"
      ? 0.16
      : st === "forming"
      ? 0.4
      : st === "unstable"
      ? 0.7
      : 0.92;
    e *= mode === "parent" ? (isLight ? 0.45 : 0.55) : 1;
    if (focusId) e *= floor.id === focusId ? 1.22 : 0.2;
    return e;
  }

  // ——— Дрожь + пульс + рост по готовности ———
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    // заблокированный — всегда «призрак» (без дрожи), как в applyStateVisual
    const st = locked ? "ghost" : floorState(floor);
    const snap = reduceMotion || lightMode;

    // —— голограмма: время скан-линий + фокус-дим ——
    if (holoMat) {
      // reduce-motion: полосы статичны (uTime заморожен в 0)
      holoMat.uniforms.uTime.value = reduceMotion ? 0 : t;
      // фокус: остальные этажи притухают (тот же dim, что в applyStateVisual)
      holoMat.uniforms.uOpacity.value = focusId && floor.id !== focusId ? 0.2 : 1;
    }

    // —— рост тела этажа по освоению (анкер у основания) ——
    const body = bodyRef.current;
    if (body) {
      const target = canGrow ? buildHeightFactor(floor.prog) : 1;
      const cur = snap ? target : scaleYRef.current + (target - scaleYRef.current) * 0.08;
      scaleYRef.current = cur;
      body.scale.y = cur;
      // сдвигаем тело вниз так, чтобы нижняя грань осталась на месте слота
      body.position.y = -((1 - cur) * bH) / 2;
    }

    let amp = 0;
    if (!reduceMotion && !lightMode) {
      if (st === "forming") amp = 0.085 * (1 - floor.stab / 100) + 0.02;
      else if (st === "unstable") amp = 0.075 * (1 - floor.stab / 100);
    }

    let fdim = 1;
    if (focusId) fdim = floor.id === focusId ? 1.3 : 0.2;

    if (amp > 0) {
      const p = phase;
      g.position.x = Math.sin(t * 13 + p) * amp + Math.sin(t * 7.3 + p) * amp * 0.5;
      g.position.z = Math.cos(t * 11 + p) * amp;
      g.rotation.z = Math.sin(t * 9 + p) * amp * 0.09;
      // в светлой теме свечение дрожащих этажей тише
      const base = isLight ? (st === "unstable" ? 0.24 : 0.16) : st === "unstable" ? 0.72 : 0.45;
      material.emissiveIntensity =
        (base * (mode === "parent" ? 0.55 : 1) + Math.sin(t * 16 + p) * (isLight ? 0.04 : 0.1)) *
        fdim;
    } else {
      g.position.x *= 0.85;
      g.position.z *= 0.85;
      g.rotation.z *= 0.85;
    }

    // —— дыхательный пульс «самого слабого открытого» этажа («начни здесь») ——
    // мягко и только когда не дрожит / не в фокус-режиме / есть движение
    const pulsing = isWeakest && !reduceMotion && !focusId && amp === 0;
    const pulse = pulsing ? 1 + Math.sin(t * 2) * 0.02 : 1;

    // —— аффорданс наведения: чуть приподнять + ярче свечение ——
    // лифт держим прямо на group.position.y (его не трогают дрожь/состояние),
    // лерпим относительно baseY к целевому смещению.
    const liftT = hoveredRef.current ? 0.12 : 0;
    const curLift = g.position.y - baseY;
    g.position.y = baseY + curLift + (liftT - curLift) * 0.15;

    // композиция масштаба группы (пульс не трогает рост тела — он на body)
    g.scale.setScalar(pulse);

    // эмиссивный бамп: наведение и/или шиммер слабейшего.
    // ВАЖНО: когда этаж не дрожит (amp===0), applyStateVisual не вызывается
    // каждый кадр — поэтому в режиме покоя цикл сам авторитетно держит эмиссию
    // от СТАБИЛЬНОЙ базы baseEmissive() с множителем. Иначе свет либо
    // накапливался бы кадр за кадром, либо «залипал» бы ярким после снятия hover.
    if (amp === 0) {
      let mult = 1;
      if (hoveredRef.current) mult *= 1.25;
      if (pulsing) mult = Math.max(mult, 1.18 + Math.sin(t * 2) * 0.12);
      material.emissiveIntensity = baseEmissive() * mult;
    } else if (hoveredRef.current) {
      // в режиме дрожи база пересчитывается выше каждый кадр — домножаем на месте
      material.emissiveIntensity *= 1.25;
    }

    // вращение короны босса
    if (haloRef.current && !reduceMotion) haloRef.current.rotation.z += 0.01;
  });

  function handleDown(e: { stopPropagation: () => void }) {
    e.stopPropagation();
  }

  function handleOver(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    hoveredRef.current = true;
    setHovered(true);
    if (typeof document !== "undefined") document.body.style.cursor = "pointer";
  }

  function handleOut() {
    hoveredRef.current = false;
    setHovered(false);
    // на canvas курсор по умолчанию "grab" — возвращаем его
    if (typeof document !== "undefined") document.body.style.cursor = "grab";
  }

  // на тач-экране hover нет — даём подпись «слабому/начни-здесь» этажу всегда,
  // чтобы у мобильного юзера был хотя бы один читаемый ориентир без тапа
  const showLabel = hovered || selected || isWeakest;

  return (
    <group ref={groupRef} position={[0, baseY, 0]}>
      <mesh
        ref={bodyRef}
        geometry={geom}
        material={useHolo && holoMat ? holoMat : material}
        rotation={floor.geom === "torus" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
      />

      {/* невидимая тап-мишень: полный цилиндр вместо тонких/дырявых форм
          (тор = промах в «дырку», каркас призрака = промах между рёбрами).
          Гард e.delta>8 отсекает жест орбиты, завершившийся на этаже. */}
      <mesh
        visible={false}
        onPointerDown={handleDown}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 8) return; // это был drag, не тап
          onPick(floor.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }}
      >
        <cylinderGeometry args={[Math.max(1.9, rR + 0.15), Math.max(1.9, rR + 0.15), bH + 0.3, 8]} />
      </mesh>

      {/* индикатор блокировки (гейтинг): заблокирован, но кликабелен */}
      {locked && (
        <Html center position={[0, 0, 0]} zIndexRange={[20, 0]}>
          <div
            style={{
              pointerEvents: "none",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgb(var(--bg-1) / 0.92)",
              border: "1px solid rgb(var(--line) / 0.5)",
              color: "rgb(var(--mid))",
              borderRadius: "50%",
              fontSize: 12,
              lineHeight: 1,
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 14px -6px rgba(0,0,0,0.55)",
            }}
          >
            🔒
          </div>
        </Html>
      )}

      {/* плавающая подпись темы (наведение / выбор).
          Без distanceFactor: подпись держит ПОСТОЯННЫЙ px-размер — на
          обзорной дистанции раньше сжималась до нечитаемых 3-5px */}
      {showLabel && (
        <Html
          center={false}
          position={[1.9, 0.1, 0]}
          zIndexRange={[20, 0]}
          style={{ transition: "opacity .2s", opacity: 1 }}
        >
          <div
            style={{
              pointerEvents: "none",
              // было nowrap без ограничения → длинные русские названия уезжали за
              // край экрана. Ограничиваем ширину и разрешаем перенос.
              whiteSpace: "normal",
              maxWidth: "min(60vw, 280px)",
              width: "max-content",
              background: "rgb(var(--bg-1) / 0.92)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgb(var(--line) / 0.45)",
              borderLeft: `3px solid ${floor.hue}`,
              color: "rgb(var(--hi))",
              borderRadius: 10,
              padding: "5px 10px 5px 9px",
              fontSize: 12,
              lineHeight: 1.3,
              fontFamily: "ui-monospace, monospace",
              boxShadow: "0 6px 20px -8px rgba(0,0,0,0.55)",
            }}
          >
            {floor.name}
            {locked ? "  · укрепи нижние этажи" : ""}
          </div>
        </Html>
      )}

      {/* studs */}
      {studs?.map((s) => (
        <mesh key={s.key} geometry={s.geom} material={s.mat} position={s.pos} />
      ))}

      {/* корона босса */}
      {floor.boss && haloMat && (
        <mesh
          ref={haloRef}
          material={haloMat}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, bH * 0.18, 0]}
        >
          <torusGeometry args={[1.85, 0.04, 10, 80]} />
        </mesh>
      )}

      {/* кольцо состояния */}
      <mesh material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rR, 0.022, 8, 72]} />
      </mesh>
    </group>
  );
}
