import * as THREE from "three";
import type { FloorGeom } from "@/data/types";

export const FH = 0.86;
export const GAP = 0.16;

/** Высота тела этажа зависит от геометрии. */
export function bodyHeight(geom: FloorGeom): number {
  if (geom === "core") return FH * 1.7;
  if (geom === "torus" || geom === "facet") return FH * 1.6;
  return FH;
}

/** Геометрия тела этажа (по типу задания). */
export function bodyGeometry(geom: FloorGeom): THREE.BufferGeometry {
  switch (geom) {
    case "disc":
      return new THREE.CylinderGeometry(1.5, 1.5, FH, 40);
    case "hex":
      return new THREE.CylinderGeometry(1.45, 1.45, FH, 6);
    case "slab":
      return new THREE.BoxGeometry(2.7, FH, 1.7);
    case "torus":
      return new THREE.TorusGeometry(1.25, 0.34, 12, 40);
    case "facet":
      return new THREE.IcosahedronGeometry(1.35, 0);
    case "studded":
      return new THREE.CylinderGeometry(1.4, 1.4, FH, 24);
    case "core":
      return new THREE.ConeGeometry(1.5, FH * 1.7, 5);
    default:
      return new THREE.CylinderGeometry(1.4, 1.4, FH, 32);
  }
}

/** Радиус кольца состояния. */
export function ringRadius(geom: FloorGeom): number {
  if (geom === "slab") return 1.95;
  if (geom === "torus" || geom === "facet") return 1.7;
  return 1.62;
}
