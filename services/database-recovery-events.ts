// DEPRECATED: kept for backwards compatibility.
// New entrypoint is `database-recovery-service.ts`.
export {
  databaseRecoveryService,
  useDatabaseRecoveryState,
} from './database-recovery-service';

export type {
  DatabaseCorruptionReport,
  DatabaseRecoveryState,
} from './database-recovery-service';
