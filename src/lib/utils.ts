import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Утилита склейки классов (нужна шаблонам shadcn-стиля). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
