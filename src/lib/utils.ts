import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNTD(value: number): string {
  return 'NT$' + Math.round(value).toLocaleString('zh-TW');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('zh-TW');
}
