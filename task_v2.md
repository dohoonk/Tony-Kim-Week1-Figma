# 🧩 CollabCanvas – Engineering Task List (Phase 2 / AI Collaboration Edition v3)

Each section corresponds to one **Pull Request (PR)** in your GitHub repository.  
This document continues directly from `task.md` (PR #1–#12 completed).  
It follows the same structure, naming conventions, and component organization used in your current codebase.

---

## **PR #13 – Real-Time Synchronization Optimization**

**Goal:**  
Enhance real-time sync responsiveness for both objects and cursors, achieving sub-100 ms object updates and sub-50 ms cursor sync.

**Design Decisions:**  
- Measure latency end-to-end (user → Firestore → user render).  
- Use Firestore local persistence (no separate IndexedDB shadow).  
- Allow `writeBatch` only if additional delay < 30 ms (simple wall-clock heuristic).

**Files:**  
`src/hooks/useFirestoreSync.ts`, `src/hooks/useCursor.ts`, `src/utils/firebase.ts`, `__tests__/performance/SyncLatency.test.ts`

**Checklist:**
- [x] Add latency logging for local → Firestore → listener round trip  
- [x] Implement dynamic debounce (idle = 100 ms, active drag = 25–50 ms)  
- [x] Batch shape updates with `writeBatch` where possible  
- [x] Optimize Firestore listeners with query-scoped snapshots  
- [x] Cursor: local interpolation at ~16 ms; network throttled to ~25–50 ms  
- [x] Verify average latency <100 ms (objects) / <50 ms (cursors)

**Deliverables:**  
- Optimized hooks  
- New performance tests  
- Updated README (performance section)

---

## **PR #14 – Conflict Resolution & State Management**

**Goal:**  
Ensure consistent and reliable shared state under concurrent edits, with no ghost objects or corruption during rapid multi-user changes.

**Design Decisions:**  
- Use **Last-Write-Wins (LWW)** across full object.  
- Store `lastEditedBy` metadata only (no visual fade).  
- Allow transient (<1 frame) divergence during merge.

**Files:**  
`src/hooks/useFirestoreSync.ts`, `src/hooks/useCanvasObjects.ts`, `src/components/Canvas/Shape.tsx`, `src/utils/firebase.ts`, `__tests__/conflict/StateResolution.test.ts`

**Checklist:**
- [ ] Implement LWW conflict resolution  
- [ ] Add metadata fields: `lastEditedBy`, `lastEditedAt` (optional until next write)  
- [ ] Create `mergeObjectState(local, remote)` utility  
- [ ] Prevent ghost/duplicate objects with an in-memory ID index set  
- [ ] Add visual metadata to tooltip/inspector only  
- [ ] Test rapid edits (10+ updates/sec) under load

**Deliverables:**  
- Updated state merge logic  
- Metadata tracking for last edits  
- Integration test coverage

---

## **PR #15 – Text Objects**

**Goal:**
Add text objects to the canvas with render, persistence, and basic manipulation so AI and manual flows can use them.

**Files:** `src/components/Canvas/Shape.tsx`, `src/hooks/useCanvasObjects.tsx`, `src/utils/firebase.ts`

**Checklist:**
- [ ] Implement text object type and rendering  
- [ ] Persist `text`, `fontSize`, `color`, `rotation`  
- [ ] Update selection/transformer to support text  
- [ ] Include text in export (PNG/SVG)

---

## **PR #16 – AI Canvas Agent Integration**

**Goal:**  
Add AI command interface that allows users to manipulate the canvas through natural language.

**Design Decisions:**  
- Route OpenAI calls through a **Firebase Cloud Function** proxy.  
- Use **gpt-4** for function-calling.  
- Log **raw prompt and function call JSON** in Firestore.  
- Display AI responses as **chat bubbles** in floating modal.

**Files:**  
`src/ai/agent.ts`, `src/hooks/useAIAgent.ts`, `src/utils/canvasAPI.ts`, `src/utils/schema.ts`, `src/components/AI/CommandInput.tsx`

**Checklist:**
- [ ] Implement `CommandInput.tsx` floating modal for text commands  
- [ ] Define tool schema in `schema.ts`  
- [ ] Integrate AI → Canvas API execution pipeline  
- [ ] Log raw AI prompts + responses in Firestore  
- [ ] Handle Firebase Cloud Function proxy for OpenAI requests  
- [ ] Enforce max 50 generated shapes per command  
- [ ] Add feedback for invalid/ambiguous commands  

**Tests:**  
`__tests__/ai/AIAgent.test.ts` – Mock OpenAI responses, validate canvas API calls.

---

## **PR #17 – Layout Engine & Complex AI Commands**

**Goal:**  
Support structured layouts and multi-step AI commands (e.g. grids, rows, login forms).

**Design Decisions:**  
- Enforce **strict bounding box** constraints (no overflow).  
- Templates generated **dynamically by AI**, not static JSON.  
- Execute **single function call per layout** (simpler + faster).

**Files:**  
`src/utils/layoutEngine.ts`, `src/ai/agent.ts`, `src/utils/canvasAPI.ts`, `__tests__/layout/LayoutEngine.test.ts`

**Checklist:**
- [ ] Implement layout utilities for grid, row, spacing  
- [ ] Add bounding box enforcement logic  
- [ ] Add helper for relative positioning and padding  
- [ ] Support templates (“login form”, “navbar”, “card layout”)  
- [ ] Validate generated layout fits within canvas bounds  

**Deliverables:**  
- Reusable layout utilities  
- AI test coverage for complex generation

---

## **PR #18 – Persistence & Offline Reconnection**

**Goal:**  
Ensure users always return to the exact same state after refresh or temporary disconnection.

**Design Decisions:**  
- Cap offline queue at **1 minute** of unsynced operations.  
- Use **Firestore local persistence** instead of IndexedDB-only queue.  
- Offline ops **always override remote state** via LWW.

**Files:**  
`src/hooks/usePersistence.ts`, `src/hooks/useFirestoreSync.ts`, `src/utils/firebase.ts`, `src/components/UI/ConnectionStatus.tsx`, `__tests__/persistence/Persistence.test.ts`

**Checklist:**
- [ ] Implement Firestore persistence for reconnect  
- [ ] Auto-reconnect with delta replay logic  
- [ ] Queue edits for 1 minute max during disconnect  
- [ ] Display connection status in UI  
- [ ] Verify state consistency after reconnect  

**Deliverables:**  
- Reliable reconnect pipeline  
- Connection status indicator  
- Tests for all persistence scenarios

---

## **PR #19 – Undo / Redo System**

**Goal:**  
Implement full undo/redo functionality for manual and AI-driven actions.

**Design Decisions:**  
- Track **both AI and manual actions** in history stack.  
- Mirror undo stack in **Firestore** for cross-device sessions.  
- Keep Mac shortcut layout only (Cmd+Z / Cmd+Shift+Z).

**Files:**  
`src/hooks/useHistory.ts`, `src/components/Canvas/Canvas.tsx`, `src/hooks/useCanvasObjects.ts`, `src/utils/history.ts`

**Checklist:**
- [ ] Create `useHistory` hook managing operation stack  
- [ ] Support Cmd+Z / Cmd+Shift+Z keyboard shortcuts  
- [ ] Sync undo/redo stack with Firestore  
- [ ] Include AI-driven changes in history  
- [ ] Prevent history conflicts on reconnect  

**Deliverables:**  
- Undo/redo system  
- Toolbar buttons for history  
- Tests under `__tests__/hooks/useHistory.test.ts`

---

## **PR #20 – Auto-Layout (Manual + AI)**

**Goal:**  
Add flexbox-like automatic spacing and alignment for grouped elements.

**Design Decisions:**  
- Use **constraint-based** layout (similar to Figma AutoLayout).  
- Manual and AI layouts share the same engine.  
- Prioritize **lowest latency** write/update method.

**Files:**  
`src/utils/layoutEngine.ts`, `src/hooks/useCanvasObjects.ts`, `src/components/Canvas/Toolbar.tsx`, `__tests__/layout/AutoLayout.test.ts`

**Checklist:**
- [ ] Implement constraint-based layout logic  
- [ ] Add manual “Auto-Layout” toolbar option  
- [ ] Integrate with AI layout commands  
- [ ] Batch Firestore writes if latency < 30 ms  
- [ ] Test with 500+ shapes for stability  

**Deliverables:**  
- Auto-layout functionality  
- Toolbar integration  
- Unit and visual tests

---

## **PR #21 – Export & Component System**

**Goal:**  
Enable users to export canvas or selected objects, and create reusable component groups.

**Design Decisions:**  
- Export formats: **PNG + SVG only**.  
- Components **auto-sync across canvases**.  
- Store components **per user** in Firestore.

**Files:**  
`src/utils/export.ts`, `src/hooks/useComponents.ts`, `src/components/Canvas/ExportMenu.tsx`, `src/components/Canvas/ComponentPanel.tsx`

**Checklist:**
- [ ] Implement export to PNG/SVG  
- [ ] Add toolbar export option  
- [ ] Create `useComponents` hook for grouping  
- [ ] Auto-sync symbols across canvases  
- [ ] Store component definitions under `/components/{userId}`  

**Deliverables:**  
- Export + Component system  
- Component management UI  
- Unit + integration tests

---

## **PR #22 – Performance & Scalability Pass**

**Goal:**  
Optimize rendering and Firestore usage to maintain 60 FPS with 500+ objects and 5+ users.

**Design Decisions:**  
- Test dataset includes a **mix of shapes and text objects**.  
- FPS/latency overlay is **dev-only**.  
- Use **collectionGroup reads** for optimized Firestore queries.

**Files:**  
`src/hooks/usePerformance.ts`, `src/utils/firebase.ts`, `__tests__/performance/Scale.test.ts`

**Checklist:**
- [ ] Profile frame time and re-render counts  
- [ ] Optimize Firestore reads via `collectionGroup`  
- [ ] Implement frame-based throttling for heavy updates  
- [ ] Lazy-load off-screen objects  
- [ ] Add dev-only FPS overlay  

**Deliverables:**  
- Stable performance under load  
- Developer performance dashboard

---

## **PR #22 – Final QA, Polish, and Documentation**

**Goal:**  
Finalize product readiness: documentation, polish, and production deployment.

**Design Decisions:**  
- Hosting: **Vercel (frontend)** + **Firebase (backend)**.  
- Build target: **Vite static export** (no SSR).  
- E2E tests: Manual acceptance tests by you.

**Files:**  
`README.md`, `docs/PRD_v3.md`, `src/components/UI/*`, `package.json`

**Checklist:**
- [ ] Update README with new architecture diagram  
- [ ] Polish UI (loading, empty states)  
- [ ] Add tooltips and keyboard hints  
- [ ] Run final integration verification  
- [ ] Prepare production deployment (Vercel + Firebase)

**Deliverables:**  
- Final polished product  
- Updated docs and production-ready build

---

# 🧪 **Setup Notes**
- Continue using existing testing stack: Vitest + React Testing Library + Firebase emulator  
- Follow existing folder structure under `src/`  
- Maintain PR numbering continuity and commit conventions  
- All PRs must include a short demo or test case demonstrating functionality

---

# 🧭 **Future Considerations**
- Voice command integration for AI  
- Version history and branching system  
- Multi-room sessions (per project)  
- Serverless cost optimization for Firestore writes
