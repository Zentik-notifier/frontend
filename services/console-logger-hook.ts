import { logger } from './logger';

type ConsoleMethod = (...args: any[]) => void;

let installed = false;

export function installConsoleLoggerBridge(): void {
  if (installed) return;
  installed = true;

  const original = {
    log: console.log.bind(console) as ConsoleMethod,
    info: console.info ? console.info.bind(console) as ConsoleMethod : console.log.bind(console),
    warn: console.warn ? console.warn.bind(console) as ConsoleMethod : console.log.bind(console),
    error: console.error ? console.error.bind(console) as ConsoleMethod : console.log.bind(console),
    debug: console.debug ? console.debug.bind(console) as ConsoleMethod : console.log.bind(console),
  };

  const toMessage = (args: any[]): { msg: string, meta?: any } => {
    try {
      if (!args || args.length === 0) return { msg: '' };
      if (typeof args[0] === 'string') {
        const msg = args[0] as string;
        const rest = args.slice(1);
        const meta = rest && rest.length ? (rest.length === 1 ? rest[0] : rest) : undefined;
        return { msg, meta };
      }
      // First arg is not a string: stringify compact
      return { msg: JSON.stringify(args[0]), meta: args.length > 1 ? args.slice(1) : undefined };
    } catch {
      return { msg: String(args?.[0] ?? '') };
    }
  };

  console.log = (...args: any[]) => {
    try { const { msg, meta } = toMessage(args); logger.info(msg, meta, 'console'); } catch {}
    original.log(...args);
  };
  console.info = (...args: any[]) => {
    try { const { msg, meta } = toMessage(args); logger.info(msg, meta, 'console'); } catch {}
    original.info(...args);
  };
  console.warn = (...args: any[]) => {
    try { const { msg, meta } = toMessage(args); logger.warn(msg, meta, 'console'); } catch {}
    original.warn(...args);
  };
  console.error = (...args: any[]) => {
    try { const { msg, meta } = toMessage(args); logger.error(msg, meta, 'console'); } catch {}
    original.error(...args);
  };
  console.debug = (...args: any[]) => {
    try { const { msg, meta } = toMessage(args); logger.debug(msg, meta, 'console'); } catch {}
    original.debug(...args);
  };
}


