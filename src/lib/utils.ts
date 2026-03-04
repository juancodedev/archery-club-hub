import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("CLP", "$").trim();
}

export function parseChileanCurrency(value: string): number {
  if (!value) return 0;
  // Remove dots and replace comma with dot for decimal parsing (though CLP usually has no cents)
  const cleanValue = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}
