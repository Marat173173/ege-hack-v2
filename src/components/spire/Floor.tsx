"use client";

import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Floor as FloorData } from "@/data/types";
import { floorState, RING_COLOR } from "@/lib/floor-state";
import { buildHeightFactor } from "@/lib/floor-build";
import { makeTexture } from "./textures";
import { bodyGeometry, bodyHeight, ringRadius } from "./geometry";

interface FloorProps {
  floor: FloorData;
  baseY: number;
  phase: number;
  mode: "student" | "parent";
  focusId: string | null;
  lightMode: boolean;
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

  const material = React.useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(floor.hue),
      emissive: new THREE.Color(floor.hue),
      emissiveMap: tex,
      map: tex,
      emissiveIntensity: 0.4,
      metalness: 0.35,
      roughness: 0.45,
      transparent: true,
      opacity: 1,
    });
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
  }, [floor.prog, floor.stab, mode, focusId, isLight, locked, material, ringMat, haloMat]);

  function applyStateVisual() {
    // заблокированный этаж рендерим как «призрак-каркас» вне зависимости от
    // реального состояния — он виден на карте, но приглушён, с замком.
    const st = locked ? "ghost" : floorState(floor);
    const m = material;
    m.wireframe = st === "ghost";

    // в светлой теме материал должен быть ПЛОТНЕЕ и менее «свечёным»,
    // иначе translucent emissive-этажи сливаются с белым фоном
    if (isLight) {
      m.opacity = st === "ghost" ? 0.3 : st === "forming" ? 0.85 : 1;
      m.metalness = 0.1;
      m.roughness = 0.7;
      const g = mode === "parent" ? 0.45 : 1;
      // лёгкое свечение, чтобы цвет был насыщеннее, но не выбеливал
      m.emissiveIntensity =
        (st === "ghost" ? 0.0 : st === "forming" ? 0.16 : st === "unstable" ? 0.22 : 0.3) * g;
    } else {
      m.opacity = st === "ghost" ? 0.18 : st === "forming" ? 0.55 : st === "unstable" ? 0.94 : 1;
      m.metalness = 0.35;
      m.roughness = 0.45;
      const g = mode === "parent" ? 0.55 : 1;
      m.emissiveIntensity =
        (st === "ghost" ? 0.0 : st === "forming" ? 0.4 : st === "unstable" ? 0.7 : 0.92) * g;
    }

    ringMat.color.setHex(RING_COLOR[st]);
    ringMat.opacity = st === "ghost" ? (isLight ? 0.55 : 0.4) : 1;

    if (haloMat) {
      haloMat.color.setHex(
        st === "solid"
          ? 0x5be3b0
          : st === "unstable"
          ? 0xff5c6e
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
      ? 0.0
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
        material={material}
        rotation={floor.geom === "torus" ? [Math.PI / 2, 0, 0] : [0, 0, 0]}
        onPointerDown={handleDown}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={(e) => {
          e.stopPropagation();
          onPick(floor.id, e.nativeEvent.clientX, e.nativeEvent.clientY);
        }}
      />

      {/* индикатор блокировки (гейтинг): заблокирован, но кликабелен */}
      {locked && (
        <Html center distanceFactor={8} position={[0, 0, 0]} zIndexRange={[20, 0]}>
          <div
            style={{
              pointerEvents: "none",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(13,20,34,.8)",
              border: "1px solid rgba(255,255,255,.18)",
              color: "#9FB0CF",
              borderRadius: "50%",
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            🔒
          </div>
        </Html>
      )}

      {/* плавающая подпись темы (наведение / выбор) */}
      {showLabel && (
        <Html
          center={false}
          distanceFactor={9}
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
              background: "rgba(13,20,34,.82)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,.14)",
              color: "#EAF0FC",
              borderRadius: 10,
              padding: "5px 10px",
              fontSize: 12,
              lineHeight: 1.3,
              fontFamily: "ui-monospace, monospace",
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
