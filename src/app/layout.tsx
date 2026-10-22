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
    "Comando de Emergencia Regional | VeltrixIntegra Ecosistema Digital 360",
  description:
    "Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360 · Viña del Mar, Región de Valparaíso. Plataforma integral de gestión de emergencias que integra SENAPRED, CONAF, SHOA, Bomberos CBV2, Carabineros y Radio. Mapa georreferenciado, fichas FIBER, notificaciones en tiempo real y panel de cumplimiento legal.",
  keywords: [
    "Comando de Emergencia Regional",
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
      name: "Comando de Emergencia Regional · VeltrixIntegra Ecosistema Digital 360",
    },
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title:
      "Comando de Emergencia Regional | VeltrixIntegra Ecosistema Digital 360",
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
