import { ensureStaffAccessToken } from "./staff-api";
import { getApiBaseUrl } from "./api";

export type AdminStreamEvent = {
  type: string;
  payload?: Record<string, unknown>;
};

/** Fallback REST poll when SSE is disconnected (ms). */
export const ADMIN_POLL_FALLBACK_MS = 60_000;

export function connectAdminEventStream(onEvent: (event: AdminStreamEvent) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  let alive = true;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async function run() {
    while (alive) {
      try {
        const token = await ensureStaffAccessToken();
        const res = await fetch(`${getApiBaseUrl()}/api/admin/events/stream/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
        });
        if (!res.ok || !res.body) {
          await sleep(5000);
          continue;
        }
        reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (alive) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const parsed = JSON.parse(dataLine.slice(6)) as AdminStreamEvent;
              if (parsed?.type) onEvent(parsed);
            } catch {
              /* ignore malformed */
            }
          }
        }
      } catch {
        await sleep(5000);
      } finally {
        reader = null;
      }
    }
  }

  void run();

  return () => {
    alive = false;
    void reader?.cancel().catch(() => undefined);
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
