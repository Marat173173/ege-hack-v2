/**
 * spire-camera-bus — module-level мост DOM-оверлеев → canvas-сцена.
 *
 * SpireRail живёт вне R3F-дерева и не имеет доступа к рефам камеры,
 * а поднимать их через zustand было бы 60fps-шумом в сторе. Вместо этого
 * сцена (SpireContent) регистрирует здесь коллбек панорамы, а рейл дёргает
 * его напрямую и выставляет флаг зажатия — CameraRig читает его в useFrame.
 *
 * Перф-контракт: сам мост поведение не меняет — panFrac пишет только в
 * targetT (лерп камеры уважает reduceMotion/tier на стороне сцены),
 * zooming читается кадровым циклом без подписок/ре-рендеров.
 */
export const spireCameraBus: {
  /** Панорама по доле высоты башни (0 — низ, 1 — верх); null, пока сцены нет. */
  panFrac: ((f: number) => void) | null;
  /** Палец удержан на рейле — камера плавно наезжает, пока true. */
  zooming: boolean;
} = { panFrac: null, zooming: false };
