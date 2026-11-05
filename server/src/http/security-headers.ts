/**
 * The Content-Security-Policy for every response (architecture.md "Security posture"): only this
 * origin, plus the map tile host. MapLibre fetches the style, vector tiles, sprites and glyphs
 * (`connect-src`), may load raster or sprite images (`img-src`), runs its worker from this
 * origin and applies inline styles. While analytics are enabled (behaviors/analytics.md) the Google
 * tag and collection origins are added to `script-src`, `connect-src` and `img-src`, as Google's
 * GA4 guidance lists them; nothing else changes.
 */
export function contentSecurityPolicy(tileHost: string, analytics = false): string {
  const scripts = analytics ? ' https://*.googletagmanager.com' : '';
  const images = analytics ? ' https://*.google-analytics.com https://*.googletagmanager.com' : '';
  const connections = analytics
    ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com'
    : '';
  return [
    "default-src 'self'",
    `script-src 'self'${scripts}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${tileHost}${images}`,
    "font-src 'self'",
    `connect-src 'self' ${tileHost}${connections}`,
    "worker-src 'self'",
    'child-src blob:',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function securityHeaders(tileHost: string, analytics = false): Record<string, string> {
  return {
    'content-security-policy': contentSecurityPolicy(tileHost, analytics),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  };
}
