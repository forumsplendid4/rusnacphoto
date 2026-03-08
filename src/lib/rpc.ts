import { supabase } from "@/integrations/supabase/client";

const NETWORK_ERRORS = ["Load failed", "Failed to fetch", "NetworkError", "net::ERR"];

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return NETWORK_ERRORS.some((e) => msg.includes(e));
}

export async function callRpc<T = unknown>(
  fnName: string,
  params: Record<string, unknown>,
  retries = 3,
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await (supabase.rpc as any)(fnName, params);
      if (error) {
        if (isNetworkError(error) && attempt < retries - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        return { data: null, error: new Error(error.message || String(error)) };
      }
      return { data: data as T, error: null };
    } catch (err) {
      if (isNetworkError(err) && attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
  return { data: null, error: new Error("Не удалось выполнить запрос после нескольких попыток") };
}
