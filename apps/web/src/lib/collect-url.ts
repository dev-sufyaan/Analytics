// apps/web/src/lib/collect-url.ts
// The tracker + collect endpoint MUST target the Cloudflare *collect* Worker
// (e.g. https://analytics-collect.<account>.workers.dev), never the dashboard
// Worker. See agent.md §2/§5: the browser posts straight to the Worker, not
// through Next.js. The dashboard's own /t.js + /c are only a legacy fallback.
export function getCollectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_COLLECT_URL;
  if (configured && configured.trim()) return configured.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://yourdomain.com';
}
