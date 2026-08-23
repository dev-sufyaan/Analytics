// Type declarations for the shared JS guards module (implemented in .mjs).
export declare const LIMITS: {
  readonly MAX_BODY_BYTES: number;
  readonly MAX_BATCH: number;
  readonly PATH: number;
  readonly QUERY: number;
  readonly TITLE: number;
  readonly EVENT_NAME: number;
  readonly REFERRER: number;
  readonly REFERRER_PATH: number;
  readonly HOSTNAME: number;
  readonly BROWSER: number;
  readonly OS: number;
  readonly DEVICE: number;
  readonly SCREEN: number;
  readonly LANGUAGE: number;
  readonly COUNTRY: number;
  readonly VISITOR_HASH: number;
  readonly UTM: number;
  readonly CLICK_ID: number;
  readonly EVENT_DATA_BYTES: number;
};

export declare const BOT_PATTERN: RegExp;
export declare function isBot(ua: string | null | undefined): boolean;

export interface ParsedUA {
  browser: string;
  os: string;
  device: string;
}
export declare function parseUA(ua: string | null | undefined): ParsedUA;

export declare function sanitizePath(rawPath: unknown, opts?: { removeTrailingSlash?: boolean }): string;
export declare function getReferrerDomain(referrer: unknown, siteDomain: string | null): string | null;
export declare function generateVisitorHash(websiteId: string, ip: string, ua: string, dateStr: string | Date, rotation?: string): string;
export declare function getSalt(rotation: string, date: string | Date): string;
export declare function getSaltRotation(): string;
export declare function stripPort(ip: string | null | undefined): string | null | undefined;
export declare function getIpAddress(headers: Headers): string | undefined;
export declare function hasBlockedIp(clientIp: string | null | undefined, ignoreList: string | string[] | null | undefined): boolean;
export declare function getIgnoreList(envIgnore?: string | null | undefined): string;
export declare const FORMULA_TRIGGER_RE: RegExp;
export declare function isSafeString(s: unknown): boolean;
export declare function extractUtmParams(queryString: string | null | undefined): Record<string, string | null>;
export declare function getReferrerDetails(referrer: unknown, siteDomain: string | null): { domain: string | null; path: string | null; query: string | null };

export declare const UUID_RE: RegExp;
export declare function requestHost(request: Request, payloadReferrer: string | null): string;

export type PreflightResult =
  | { ok: false; status: number }
  | { ok: true; ua: string; ip: string; country: string | null };
export declare function preflight(request: Request, opts?: { ignoreList?: string | string[] | null; envIgnore?: string | null | undefined }): PreflightResult;

export interface SiteLike {
  domain: string;
  allowed_domains?: string[] | null;
}
export interface CtxLike {
  ua: string;
  ip: string;
  country: string | null;
  host: string;
  saltRotation?: string;
  removeTrailingSlash?: boolean;
}

export interface BuiltCall {
  type: 'heartbeat' | 'event';
  rpc: string;
  payload: Record<string, unknown>;
}
export declare function buildEventParams(raw: unknown, site: SiteLike, ctx: CtxLike): BuiltCall | null;

export declare function extractEvents(payload: unknown): Record<string, any>[];

export declare const CORS_HEADERS: Record<string, string>;
export declare function getCorsHeaders(request: Request): Record<string, string>;
export declare function isLocalhostHost(host: string | null | undefined): boolean;
