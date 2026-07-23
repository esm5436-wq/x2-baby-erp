---
name: pwa-branding
description: |
  Use when the user wants to:
  - Change the browser tab title / favicon
  - Set up a dynamic PWA manifest that uses the app's brand logo from settings
  - Make the installed PWA app icon match the brand logo
  - Set up apple-touch-icon and other iOS meta tags
  - Serve the brand logo as a standalone image endpoint for PWA/manifest use
  - Update dynamic favicon from a base64 data URL stored in app state

  Use ONLY when the frontend is a Vite/React app (likely with `index.html` in a `frontend/` folder) and the backend is Express (with `app.js`). Do NOT use for simple static sites without an app state.
---

# PWA Branding Setup

## What this skill does

Configures a Vite + React + Express app so that:
1. The browser tab title is customizable (e.g., "X2 ERP")
2. The favicon starts as a default SVG/PNG and **dynamically updates** to the brand logo (base64 data URL) once loaded
3. The PWA manifest is served **dynamically** from the backend, using the brand logo as the app icon
4. The brand logo is served as a standalone image via `/api/brand-logo`
5. iOS homescreen meta tags are added (`apple-mobile-web-app-title`, `apple-touch-icon`)

## Files modified

| # | File | Change |
|---|------|--------|
| 1 | `frontend/index.html` | `<title>`, `<link rel="icon">`, `<link rel="manifest">`, `apple-mobile-web-app-title`, `apple-touch-icon` |
| 2 | `frontend/src/App.tsx` | `useEffect` to update favicon dynamically from `state.brandLogo` |
| 3 | `frontend/public/manifest.json` | Update `"name"` field |
| 4 | `backend/server/app.js` | Add public routes `GET /api/brand-logo` and `GET /api/manifest` |

## Step-by-step instructions

### 1. `frontend/index.html`

Replace the `<title>` and add favicon + manifest + meta tags:

```html
<title>X2 ERP</title>
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="apple-mobile-web-app-title" content="X2 ERP">
<link rel="manifest" href="/api/manifest">
```

- The default favicon (`/icon.svg`) shows before the brand logo loads.
- The manifest points to `/api/manifest` (dynamic, served by backend).
- `apple-mobile-web-app-title` sets the iOS homescreen label.

### 2. `frontend/src/App.tsx` — Dynamic favicon

After the state-fetch `useEffect`, add a `useEffect` that watches `state.brandLogo`:

```tsx
useEffect(() => {
  if (state.brandLogo) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = state.brandLogo;
  }
}, [state.brandLogo]);
```

- `state.brandLogo` is a base64 data URL (e.g., `data:image/webp;base64,...`) — works directly as an icon href.
- The effect runs whenever the brand logo changes (initial load from API or user updates it in Settings).

### 3. `frontend/public/manifest.json` — Update name

Change the `"name"` and `"short_name"` fields to the desired app name:

```json
{
  "name": "X2 ERP",
  "short_name": "X2 ERP",
  ...
}
```

This file serves as a **fallback** — the primary manifest is served dynamically from the backend.

### 4. `backend/server/app.js` — Public routes

Import `allDb` from `./db.js`:

```js
import { initializeSchema, allDb } from './db.js';
```

Add these public routes **before** `authMiddleware` (typically after `authRouter`):

```js
// Public: serve brand logo as image for favicon/PWA
app.get('/api/brand-logo', async (req, res) => {
  try {
    const rows = await allDb("SELECT value FROM settings WHERE key = 'brandLogo'");
    if (!rows.length || !rows[0].value) return res.redirect('/icon.svg');
    const dataUrl = rows[0].value;
    const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) return res.redirect('/icon.svg');
    const imgBuffer = Buffer.from(matches[2], 'base64');
    res.set('Content-Type', matches[1]);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(imgBuffer);
  } catch { res.redirect('/icon.svg'); }
});

// Public: dynamic manifest.json with brand logo
app.get('/api/manifest', async (req, res) => {
  try {
    const rows = await allDb("SELECT value FROM settings WHERE key = 'brandLogo'");
    const hasLogo = rows.length && rows[0].value && rows[0].value.startsWith('data:image');
    res.json({
      name: 'X2 ERP',
      short_name: 'X2 ERP',
      description: 'نظام إدارة المخزون والمبيعات',
      start_url: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#f8fafc',
      theme_color: '#6366f1',
      dir: 'rtl',
      lang: 'ar',
      icons: [
        { src: hasLogo ? '/api/brand-logo' : '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
      ]
    });
  } catch {
    res.json({
      name: 'X2 ERP', short_name: 'X2 ERP', description: '',
      start_url: '/', display: 'standalone', orientation: 'any',
      background_color: '#f8fafc', theme_color: '#6366f1', dir: 'rtl', lang: 'ar',
      icons: [
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
      ]
    });
  }
});
```

> **Note:** These routes must be **public** (before `authMiddleware`) because the browser fetches the manifest and favicon on page load, before any user login.

### 5. Verify it works

After building and deploying:

- Open the site in a browser → tab title should be "X2 ERP"
- The favicon starts as the default SVG
- After login (if applicable), the favicon updates to the brand logo
- The PWA manifest is served from `/api/manifest` with the brand logo as the primary icon
- The brand logo is accessible as an image at `/api/brand-logo`

## Requirements

- **Frontend:** Vite + React with `AppState` containing a `brandLogo` field (base64 data URL)
- **Backend:** Express.js with:
  - SQLite/Turso database with a `settings` table (key-value, key `brandLogo`)
  - `allDb` helper function from `./db.js`
  - Route structure with `authRouter` → public routes → `authMiddleware`
- **Public assets:** `icon.svg`, `icon-192.png`, `icon-512.png` in the `public/` directory

## Dependencies

- `lucide-react` (for icons in meta tags - optional for this skill)
- No additional npm packages needed for the backend (uses built-in `Buffer`)

## Troubleshooting

- **404 on `/api/manifest`**: Make sure the route is added BEFORE `app.use(authMiddleware)` in `app.js`
- **Favicon not updating**: Check that `state.brandLogo` is a valid base64 data URL string, and that the `useEffect` runs (add a `console.log` to debug)
- **Manifest icons not showing**: Verify that `/api/brand-logo` returns an image (test via browser/curl). If it redirects to `/icon.svg`, it means no brand logo is set in the database yet.
- **CORS issues**: The manifest and brand-logo routes inherit the existing CORS setup from `app.js` (`app.use(cors())`), which is usually sufficient.
