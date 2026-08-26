// apps/web/src/app/api/send/route.ts
// Umami-compatible collect endpoint (POST /api/send).
// Forwards directly to the /c route handler for seamless drop-in parity.
import { OPTIONS, GET, POST } from '../../c/route';

export { OPTIONS, GET, POST };
