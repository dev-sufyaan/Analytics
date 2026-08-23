// apps/collect/src/ua.ts
// Kept as a thin re-export: canonical UA/bot logic lives in the shared guards
// module (apps/web/lib/ingest-guards.mjs) used by BOTH ingest paths.
export { parseUA, isBot } from '../../web/lib/ingest-guards.mjs';
export type { ParsedUA } from './ua-types';
