import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "COEP Viña | Centro de Operaciones de Emergencia Provincial · VeltrixIntegra Ecosistema Digital 360",
  description:
    "COEP Viña (Centro de Operaciones de Emergencia Provincial de Viña del Mar) · VeltrixIntegra Ecosistema Digital 360 · Región de Valparaíso. Plataforma integral de gestión de emergencias que integra SENAPRED, CONAF, SHOA, Bomberos CBV2, Carabineros y Radio. Mapa georreferenciado, fichas FIBER, notificaciones verificadas en tiempo real y panel de cumplimiento legal.",
  keywords: [
    "COEP Viña",
    "Centro de Operaciones de Emergencia Provincial",
    "VeltrixIntegra Ecosistema Digital 360",
    "Viña del Mar",
    "Región de Valparaíso",
    "SENAPRED",
    "CONAF",
    "COGRIG",
    "SHOA",
    "CBV2",
    "Carabineros",
    "emergencias",
    "catástrofes",
    "FIBER",
    "protección civil",
    "gestión de emergencias",
  ],
  authors: [
    {
      name: "COEP Viña · VeltrixIntegra Ecosistema Digital 360",
    },
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png", sizes: "960x960" },
    ],
    apple: [{ url: "/icon-192.png", type: "image/png" }],
  },
  openGraph: {
    title:
      "COEP Viña | Centro de Operaciones de Emergencia Provincial",
    description:
      "Monitoreo y gestión integral de emergencias — Viña del Mar, Región de Valparaíso",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3a78b8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c2f4a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        {/* Service Worker: notificaciones en background aunque la pestaña
            esté inactiva. Se registra del lado del cliente. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              if (typeof window === 'undefined') return;
              if (!('serviceWorker' in navigator)) return;
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch((err) => {
                  console.warn('[SW] registro fallido:', err);
                });
              });
            })();`,
          }}
        />
      </body>
    </html>
  );
}
