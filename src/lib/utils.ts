import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const CURRENCY = "£";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatPrice(val: number) {
	return `${CURRENCY}${(val || 0).toFixed(2)}`;
}
