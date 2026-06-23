import {
  extractJsonSubstring,
  normalizeEnvValue,
  safeJsonParse,
  stripMarkdownCodeFences,
} from "@/lib/utils";

interface GeminiPart {
  text?: string;
}

interface GeminiContent {
  parts?: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface GeminiErrorResponse {
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiOnce(prompt: string): Promise<string> {
  const apiKey = normalizeEnvValue(process.env.GEMINI_API_KEY);
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const modelIds = [
    "gemini-2.5-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview-latest",
  ];

  let lastError: string | null = null;

  for (const modelId of modelIds) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const bodyText = await res.text();
      const parsed = safeJsonParse<GeminiErrorResponse>(bodyText);
      const message = parsed.ok ? (parsed.value.error?.message ?? bodyText) : bodyText;

      if (res.status === 404) {
        lastError = `Gemini model not found (${modelId}): ${message}`;
        continue;
      }

      if (res.status === 503) {
        throw new Error(`Gemini request failed (503): ${message}`);
      }

      throw new Error(`Gemini request failed (${res.status}): ${message}`);
    }

    const data = (await res.json()) as GeminiResponse;
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n").trim() ?? "";
    if (!text) throw new Error("Gemini returned empty response");
    return text;
  }

  throw new Error(lastError ?? "Gemini request failed");
}

export async function callGeminiWithRetry(prompt: string, maxRetries = 3): Promise<string> {
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    try {
      return await callGeminiOnce(prompt);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown Gemini error");
      lastError = error;
      attempt += 1;

      if (!error.message.includes("(503)") || attempt >= maxRetries) {
        break;
      }

      await delay(attempt * 2000);
    }
  }

  if (lastError?.message.includes("(503)")) {
    throw new Error("Gemini is temporarily unavailable after 3 retries. Please try again.");
  }

  throw lastError ?? new Error("Gemini request failed");
}

export async function callGemini(prompt: string): Promise<string> {
  return callGeminiWithRetry(prompt);
}

export function parseGeminiJson<T>(raw: string): T {
  const stripped = stripMarkdownCodeFences(raw)
    .replace(/```json/gi, "")
    .replace(/json/gi, "")
    .replace(/```/g, "")
    .trim();
  const jsonSlice = extractJsonSubstring(stripped) ?? stripped;
  const parsed = safeJsonParse<T>(jsonSlice);
  if (!parsed.ok) {
    throw new Error(`Gemini JSON parse error: ${parsed.error}`);
  }
  return parsed.value;
}
