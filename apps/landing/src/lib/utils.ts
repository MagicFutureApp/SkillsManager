import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 把未知输入安全地转成去空白字符串；非字符串一律返回空串。
 * 常用于解析无类型的请求体字段。
 */
export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** 宽松但实用的邮箱格式校验（前端、服务端校验可共用）。 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
