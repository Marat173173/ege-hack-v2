import * as THREE from "three";

/**
 * Процедурные canvas-текстуры — визуальная идентичность каждого урока.
 * Каждый тип задания получает свою фактуру (буквы, точки-тире, x², график…).
 * Порт из ванильного прототипа.
 */
const texCache: Record<string, THREE.CanvasTexture> = {};

type Patterns = Record<string, (x: CanvasRenderingContext2D) => void>;

export function makeTexture(pat: string): THREE.CanvasTexture {
  const key = pat;
  if (texCache[key]) return texCache[key];

  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.clearRect(0, 0, 256, 256);
  x.fillStyle = "rgba(0,0,0,0.18)";
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(255,255,255,0.85)";
  x.fillStyle = "rgba(255,255,255,0.8)";
  x.lineWidth = 2;
  x.font = '700 30px ui-monospace, monospace';
  x.textAlign = "center";
  x.textBaseline = "middle";

  const draw: Patterns = {
    letters(x) {
      const L = ["А", "Б", "В", "Я", "Ж", "Ё", "Щ", "Ъ"];
      x.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) x.fillText(L[(i * 5 + j) % L.length], 26 + j * 52, 26 + i * 52);
    },
    dots(x) {
      x.globalAlpha = 0.7;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) {
          const px = 22 + j * 42,
            py = 22 + i * 42;
          if ((i + j) % 2) {
            x.beginPath();
            x.arc(px, py, 5, 0, 7);
            x.fill();
          } else {
            x.fillRect(px - 9, py - 2, 18, 4);
          }
        }
    },
    grid(x) {
      x.globalAlpha = 0.4;
      for (let i = 0; i <= 8; i++) {
        x.beginPath();
        x.moveTo(i * 32, 0);
        x.lineTo(i * 32, 256);
        x.stroke();
        x.beginPath();
        x.moveTo(0, i * 32);
        x.lineTo(256, i * 32);
        x.stroke();
      }
    },
    wave(x) {
      x.globalAlpha = 0.6;
      x.lineWidth = 3;
      for (let r = 0; r < 5; r++) {
        x.beginPath();
        for (let px = 0; px <= 256; px += 6) x.lineTo(px, 40 + r * 48 + Math.sin(px / 22 + r) * 14);
        x.stroke();
      }
    },
    lines(x) {
      x.globalAlpha = 0.5;
      for (let i = 0; i < 9; i++) {
        const w = 120 + Math.random() * 110;
        x.fillRect(20, 24 + i * 26, w, 5);
      }
    },
    quill(x) {
      x.globalAlpha = 0.7;
      x.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        x.beginPath();
        x.moveTo(30 + i * 30, 230);
        x.quadraticCurveTo(60 + i * 30, 120, 140 + i * 10, 20);
        x.stroke();
      }
      for (let i = 0; i < 14; i++) {
        x.beginPath();
        x.arc(Math.random() * 256, Math.random() * 256, 2, 0, 7);
        x.fill();
      }
    },
    digits(x) {
      x.globalAlpha = 0.55;
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) x.fillText(String((i * 5 + j) % 10), 26 + j * 52, 26 + i * 52);
    },
    xsq(x) {
      x.globalAlpha = 0.55;
      const T = ["x²", "y=", "a", "±", "=", "x", "∙", "b"];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) x.fillText(T[(i * 4 + j) % T.length], 32 + j * 64, 32 + i * 64);
    },
    graph(x) {
      x.globalAlpha = 0.4;
      for (let i = 0; i <= 8; i++) {
        x.beginPath();
        x.moveTo(i * 32, 0);
        x.lineTo(i * 32, 256);
        x.stroke();
        x.beginPath();
        x.moveTo(0, i * 32);
        x.lineTo(256, i * 32);
        x.stroke();
      }
      x.globalAlpha = 0.95;
      x.lineWidth = 4;
      x.beginPath();
      for (let px = 0; px <= 256; px += 4) x.lineTo(px, 200 - Math.pow((px - 128) / 40, 2) * 4);
      x.stroke();
    },
    facets(x) {
      x.globalAlpha = 0.6;
      x.lineWidth = 2;
      for (let i = 0; i < 6; i++)
        for (let j = 0; j < 6; j++) {
          x.beginPath();
          x.moveTo(j * 44, i * 44);
          x.lineTo(j * 44 + 44, i * 44 + 44);
          x.moveTo(j * 44 + 44, i * 44);
          x.lineTo(j * 44, i * 44 + 44);
          x.stroke();
        }
    },
    dice(x) {
      x.globalAlpha = 0.7;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const px = 30 + j * 82,
            py = 30 + i * 82;
          x.strokeRect(px, py, 52, 52);
          const n = ((i * 3 + j) % 6) + 1;
          for (let k = 0; k < n; k++) {
            x.beginPath();
            x.arc(px + 12 + (k % 3) * 16, py + 12 + Math.floor(k / 3) * 16, 3, 0, 7);
            x.fill();
          }
        }
    },
    sigma(x) {
      x.globalAlpha = 0.55;
      const T = ["Σ", "∫", "∞", "∂", "√", "π", "λ", "Δ"];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          x.font = "700 34px serif";
          x.fillText(T[(i * 4 + j) % T.length], 32 + j * 64, 32 + i * 64);
        }
    },
    // ——— фактуры для новых предметов ———
    atoms(x) {
      x.globalAlpha = 0.6;
      x.lineWidth = 2;
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const px = 42 + j * 86,
            py = 42 + i * 86;
          for (let e = 0; e < 3; e++) {
            x.beginPath();
            x.ellipse(px, py, 26, 10, (e * Math.PI) / 3, 0, 7);
            x.stroke();
          }
          x.beginPath();
          x.arc(px, py, 4, 0, 7);
          x.fill();
        }
    },
    binary(x) {
      x.globalAlpha = 0.5;
      x.font = "700 26px ui-monospace, monospace";
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 7; j++)
          x.fillText(Math.random() > 0.5 ? "1" : "0", 18 + j * 36, 22 + i * 36);
    },
    scales(x) {
      x.globalAlpha = 0.6;
      x.lineWidth = 3;
      for (let r = 0; r < 3; r++) {
        const cy = 50 + r * 80;
        x.beginPath();
        x.moveTo(40, cy - 24);
        x.lineTo(40, cy + 24);
        x.moveTo(20, cy - 24);
        x.lineTo(216, cy - 24);
        x.stroke();
        for (const dx of [-1, 1]) {
          x.beginPath();
          x.arc(128 + dx * 80, cy - 4, 18, 0, Math.PI);
          x.stroke();
        }
      }
    },
    cells(x) {
      x.globalAlpha = 0.55;
      x.lineWidth = 2;
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 5; j++) {
          x.beginPath();
          x.ellipse(28 + j * 52, 28 + i * 52, 20, 16, 0, 0, 7);
          x.stroke();
          x.beginPath();
          x.arc(28 + j * 52, 28 + i * 52, 5, 0, 7);
          x.fill();
        }
    },
    timeline(x) {
      x.globalAlpha = 0.6;
      x.lineWidth = 3;
      for (let r = 0; r < 5; r++) {
        const py = 30 + r * 52;
        x.beginPath();
        x.moveTo(10, py);
        x.lineTo(246, py);
        x.stroke();
        for (let k = 0; k < 5; k++) {
          x.beginPath();
          x.arc(30 + k * 50, py, 4, 0, 7);
          x.fill();
        }
      }
    },
    globe(x) {
      x.globalAlpha = 0.5;
      x.lineWidth = 2;
      const cx = 128,
        cy = 128;
      x.beginPath();
      x.arc(cx, cy, 96, 0, 7);
      x.stroke();
      for (let m = -2; m <= 2; m++) {
        x.beginPath();
        x.ellipse(cx, cy, Math.abs(m) * 24 + 6, 96, 0, 0, 7);
        x.stroke();
        x.beginPath();
        x.moveTo(cx - 96, cy + m * 32);
        x.lineTo(cx + 96, cy + m * 32);
        x.stroke();
      }
    },
  };

  (draw[pat] || draw.grid)(x);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  texCache[key] = t;
  return t;
}
