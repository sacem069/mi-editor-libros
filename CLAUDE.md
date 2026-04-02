@AGENTS.md
# Zeika Builder — Contexto del proyecto

## Qué es este proyecto
Plataforma interna para las diseñadoras de Zeika para crear fotolibros personalizados.

## Stack técnico
- Next.js + React + TypeScript
- Canvas: Fabric.js (ya instalado)
- Fotos: Cloudinary
- Base de datos: Supabase
- Auth: NextAuth (Google login)
- PDF: Puppeteer
- Pagos: MercadoPago
- WhatsApp: Twilio
- Deploy: Vercel

## Identidad visual
- Azul: #528ED6
- Negro: #191919
- Crema: #F0EFEB
- Blanco: #FFFFFF
- Tipografía display: Amandine (Adobe Fonts via Typekit: https://use.typekit.net/ddt8web.css)
- Tipografía cuerpo: Overused Grotesk (archivos en /public/fonts/)

## Estructura de carpetas
src/app/
  components/
    Topbar.tsx + Topbar.css (HECHO)
    Canvas/
    PhotoPanel/
    LayoutPanel/
    PageStrip/
    Toolbar/
  config/
    bookSizes.ts (PENDIENTE)
    layouts.ts (PENDIENTE)
  editor/page.tsx (PENDIENTE)
  globals.css (HECHO)
  layout.tsx (HECHO)

## Los 5 tamaños de libro
- Chico Horizontal: 21x14.8cm → 794x559px → $75.500
- Mediano Horizontal: 28x21.6cm → 1058x816px → $81.500
- Grande Horizontal: 41x29cm → 1549x1096px → $100.000
- Vertical: 21.6x28cm → 816x1058px → $81.500
- Cuadrado: 29x29cm → 1096x1096px → $97.000

## Los 20 layouts
4 layouts por cada cantidad de fotos (1 a 5).
Definidos en porcentajes — se adaptan a todos los tamaños.

## Reglas importantes
- SIEMPRE usar variables CSS de globals.css para colores y tipografías
- El canvas usa 'use client' (Fabric.js no funciona en servidor)
- Medidas en CM en la UI, px internamente (1cm = 37.8px)
- Sangrado: 3mm = ~11px
- CSS siempre en archivo separado (.css por componente)
- Precios en pesos argentinos sin decimales

## Próximos pasos
1. Crear src/app/config/bookSizes.ts
2. Crear src/app/config/layouts.ts
3. Crear src/app/components/Canvas/fabricHelpers.ts
4. Crear src/app/components/Canvas/Canvas.tsx
5. Crear src/app/components/PhotoPanel/PhotoPanel.tsx
6. Crear src/app/components/LayoutPanel/LayoutPanel.tsx
7. Crear src/app/components/Toolbar/Toolbar.tsx
8. Crear src/app/components/PageStrip/PageStrip.tsx
9. Armar src/app/editor/page.tsx con todos los componentes