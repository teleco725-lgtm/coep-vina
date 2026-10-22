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
  title: "CODEM-VDM | Centro de Operaciones de Emergencias - Viña del Mar",
  description:
    "Dashboard integral de gestión de emergencias y catástrofes para Viña del Mar y Región de Valparaíso. Integra SENAPRED, CONAF/COGRIG, SHOA, Guardia Marina, Bomberos CBV2, Carabineros y Radio. Mapa georreferenciado, fichas FIBER, notificaciones en tiempo real y panel de cumplimiento legal.",
  keywords: [
    "Viña del Mar",
    "SENAPRED",
    "CONAF",
    "COGRIG",
    "SHOA",
    "CBV2",
    "Carabineros",
    "emergencias",
    "catástrofes",
    "FIBER",
    "Valparaíso",
    "protección civil",
  ],
  authors: [{ name: "Municipalidad de Viña del Mar - CODEM" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CODEM-VDM | Centro de Operaciones de Emergencias",
    description: "Monitoreo y gestión integral de emergencias - Viña del Mar",
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
