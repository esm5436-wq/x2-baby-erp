---
name: sleek-design-mobile-apps
description: Use when the user wants to design a mobile app, create screens, build UI, or interact with their Sleek projects. Covers high-level requests ("design an app that does X") and specific ones ("list my projects", "create a new project", "screenshot that screen").
compatibility: Requires SLEEK_API_KEY environment variable. Network access limited to https://sleek.design only.
metadata:
  requires-env: SLEEK_API_KEY
  allowed-hosts: https://sleek.design
---

# Designing with Sleek

[![Design mobile apps in minutes](https://raw.githubusercontent.com/sleekdotdesign/agent-skills/main/assets/hero.png)](https://sleek.design)

## Overview

[sleek.design](https://sleek.design) is an AI-powered mobile app design tool. You interact with it via a REST API at `/api/v1/*` to create projects, describe what you want built in plain language, and get back rendered screens. All communication is standard HTTP with bearer token auth.

**Base URL**: `https://sleek.design`
**Auth**: `Authorization: Bearer $SLEEK_API_KEY` on every `/api/v1/*` request
**Content-Type**: `application/json` (requests and responses)
**CORS**: Enabled on all `/api/v1/*` endpoints

---

## Prerequisites: API Key

Create API keys at **https://sleek.design/dashboard/api-keys**. The full key value is shown only once at creation — store it in the `SLEEK_API_KEY` environment variable.

**Required plan**: Pro or higher (API access is gated)

### Key scopes

| Scope             | What it unlocks              |
| ----------------- | ---------------------------- |
| `projects:read`   | List / get projects          |
| `projects:write`  | Create / delete projects     |
| `components:read` | List components in a project |
| `chats:read`      | Get chat run status          |
| `chats:write`     | Send chat messages           |
| `screenshots`     | Render component screenshots |

Create a key with only the scopes needed for the task.

---

## Security & Privacy

- **Single host**: All requests go exclusively to `https://sleek.design`. No data is sent to third parties.
- **HTTPS only**: All communication uses HTTPS. The API key is transmitted only in the `Authorization` header to Sleek endpoints.
- **Minimal scopes**: Create API keys with only the scopes required for the task. Prefer short-lived or revocable keys.
- **Image URLs**: When using `imageUrls` in chat messages, those URLs are fetched by Sleek's servers. Avoid passing URLs that contain sensitive content.

---

## Quick Reference — All Endpoints

| Method   | Path                                    | Scope             | Description       |
| -------- | --------------------------------------- | ----------------- | ----------------- |
| `GET`    | `/api/v1/projects`                      | `projects:read`   | List projects     |
| `POST`   | `/api/v1/projects`                      | `projects:write`  | Create project    |
| `GET`    | `/api/v1/projects/:id`                  | `projects:read`   | Get project       |
| `DELETE` | `/api/v1/projects/:id`                  | `projects:write`  | Delete project    |
| `GET`    | `/api/v1/projects/:id/components`       | `components:read` | List components   |
| `GET`    | `/api/v1/projects/:id/components/:componentId` | `components:read` | Get component |
| `POST`   | `/api/v1/projects/:id/chat/messages`    | `chats:write`     | Send chat message |
| `GET`    | `/api/v1/projects/:id/chat/runs/:runId` | `chats:read`      | Poll run status   |
| `POST`   | `/api/v1/screenshots`                   | `screenshots`     | Render screenshot |

All IDs are stable string identifiers.

---

## Endpoints

### Projects

#### List projects

```http
GET /api/v1/projects?limit=50&offset=0
Authorization: Bearer $SLEEK_API_KEY
```

Response `200`:

```json
{
  "data": [
    {
      "id": "proj_abc",
      "name": "My App",
      "slug": "my-app",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "..."
    }
  ],
  "pagination": { "total": 12, "limit": 50, "offset": 0 }
}
```

#### Create project

```http
POST /api/v1/projects
Authorization: Bearer $SLEEK_API_KEY
Content-Type: application/json

{ "name": "My New App" }
```

Response `201` — same shape as a single project.

#### Get / Delete project

```http
GET    /api/v1/projects/:projectId
DELETE /api/v1/projects/:projectId   → 204 No Content
```

---

### Components

#### List components

```http
GET /api/v1/projects/:projectId/components?limit=50&offset=0
Authorization: Bearer $SLEEK_API_KEY
```

Both list and get accept an optional `inlineIcons` query param (default `false`). When omitted, icons render as `<iconify-icon>` web components and the HTML pulls in the Iconify script — leave it off by default. Pass `?inlineIcons=true` only when the consumer needs self-contained SVGs in the HTML (for example, importing into tools that don't run scripts).

Response `200`:

```json
{
  "data": [
    {
      "id": "cmp_xyz",
      "name": "Hero Section",
      "activeVersion": 3,
      "versions": [{ "id": "ver_001", "version": 1, "code": "<!DOCTYPE html>...</html>", "createdAt": "..." }],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "total": 5, "limit": 50, "offset": 0 }
}
```

#### Get component

Fetches a single component by ID. Use this when you need the code for a specific screen (e.g., after a chat run returns a `componentId` in its operations).

```http
GET /api/v1/projects/:projectId/components/:componentId
Authorization: Bearer $SLEEK_API_KEY
```

Response `200` — same shape as a single item from the list endpoint:

```json
{
  "data": {
    "id": "cmp_xyz",
    "name": "Hero Section",
    "activeVersion": 3,
    "versions": [{ "id": "ver_001", "version": 1, "code": "<!DOCTYPE html>...</html>", "createdAt": "..." }],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### Chat — Send Message

This is the core action: describe what you want in `message.text` and the AI creates or modifies screens.

```http
POST /api/v1/projects/:projectId/chat/messages?wait=false
Authorization: Bearer $SLEEK_API_KEY
Content-Type: application/json
idempotency-key: <optional, max 255 chars>

{
  "message": { "text": "Add a pricing section with three tiers" },
  "imageUrls": ["https://example.com/ref.png"],
  "target": { "screenId": "scr_abc" }
}
```

| Field                    | Required | Notes                                         |
| ------------------------ | -------- | --------------------------------------------- |
| `message.text`           | Yes      | 1+ chars, trimmed                             |
| `imageUrls`              | No       | HTTPS URLs only; included as visual context   |
| `target.screenId`        | No       | Edit a specific screen using its `screenId` (not `componentId`); omit to let AI decide |
| `?wait=true/false`       | No       | Sync wait mode (default: false)               |
| `idempotency-key` header | No       | Replay-safe re-sends                          |

#### Response — async (default, `wait=false`)

Status `202 Accepted`. `result` and `error` are absent until the run reaches a terminal state.

```json
{
  "data": {
    "runId": "run_111",
    "status": "queued",
    "statusUrl": "/api/v1/projects/proj_abc/chat/runs/run_111"
  }
}
```

#### Response — sync (`wait=true`)

Blocks up to **300 seconds**. Returns `200` when completed, `202` if timed out.

```json
{
  "data": {
    "runId": "run_111",
    "status": "completed",
    "statusUrl": "...",
    "result": {
      "assistantText": "I added a pricing section with...",
      "operations": [
        { "type": "screen_created", "screenId": "scr_xyz", "screenName": "Pricing", "componentId": "cmp_xyz" },
        { "type": "screen_updated", "screenId": "scr_abc", "componentId": "cmp_abc" },
        { "type": "theme_updated" }
      ]
    }
  }
}
```

---

### Chat — Poll Run Status

Use this after async send to check progress.

```http
GET /api/v1/projects/:projectId/chat/runs/:runId
Authorization: Bearer $SLEEK_API_KEY
```

Response — same shape as send message `data` object:

```json
{
  "data": {
    "runId": "run_111",
    "status": "queued",
    "statusUrl": "..."
  }
}
```

When completed successfully, `result` is present:

```json
{
  "data": {
    "runId": "run_111",
    "status": "completed",
    "statusUrl": "...",
    "result": {
      "assistantText": "...",
      "operations": [...]
    }
  }
}
```

When failed, `error` is present:

```json
{
  "data": {
    "runId": "run_111",
    "status": "failed",
    "statusUrl": "...",
    "error": { "code": "execution_failed", "message": "..." }
  }
}
```

**Run status lifecycle**: `queued` → `running` → `completed | failed`

---

### Screenshots

Takes a snapshot of one or more rendered components.

```http
POST /api/v1/screenshots
Authorization: Bearer $SLEEK_API_KEY
Content-Type: application/json

{
  "componentIds": ["cmp_xyz", "cmp_abc"],
  "projectId": "proj_abc",
  "format": "png",
  "scale": 2,
  "gap": 40,
  "padding": 40,
  "background": "transparent"
}
```

| Field | Default | Notes |
|-------|---------|-------|
| `format` | `png` | `png` or `webp` |
| `scale` | `2` | 1–3 (device pixel ratio) |
| `gap` | `40` | Pixels between components |
| `padding` | `40` | Uniform padding on all sides |
| `paddingX` | _(optional)_ | Horizontal padding; overrides `padding` for left/right when provided |
| `paddingY` | _(optional)_ | Vertical padding; overrides `padding` for top/bottom when provided |
| `paddingTop` | _(optional)_ | Top padding; overrides `paddingY` when provided |
| `paddingRight` | _(optional)_ | Right padding; overrides `paddingX` when provided |
| `paddingBottom` | _(optional)_ | Bottom padding; overrides `paddingY` when provided |
| `paddingLeft` | _(optional)_ | Left padding; overrides `paddingX` when provided |
| `background` | `transparent` | Any CSS color (hex, named, `transparent`) |
| `showDots` | `false` | Overlay a subtle dot grid on the background |
| `radius` | `48` | Squircle corner radius per component in pixels (integer ≥ 0); pass `0` for sharp corners |
| `componentVersionOverrides` | _(optional)_ | Map of `componentId` → `versions[i].id` to render at a pinned version |
| `themeVersionOverrides` | _(optional)_ | Map of `themeId` → `versions[i].id` to render with a pinned theme version |

When `showDots` is `true`, a dot pattern is drawn over the background color. The dots automatically adapt to the background.

Always use `"background": "transparent"` unless the user explicitly requests a specific background color.

Response: raw binary `image/png` or `image/webp` with `Content-Disposition: attachment`.

---

## Error Shapes

```json
{ "code": "UNAUTHORIZED", "message": "..." }
```

| HTTP | Code | When |
| ---- | ----------------------- | -------------------------------------- |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired API key |
| 403 | `FORBIDDEN` | Valid key, wrong scope or plan |
| 404 | `NOT_FOUND` | Resource doesn't exist |
| 400 | `BAD_REQUEST` | Validation failure |
| 409 | `CONFLICT` | Another run is active for this project |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |

---

## Designing

### 1. Create a project

Create a project with `POST /api/v1/projects` if one doesn't exist yet.

### 2. Send a chat message

Describe what to build using `POST /api/v1/projects/:id/chat/messages`. Use the user's words directly — Sleek's AI interprets natural language.

Chat messages are async by default — poll for completion with `GET /api/v1/projects/:id/chat/runs/:runId`.

**Polling**: start at 2s interval, back off to 5s after 10s, give up after 5 minutes.

**One run at a time**: only one active run is allowed per project (`409 CONFLICT`).

### 3. Show the results

After every chat run that produces `screen_created` or `screen_updated` operations, **always take screenshots**.

---

## Implementing Designs

When the user wants to implement the designs in code, **always fetch the component HTML code** — do not rely on screenshots alone.

Use `GET /api/v1/projects/:id/components/:componentId` to fetch each screen's code.

### HTML prototypes

The component `code` is a complete HTML document — save it directly to a `.html` file.

### Native frameworks (React Native, SwiftUI, etc.)

Use both the HTML code and the screenshots together:
- **HTML code** is the implementation reference
- **Screenshots** are the visual target

#### Icons

Sleek uses [Iconify](https://iconify.design) icons in the format `prefix:name` (e.g., `solar:heart-bold`).

**Use the exact icons from the HTML code** — do not substitute.

#### Fonts

The HTML includes Google Fonts via `<link>` tags. Use the same fonts and weights.

#### Navigation

Update the project's navigation styling and structure to match the designs.
