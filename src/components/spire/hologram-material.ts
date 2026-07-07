import * as THREE from "three";

/**
 * Голограмма для ghost-этажей Шпиля: скан-линии + fresnel-обод —
 * «проекция будущего этажа» вместо унылого wireframe.
 *
 * Перф-контракт (оси tier/lightMode/reduceMotion):
 *   tier=low   — НЕ используется (Floor.tsx оставляет старый wireframe-путь);
 *   lightMode  — НЕ используется (там же);
 *   reduceMotion — материал используется, но uTime замораживается в 0
 *                  (статичные скан-полосы, без анимации) — см. useFrame Floor.tsx.
 *
 * Uniforms:
 *   uColor   — базовый hue этажа;
 *   uTime    — секунды (двигает скан-линии);
 *   uOpacity — внешний множитель альфы (фокус-дим этажей);
 *   uLight   — 0|1: светлая тема — пигмент темнее, альфа плотнее
 *              (аналог offsetHSL-затемнения стандартного материала в Floor.tsx).
 */
export function makeHologramMaterial(hue: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(hue) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uLight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vWorldY;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = -mvPosition.xyz;
        vWorldY = (modelMatrix * vec4(position, 1.0)).y;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uOpacity;
      uniform float uLight;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying float vWorldY;
      void main() {
        // бегущие скан-ЛИНИИ по мировой высоте: тонкие (~12% периода,
        // частота 10/юнит), с мягкими краями — не мерцают на мобиле
        float f = fract(vWorldY * 10.0 - uTime * 0.6);
        float scan = smoothstep(0.82, 0.88, f) * (1.0 - smoothstep(0.94, 1.0, f));
        // fresnel: край силуэта светится, «объём» без освещения
        float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 2.2);
        // тонкие линии покрывают меньше площади — чуть плотнее тело/линия,
        // чтобы призрак не «истаял»
        float alpha = mix(0.12, 0.34, scan) + fres * 0.35;
        vec3 col = uColor * (0.75 + 0.5 * fres) + uColor * scan * 0.15;
        // светлая тема: пигмент темнее (как offsetHSL у стандартного
        // материала), альфа плотнее — иначе растворяется на белом фоне
        col *= mix(1.0, 0.7, uLight);
        alpha *= mix(1.0, 1.25, uLight);
        gl_FragColor = vec4(col, alpha * uOpacity);
        // как у встроенных материалов: tone mapping + вывод в sRGB —
        // иначе оттенок голограммы расходится между путями с композером
        // (high+dark) и без него (mid-tier / светлая тема)
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
