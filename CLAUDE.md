@AGENTS.md
# Zeika Builder — Project Context

## What this project is
Internal platform for Zeika's design team to create personalized photo books.

## Tech stack
- Next.js + React + TypeScript
- Canvas: Fabric.js (already installed)
- Photos: Cloudinary
- Database: Supabase
- Auth: NextAuth (Google login)
- PDF: Puppeteer
- Payments: MercadoPago
- WhatsApp: Twilio
- Deploy: Vercel

## Visual identity
- Blue: #528ED6
- Black: #191919
- Cream: #F0EFEB
- White: #FFFFFF
- Display font: Amandine (Adobe Fonts via Typekit: https://use.typekit.net/ddt8web.css)
- Body font: Overused Grotesk (local files in /public/fonts/)

## Folder structure
src/app/
  components/
    Topbar.tsx + Topbar.css (DONE)
    Canvas/
    PhotoPanel/
    LayoutPanel/
    PageStrip/
    Toolbar/
  config/
    bookSizes.ts (PENDING)
    layouts.ts (PENDING)
  editor/page.tsx (PENDING)
  globals.css (DONE)
  layout.tsx (DONE)

## The 5 book sizes
- Small Horizontal: 21x14.8cm → 794x559px → $75,500
- Medium Horizontal: 28x21.6cm → 1058x816px → $81,500
- Large Horizontal: 41x29cm → 1549x1096px → $100,000
- Vertical: 21.6x28cm → 816x1058px → $81,500
- Square: 29x29cm → 1096x1096px → $97,000

## The 20 layouts
4 layouts per photo quantity (1 to 5).
Defined in percentages — they adapt to all book sizes automatically.

## Important rules
- ALWAYS use CSS variables from globals.css for colors and typography
- Canvas components use 'use client' (Fabric.js does not run on the server)
- Measurements shown in CM in the UI, pixels used internally (1cm = 37.8px)
- Bleed: 3mm = ~11px
- CSS always in a separate file (.css per component)
- Prices in Argentine pesos with no decimals

## Next steps
1. Create src/app/config/bookSizes.ts
2. Create src/app/config/layouts.ts
3. Create src/app/components/Canvas/fabricHelpers.ts
4. Create src/app/components/Canvas/Canvas.tsx
5. Create src/app/components/PhotoPanel/PhotoPanel.tsx
6. Create src/app/components/LayoutPanel/LayoutPanel.tsx
7. Create src/app/components/Toolbar/Toolbar.tsx
8. Create src/app/components/PageStrip/PageStrip.tsx
9. Assemble src/app/editor/page.tsx with all components