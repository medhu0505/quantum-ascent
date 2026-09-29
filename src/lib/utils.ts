import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A number as the brochure prints it goes on the page; the link dials the digits. */
export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
