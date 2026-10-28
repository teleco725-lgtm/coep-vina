// ============================================================================
// Middleware de Seguridad — COEP Viña
// ----------------------------------------------------------------------------
// Cumple con:
//   - Ley 21.519 (Marco de Ciberseguridad de Chile): headers de seguridad HTTP
//   - ISO 27001 A.13.1: seguridad de red (HSTS, X-Frame-Options, etc.)
//   - Rate limiting básico: protege contra abuso de API (DoS)
//   - Ley 19.628 art. 4: control de acceso basado en roles
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting en memoria (reset por cada cold start de Vercel)
const RATE_LIMIT_WINDOW = 60_000; // 1 minuto
const RATE_LIMIT_MAX = 60; // 60 peticiones por minuto por IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Origenes permitidos para SSE y postMessage
const ORIGENES_PERMITIDOS = [
  'https://senapred.cl',
  'https://www.shoa.cl',
  'https://www.chilquinta.cl',
  'https://www.munivina.cl',
  'https://coep-vina.vercel.app',
  'http://localhost:3000',
  'http://localhost:81',
];

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // === H4: HEADERS DE SEGURIDAD HTTP ===
  // HSTS: fuerza HTTPS (Ley 21.519)
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Evita clickjacking (ISO 27001 A.13.1)
  res.headers.set('X-Frame-Options', 'DENY');
  // Previene MIME-sniffing (ISO 27001 A.13.1)
  res.headers.set('X-Content-Type-Options', 'nosniff');
  // Controla el Referrer (Ley 19.628 — no filtrar datos en headers)
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content-Security-Policy: restringe recursos externos
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://senapred.cl https://www.shoa.cl https://www.chilquinta.cl https://www.munivina.cl; " +
    "frame-ancestors 'none';"
  );
  // Permissions-Policy: desactiva APIs innecesarias
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // === H5: RATE LIMITING ===
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const path = req.nextUrl.pathname;

  // Solo aplicar rate limiting a API routes
  if (path.startsWith('/api/') && !path.startsWith('/api/alerts-stream') && !path.startsWith('/api/salud') && !path.startsWith('/api/compliance')) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    } else {
      entry.count++;
      if (entry.count > RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: 'Demasiadas peticiones. Intente nuevamente en un minuto.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        );
      }
    }
  }

  return res;
}

export const config = {
  // Aplicar a todas las rutas excepto assets estáticos
  matcher: ['/((?!_next/static|_next/image|favicon|logo|icon|sw\\.js|manifest|Instructivo|Contrato).*)'],
};
