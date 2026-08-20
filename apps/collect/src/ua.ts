// apps/collect/src/ua.ts
// Tiny User-Agent parser (<1KB, fast)

export interface ParsedUA {
  browser: string;
  os: string;
  device: string;
}

export function parseUA(ua: string | null): ParsedUA {
  if (!ua) {
    return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  }

  // Device
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

  // OS
  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'Chrome OS';

  // Browser
  let browser = 'Other';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  return { browser, os, device };
}

export function isBot(ua: string | null): boolean {
  if (!ua) return true;
  const botPattern = /bot|spider|crawl|slurp|facebookexternalhit|whatsapp|googlebot|bingbot|yandexbot|duckduckbot|baiduspider|twitterbot|headless|phantomjs/i;
  return botPattern.test(ua);
}
