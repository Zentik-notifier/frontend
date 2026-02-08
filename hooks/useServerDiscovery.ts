import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const ZENTIK_SERVICE_TYPE = 'zentik';
const ZENTIK_PROTOCOL = 'tcp';

type ZeroconfInstance = InstanceType<typeof import('react-native-zeroconf').default>;

export interface DiscoveredServer {
  id: string;
  name: string;
  host: string;
  port: number;
  baseUrl: string;
}

function buildBaseUrl(host: string, port: number): string {
  const h = host.replace(/\.$/, '');
  return `http://${h}:${port}`;
}

export function useServerDiscovery() {
  const [scanning, setScanning] = useState(false);
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const zeroconfRef = useRef<ZeroconfInstance | null>(null);

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  useEffect(() => {
    if (!isNative) return;
    try {
      const Zeroconf = require('react-native-zeroconf').default;
      zeroconfRef.current = new Zeroconf();
      const z = zeroconfRef.current;
      const onResolved = (service: {
          name: string;
          host?: string;
          port: number;
          addresses?: string[];
        }) => {
          const host =
            service.host?.replace(/\.$/, "") ||
            (Array.isArray(service.addresses) && service.addresses[0]) ||
            "localhost";
          setServers((prev) => {
          const baseUrl = buildBaseUrl(host, service.port);
          const id = `${host}:${service.port}`;
          const existing = prev.find((s) => s.id === id);
          if (existing) return prev;
          return [
            ...prev,
            {
              id,
              name: service.name || host,
              host,
              port: service.port,
              baseUrl,
            },
          ];
        });
      };
      const onError = (err: Error) => setError(err?.message ?? 'Discovery error');
      z.on('resolved', onResolved);
      z.on('error', onError);
      return () => {
        z.removeListener('resolved', onResolved);
        z.removeListener('error', onError);
        z.stop();
        z.removeDeviceListeners?.();
        zeroconfRef.current = null;
      };
    } catch (e) {
      setError((e as Error)?.message ?? 'Zeroconf not available');
      return undefined;
    }
  }, [isNative]);

  const startScan = useCallback(() => {
    if (!isNative || !zeroconfRef.current) {
      setError('LAN discovery is only available on the native app.');
      return;
    }
    setError(null);
    setServers([]);
    setScanning(true);
    try {
      zeroconfRef.current.scan(ZENTIK_SERVICE_TYPE, ZENTIK_PROTOCOL, 'local.');
    } catch (e) {
      setError((e as Error)?.message ?? 'Scan failed');
      setScanning(false);
    }
  }, [isNative]);

  const stopScan = useCallback(() => {
    if (zeroconfRef.current) {
      try {
        zeroconfRef.current.stop();
      } catch {}
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    const z = zeroconfRef.current;
    if (!z) return;
    const onStart = () => setScanning(true);
    const onStop = () => setScanning(false);
    z.on('start', onStart);
    z.on('stop', onStop);
    return () => {
      z.removeListener('start', onStart);
      z.removeListener('stop', onStop);
    };
  }, [isNative]);

  return {
    isNative,
    scanning,
    servers,
    error,
    startScan,
    stopScan,
  };
}
