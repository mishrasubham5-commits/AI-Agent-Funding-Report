import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripMarkdownCodeFences(input: string) {
  const trimmed = input.trim();
  const fenceMatch = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  return trimmed;
}

export function extractJsonSubstring(input: string) {
  const text = stripMarkdownCodeFences(input);
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return text.slice(firstBrace, lastBrace + 1);
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) return text.slice(firstBracket, lastBracket + 1);
  return null;
}

export function safeJsonParse<T>(input: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to parse JSON" };
  }
}

export function normalizeEnvValue(value: string | undefined) {
  if (!value) return undefined;
  const parts = value.split("=");
  if (parts.length >= 2 && /^your_[a-z0-9_]+$/i.test(parts[0] ?? "")) {
    return parts.slice(1).join("=");
  }
  return value;
}
