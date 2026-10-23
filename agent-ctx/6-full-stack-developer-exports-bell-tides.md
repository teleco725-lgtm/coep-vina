# Task 6 · Agent: full-stack-developer (exports + bell + tides + rename)

## Resumen
4 cambios al dashboard CODEM-VDM (ahora Comando de Emergencia Regional):
- **A** Renombrado del centro (layout, page, manifest)
- **B** Campana de notificaciones en el header (popover con últimas 30 alertas)
- **C** Export a Excel/Word/PDF/PPTX (4 rutas API + dropdown en header)
- **D** Tab "Mareas" con gauge horizontal + leyenda legible

## Archivos creados
- `src/app/api/export/_lib.ts` — datos compartidos (Prisma + compliance inline + helpers de etiqueta + builders de resumen/recomendaciones)
- `src/app/api/export/excel/route.ts` — GET, .xlsx con 5 hojas (Alertas, Incidentes, Fichas FIBER, Resumen, Cumplimiento Legal), freeze header, auto-width
- `src/app/api/export/word/route.ts` — POST, .docx con portada + tabla de contenidos + 6 secciones + footer en cada página (usando `docx`)
- `src/app/api/export/pdf/route.ts` — POST, .pdf con portada + 6 secciones + paginación (usando `pdfkit`)
- `src/app/api/export/pptx/route.ts` — POST, .pptx 16:9 con 10 slides (usando `pptxgenjs`, paleta Viña)

## Archivos modificados
- `src/app/layout.tsx` — metadata con el nuevo título y descripción
- `src/app/page.tsx` — header renombrado + NotificationsBell (Popover) + ExportMenu (DropdownMenu) + footer actualizado
- `src/hooks/use-alerts-socket.tsx` — store con `unreadCount` + `markAllRead`, hooks `useRecentNotifications`/`useUnreadCount`/`useMarkAllRead`, eliminado el toast.error/warning para alertas críticas (queda solo Service Worker)
- `src/components/dashboard/charts-panel.tsx` — tercer tab "Mareas" con gauge horizontal + leyenda abajo + últimas 5 lecturas
- `public/manifest.webmanifest` — name/short_name renombrados

## Dependencias instaladas (server-side, no afectan bundle cliente)
- `xlsx@0.18.5` — generación de .xlsx
- `docx@9.13.0` — generación de .docx
- `pdfkit@0.20.2` — generación de .pdf
- `pptxgenjs@4.0.1` — generación de .pptx

## Tono del contenido (Word/PDF/PPTX)
Español chileno humanizado, no técnico. Ejemplos:
- "Hoy hay 3 incendios activos en la comuna, todos contenidos, sin personas evacuadas." (no "3 eventos incendio_forestal con state contenida")
- "SENAPRED coordina a todos los actores de emergencia: Bomberos, Carabineros, Salud, SHOA y CONAF"
- "Esta ley protege los datos personales de las personas (nombre, RUT, dirección, salud, ubicación)"
- Sin frases como "En conclusión" / "Es importante destacar" / "Cabe señalar"

## Verificación end-to-end (todas OK con dev server vivo)
- `GET  /api/export/excel` → 200, 44 KB, `Microsoft Excel 2007+`
- `POST /api/export/word`  → 200, 17.5 KB, `Microsoft Word 2007+`
- `POST /api/export/pdf`   → 200, 13.2 KB, `PDF 7 páginas`
- `POST /api/export/pptx`  → 200, 268 KB, `Zip archive (.pptx)`
- `bun run lint` → 0 errores, 0 warnings
- `GET /` → 200 con "Comando de Emergencia Regional" (4 veces), "VeltrixIntegra · Ecosistema Digital 360" (1 vez), "Exportar" (1), "Notificaciones" (1), "Mareas" (1)

## Notas / Issues
- El sandbox (4 GB cgroup) mata el proceso next-server de forma no determinística durante la compilación en frío de las rutas pesadas (docx/pdfkit/pptxgenjs). Solución: cada ruta compila en ~700 ms una vez que el cache está caliente; los 4 export funcionan en secuencia sin problema. Si el dev server muere, reiniciarlo (`bun run dev`) — las 4 rutas ya están probadas.
- No se modificó: `prisma/schema.prisma`, `src/lib/db.ts`, `mini-services/alerts-service`, rutas API existentes.
- No se reintrodujeron `recharts`, `react-hook-form` ni `zod` en el bundle cliente.
- Las librerías de export viven exclusivamente en `src/app/api/export/*` (server-only). Ningún cliente importa `xlsx`/`docx`/`pdfkit`/`pptxgenjs`.
- La tostada sonner para alertas críticas se eliminó (Task B); el feedback visual queda en el badge de la campana. El Service Worker sigue disparando notificaciones nativas cuando la pestaña está en background.
- La notificación del Service Worker NO se eliminó (sigue para el caso de pestaña inactiva).
