import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import iosBridgeService from "@/services/ios-bridge";

const DEFAULT_INTERVAL_MS = 60_000;
const TOP_QUERIES_BY_SIZE = 8;

function getQueryDataSize(data: unknown): number {
  try {
    return JSON.stringify(data).length;
  } catch {
    return 0;
  }
}

export function useMemoryLogging(intervalMs: number = DEFAULT_INTERVAL_MS) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!__DEV__) return;

    const logMemory = async () => {
      const parts: string[] = [];

      if (Platform.OS === "ios") {
        const native = await iosBridgeService.getProcessMemoryUsage();
        if (native) {
          parts.push(`resident: ${native.residentMB} MB`, `virtual: ${native.virtualMB} MB`);
        }
      }

      try {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll();
        parts.push(`cachedQueries: ${queries.length}`);

        const withSize = queries
          .map((q) => {
            const key = q.queryKey;
            const keyStr = (() => {
              try {
                const s = JSON.stringify(key);
                return s.length > 64 ? s.slice(0, 61) + "…" : s;
              } catch {
                return Array.isArray(key) ? key.join(",") : String(key);
              }
            })();
            const size = getQueryDataSize(q.state.data);
            return { keyStr, size };
          })
          .filter((x) => x.size > 0)
          .sort((a, b) => b.size - a.size)
          .slice(0, TOP_QUERIES_BY_SIZE);

        if (withSize.length > 0) {
          const totalKB = (withSize.reduce((s, x) => s + x.size, 0) / 1024).toFixed(1);
          parts.push(`cacheTotal: ${totalKB} KB`);
          const top = withSize
            .map((x) => `${x.keyStr}: ${(x.size / 1024).toFixed(1)} KB`)
            .join("; ");
          console.log(`[Memory] ${parts.join(" | ")}`);
          console.log(`[Memory] top by size: ${top}`);
          return;
        }
      } catch {
        // ignore
      }

      if (parts.length > 0) {
        console.log(`[Memory] ${parts.join(" | ")}`);
      }
    };

    logMemory();
    intervalRef.current = setInterval(logMemory, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [queryClient, intervalMs]);
}
