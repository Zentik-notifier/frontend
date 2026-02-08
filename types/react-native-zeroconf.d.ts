declare module 'react-native-zeroconf' {
  export const ImplType: { NSD: string; DNSSD: string };

  export interface ZeroconfResolvedService {
    name: string;
    fullName?: string;
    host?: string;
    port: number;
    addresses?: string[];
  }

  export default class Zeroconf {
    scan(type?: string, protocol?: string, domain?: string, implType?: string): void;
    stop(implType?: string): void;
    getServices(): Record<string, ZeroconfResolvedService>;
    addDeviceListeners(): void;
    removeDeviceListeners(): void;
    on(event: 'start' | 'stop' | 'found' | 'resolved' | 'remove' | 'update' | 'error', listener: (...args: unknown[]) => void): this;
    removeListener(event: string, listener: (...args: unknown[]) => void): this;
  }
}
