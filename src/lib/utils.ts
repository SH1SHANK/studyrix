import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes: unknown[]) {
  return twMerge(clsx(classes));
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || "https://studyrix.app"}${path}`;
}
