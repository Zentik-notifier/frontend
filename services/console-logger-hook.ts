import { IS_FS_SUPPORTED } from '@/utils';
import { logger } from './logger';

type ConsoleMethod = (...args: any[]) => void;

let installed = false;

/**
 * Controlla se il messaggio dovrebbe essere filtrato (ignorato)
 */
const shouldFilterMessage = (msg: string): boolean => {
  // Filtra i warning di Apollo Client 4.0 deprecation
  if (msg.includes('is deprecated and will be removed in Apollo Client 4.0')) {
    return true;
  }

  // Aggiungi altri filtri qui se necessario
  return false;
};

export function installConsoleLoggerBridge(): void {
  if (installed) return;
  installed = true;

  if (!IS_FS_SUPPORTED) {
    return;
  }

  const original = {
    log: console.log.bind(console) as ConsoleMethod,
    info: console.info ? console.info.bind(console) as ConsoleMethod : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) as ConsoleMethod : console.log.bind(console),
    error: console.error ? console.error.bind(console) as ConsoleMethod : console.log.bind(console),
    debug: console.debug ? console.debug.bind(console) as ConsoleMethod : console.log.bind(console),
  };

  const toMessage = (args: any[]): { msg: string, meta?: any, shouldFilter?: boolean } => {
    try {
      if (!args || args.length === 0) return { msg: '' };
      if (typeof args[0] === 'string') {
        const msg = args[0] as string;
        const rest = args.slice(1);
        const meta = rest && rest.length ? (rest.length === 1 ? rest[0] : rest) : undefined;
        return { msg, meta, shouldFilter: shouldFilterMessage(msg) };
      }
      // First arg is not a string: stringify compact
      const msg = JSON.stringify(args[0]);
      const meta = args.length > 1 ? args.slice(1) : undefined;
      return { msg, meta, shouldFilter: shouldFilterMessage(msg) };
    } catch {
      const msg = String(args?.[0] ?? '');
      return { msg, shouldFilter: shouldFilterMessage(msg) };
    }
  };

  console.log = (...args: any[]) => {
    try {
      const { msg, meta, shouldFilter } = toMessage(args);
      if (!shouldFilter) {
        logger.info(msg, meta, 'console');
        original.log(...args);
      }
    } catch {
      original.log(...args);
    }
  };
  console.info = (...args: any[]) => {
    try {
      const { msg, meta, shouldFilter } = toMessage(args);
      if (!shouldFilter) {
        logger.info(msg, meta, 'console');
        original.info(...args);
      }
    } catch {
      original.info(...args);
    }
  };
  console.warn = (...args: any[]) => {
    try {
      const { msg, meta, shouldFilter } = toMessage(args);
      if (!shouldFilter) {
        logger.warn(msg, meta, 'console');
        original.warn(...args);
      }
    } catch {
      original.warn(...args);
    }
  };
  console.error = (...args: any[]) => {
    try {
      const { msg, meta, shouldFilter } = toMessage(args);
      if (!shouldFilter) {
        logger.error(msg, meta, 'console');
        original.error(...args);
      }
    } catch {
      original.error(...args);
    }
  };
  console.debug = (...args: any[]) => {
    try {
      const { msg, meta, shouldFilter } = toMessage(args);
      if (!shouldFilter) {
        logger.debug(msg, meta, 'console');
        original.debug(...args);
      }
    } catch {
      original.debug(...args);
    }
  };
}


