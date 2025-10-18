# Tony's Figma – CollabCanvas (MVP)

A real-time collaborative design canvas built with React, Konva, and Firebase. Multiple users can add/move/resize/rotate shapes, see each other’s cursors and presence, and stay in sync via Firestore.

## Architecture Choices
- React + Vite + TypeScript: fast DX and typed safety.
- State via React Context:
  - `UserContext` for auth
  - `CanvasObjects` context for shapes (add/update/delete/copy)
- Rendering: `react-konva` (Konva.js) for performant canvas interactions.
- Backend: Firebase
  - Auth: Google OAuth; persistence: browserLocalPersistence
  - Firestore: collections `canvasObjects`, `cursors`, `presence`
  - Presence TTL handled server-side; client filters stale entries after 3 minutes.
- Sync model: full-document writes, debounced (~100ms) during drag/resize; conflict strategy is last-write-wins via `updatedAt: serverTimestamp()`.

### Firestore Schema (MVP)
- `canvasObjects/{id}`: `{ id, type, x, y, width, height, color, rotation, updatedAt }`
- `cursors/{uid}`: `{ x, y, name, color, updatedAt }` (one doc per user)
- `presence/{uid}`: `{ name, color, updatedAt, expiresAt }` (one doc per user)

### Security Rules (summary)
- `canvasObjects`: read/write if authed
- `presence/{uid}`: read if authed; write only if `request.auth.uid == uid`
- `cursors/{uid}`: same as presence

## Conflict Resolution & State Management
- Last-Write-Wins (LWW): full-object writes; Firestore `serverTimestamp()` on `updatedAt` decides order.
- Metadata: each write includes `lastEditedBy` and `lastEditedAt` (server). We do not show a permanent badge.
- Visual feedback (halo strategy): when an object changes and the editor is not you, we render a dashed halo around the object in the editor’s presence color for ~1.5s, then fade. This is local-only UI state; no extra fields are written.
- In-memory ID index: prevents ghost/duplicate objects during merges and reconnects.
- Optimistic/batching: active drags are batched (~40–100ms window), with a brief (≈300ms) remote-echo suppression to avoid flicker after local commits.
- Offline queue: up to 1 minute of operations are queued and replayed on reconnect; new/duplicate objects write immediately to avoid loss on refresh.
- Flush on page hide: pending writes flush on `visibilitychange`, `pagehide`, and `beforeunload`.

## Features
- Authentication
  - Google sign-in; logout redirects to landing
  - Auth guard: `/canvas` redirects to landing if signed out
- Canvas interactions
  - Pan: right-drag or Space+drag
  - Zoom: wheel (clamped)
  - Select: click; Delete/Backspace to remove
  - Resize and Rotate (Transformer handles; rotation persists)
  - Copy: Cmd/Ctrl+C duplicates selected shape with an offset
- Shapes
  - Rectangle, Circle, Triangle; color assigned on create
- Real-time sync (Firestore)
  - Full-document writes with `updatedAt: serverTimestamp()`
  - ~100ms debounce during drags/resizes
  - Listener orders by `updatedAt` for stable reloads
- Multiplayer
  - Cursors: pointer-shaped, per-user color, labeled with display name
  - Presence avatars: initials, per-user color, shown top-left under logout
  - Liveness: hide cursors/presence if no updates for 3 minutes
- Routing
  - Landing page ("Tony's Figma" + Login)
  - `/canvas` page (fullscreen canvas, toolbar top-right, logout top-left)

## Local Setup
1) Install
```bash
cd collab-canvas
npm install
```
2) Env vars (`.env.local`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
3) Run
```bash
npm run dev
```

## Build
```bash
npm run build
```
Output in `dist/`.

## Deploy (Vercel)
- Root Directory: `collab-canvas`
- Build: `npm run build`
- Output: `dist`
- Environment: set all `VITE_FIREBASE_*` variables
- Firebase Auth: add your `*.vercel.app` domain to Authorized domains
- (Optional) SPA rewrite: `vercel.json`
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## Testing (lightweight for MVP)
- Vitest + RTL setup included; canvas E2E/manual preferred due to DOM canvas limitations.

## Performance guardrails (MVP)
- Target ~60 FPS with 3–5 users; soft cap ~300 shapes

## Roadmap (post-MVP ideas)
- Soft-lock shapes while dragging; conditional writes to reduce overwrites
- Rooms/sessions; pagination/virtualization for very large canvases
- Better conflict resolution (field-level merges)
