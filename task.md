# 🧩 CollabCanvas – Engineering Task List (MVP PR Roadmap)

Each section corresponds to one **Pull Request (PR)** in your GitHub repository.  
Use this checklist to track progress, and verify correctness with the included **unit/integration tests**.

---

## **Project Structure**

```
collab-canvas/
│
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── Shape.tsx
│   │   │   ├── CursorLayer.tsx
│   │   │   └── PresenceBox.tsx
│   │   └── Auth/
│   │       ├── Login.tsx
│   │       └── LogoutButton.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFirestoreSync.ts
│   │   ├── usePresence.ts
│   │   ├── useCursor.ts
│   │   └── useCanvasObjects.ts
│   ├── context/UserContext.tsx
│   ├── utils/
│   │   ├── firebase.ts
│   │   ├── color.ts
│   │   └── constants.ts
│   ├── styles/
│   │   ├── Canvas.css
│   │   └── PresenceBox.css
│   ├── App.tsx
│   ├── index.tsx
│   └── routes.tsx
│
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── __tests__/
│   ├── auth/
│   ├── canvas/
│   ├── hooks/
│   ├── presence/
│   └── persistence/
│
├── .env.local
├── firebase.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## **PR #1 – Project Initialization and Firebase Setup**
**Goal:** Set up project scaffolding, Firebase connection, and environment.

**Files:** `package.json`, `firebase.json`, `.env.local`, `src/utils/firebase.ts`, `src/App.tsx`, `src/index.tsx`

**Checklist:**
- [x] Create React + TypeScript project.  
- [x] Install dependencies: `firebase`, `konva`.  
- [x] Configure Firebase initialization.  
- [x] Add `.env.local` and connect project.  
- [x] Verify Firebase connectivity.  

**🧪 Testing:** *None (manual verification only)*

---

## **PR #2 – Authentication (Google OAuth)**
**Goal:** Implement Google OAuth sign-in/out with transient sessions.

**Files:** `src/components/Auth/Login.tsx`, `LogoutButton.tsx`, `src/hooks/useAuth.ts`, `src/context/UserContext.tsx`

**Checklist:**
- [x] Configure `GoogleAuthProvider()` and signIn/signOut methods.  
- [x] Build `useAuth()` hook.  
- [x] Provide global `UserContext` (React Context; no Zustand).  
- [x] Add Login/Logout UI.  
- [x] Set Firebase Auth persistence to NONE (resets on browser close).  

**🔄 Integration Tests:**  
- **Test Files:** `__tests__/auth/Login.test.tsx`, `__tests__/hooks/useAuth.test.ts`  
- **Framework:** React Testing Library + Vitest  
- **Verifications:**  
  - [x] Clicking login triggers `signInWithPopup`.  
  - [x] Context updates with user info.  
  - [x] Logout clears context.  

---

## **PR #3 – Canvas Rendering (Pan & Zoom)**
**Goal:** Implement interactive Konva canvas with pan/zoom.

**Files:** `src/components/Canvas/Canvas.tsx`, `src/styles/Canvas.css`, `src/hooks/useCanvasObjects.ts`

**Checklist:**
- [x] Initialize Konva Stage and Layer.  
- [x] Implement pan and zoom (wheel zoom; pan via right-drag and space+drag).  
- [x] Clamp zoom (e.g., 0.25–4) and pan to canvas bounds.  
- [x] Maintain canvas transform state.  
- [x] Optimize for 60 FPS.  

**🧪 Unit Tests:**  
- **Test File:** `__tests__/canvas/CanvasPanZoom.test.tsx`  
- **Verifications:**  
  - [x] Canvas initializes with correct scale/position.  
  - [x] Wheel zoom changes scale.  
  - [x] Drag pan updates position.  

---

## **PR #4 – Shape Creation and Manipulation**
**Goal:** Add, move, resize, and delete shapes (rectangle, circle, triangle). No text in MVP.

**Files:** `src/components/Canvas/Shape.tsx`, `CanvasToolbar.tsx`, `src/hooks/useCanvasObjects.ts`

**Checklist:**
- [x] Toolbar buttons create new shapes (choose from 3 predefined).  
- [x] Shapes draggable/resizable.  
- [x] Delete via `Delete` (Windows) and `Backspace` (macOS).  
- [x] Maintain state via React Context.  

**🧪 Unit + Integration Tests:**  
- **Test Files:** `__tests__/canvas/Shape.test.tsx`, `__tests__/canvas/CanvasToolbar.test.tsx`  
- **Verifications:**  
  - [ ] Clicking toolbar adds a shape.  
  - [ ] Drag updates `x, y`.  
  - [ ] Resize updates dimensions.  
  - [ ] Delete removes shape from state.  

---

## **PR #5 – Real-Time Firestore Synchronization**
**Goal:** Sync canvas state across all users in real time.

**Files:** `src/hooks/useFirestoreSync.ts`, `src/hooks/useCanvasObjects.ts`, `src/utils/firebase.ts`

**Checklist:**
- [ ] Create Firestore `canvasObjects` collection.  
- [ ] Perform full-document writes on local changes (debounce ~100ms during drags).  
- [ ] Merge remote updates.  
- [ ] Implement `updatedAt` conflict resolution using `serverTimestamp()`.  

**🔄 Integration Tests:**  
- **Test File:** `__tests__/hooks/useFirestoreSync.test.ts`  
- **Framework:** Firebase Emulator + Vitest  
- **Verifications:**  
  - [ ] Local edits trigger Firestore writes (batched/debounced).  
  - [ ] Remote updates reflect in UI.  
  - [ ] “Last-write-wins” resolves conflicts correctly.  

---

## **PR #6 – Multiplayer Cursors**
**Goal:** Render live user cursors with labels and colors.

**Files:** `src/hooks/useCursor.ts`, `src/components/Canvas/CursorLayer.tsx`

**Checklist:**
- [ ] Capture and broadcast cursor positions.  
- [ ] Throttle update frequency (~100ms).  
- [ ] Store cursors as one document per user (overwrite, no growth).  
- [ ] Render cursors for all active users; use presence color for cursor.  

**🧪 Unit + Integration Tests:**  
- **Test Files:** `__tests__/hooks/useCursor.test.ts`, `__tests__/canvas/CursorLayer.test.tsx`  
- **Verifications:**  
  - [ ] Mousemove updates cursor position in state.  
  - [ ] Throttle prevents excessive updates.  
  - [ ] Renders all active cursors with labels.  

---

## **PR #7 – Presence Box (Who’s Online)**
**Goal:** Show active collaborators in top-right presence box (Figma-style).

**Files:** `src/components/Canvas/PresenceBox.tsx`, `src/hooks/usePresence.ts`, `src/styles/PresenceBox.css`

**Checklist:**
- [ ] Create `/presence` Firestore collection.  
- [ ] On login, create presence doc with `expiresAt`.  
- [ ] Heartbeat to extend `expiresAt` (serverTimestamp + 5m).  
- [ ] Configure Firestore TTL to remove stale docs after ~5m.  
- [ ] Render avatars or initials.  
- [ ] Hover tooltip shows names.  

**🔄 Integration Tests:**  
- **Test File:** `__tests__/presence/PresenceBox.test.tsx`  
- **Verifications:**  
  - [ ] Joining user adds avatar.  
  - [ ] Stale presence removed after TTL (~5m).  
  - [ ] Fallback initials render if no photoURL.  

---

## **PR #8 – Persistence and Reload Handling**
**Goal:** Persist and restore canvas state after reload.

**Files:** `src/hooks/useCanvasObjects.ts`, `src/utils/firebase.ts`

**Checklist:**
- [ ] Fetch all objects on mount.  
- [ ] Merge with live updates.  
- [ ] Debounce writes (~100ms).  
- [ ] Verify reload restores identical state.  

**🔄 Integration Tests:**  
- **Test File:** `__tests__/persistence/CanvasPersistence.test.ts`  
- **Verifications:**  
  - [ ] Fetch renders saved shapes.  
  - [ ] Live updates merge correctly.  
  - [ ] Reload restores full canvas.  

---

## **PR #9 – Final Deployment and E2E Verification**
**Goal:** Deploy app (Vercel + Firebase) and validate real-time performance.

**Files:** `firebase.json`, `vercel.json`, `src/App.tsx`, `README.md`

**Checklist:**
- [ ] Configure build and hosting.  
- [ ] Deploy to Vercel (default *.vercel.app URL is fine).  
- [ ] Validate multi-user performance (manual).  

**🔄 Integration / E2E Testing:**  
- Use **Playwright** with Chromium only for MVP.  
- Verify 3 users can edit simultaneously with <150ms sync latency.

## **Performance Guardrails (MVP)**
- Target sustained 60 FPS with 3–5 active users.  
- Soft cap of ~300 shapes to maintain target FPS in MVP.

---

# 🧪 **Testing Setup Summary**

Install once (recommended in PR #2):
```
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @firebase/rules-unit-testing
```

## **Vercel Environment Best Practices (MVP)**
- Define environment variables at the Vercel Project level (Production/Preview/Development).  
- Mirror names in `.env.local` for local dev:  
  - `VITE_FIREBASE_API_KEY`  
  - `VITE_FIREBASE_AUTH_DOMAIN`  
  - `VITE_FIREBASE_PROJECT_ID`  
  - `VITE_FIREBASE_STORAGE_BUCKET`  
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`  
  - `VITE_FIREBASE_APP_ID`  
- Do not commit `.env.local`.  
- Use Vercel “Encrypt” for secrets.  
