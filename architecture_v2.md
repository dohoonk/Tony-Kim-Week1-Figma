# 🧩 CollabCanvas – System Architecture (v3)

This document describes the updated system architecture for **CollabCanvas AI Edition (Phase 2)**, aligned with PRD v3.1 and task_v2.md.

---

```mermaid
flowchart TD

%% ===== CLIENT LAYER =====
A[Client: React + TypeScript] --> B[Canvas State Manager]
B --> C[AI Agent]
B --> D[Layout Engine]
B --> E[History Manager]
B --> F[Component System]
B --> G[Export Engine]

%% ===== LOCAL PERSISTENCE =====
B <--> I[(Firestore: Local Persistence)]

%% ===== FIRESTORE & SYNC =====
I <--> J[(Firestore: Realtime Database)]
J -.->|Listeners| K[Other Clients]
J -->|Sync Loop| B

%% ===== AI PROXY LAYER =====
C --> L["Firebase Cloud Function - AI Proxy"]
L --> M["OpenAI GPT-4 Turbo"]
M -->|Function Calls / JSON Responses| C

%% ===== DATA FLOWS =====
A -->|User Commands / Edits| B
C -->|AI Canvas Actions| B
E -->|Undo / Redo Operations| B
B -->|Update Events| I
I -->|Broadcast via Firestore Listeners| K

%% ===== INFRASTRUCTURE =====
J --> N["Firebase Auth"]
J --> O["Storage / Components / Exports"]
N --> A

style A fill:#e3f2fd,stroke:#90caf9,stroke-width:1px
style B fill:#fff3e0,stroke:#fb8c00,stroke-width:1px
style C fill:#f3e5f5,stroke:#9c27b0,stroke-width:1px
style L fill:#ede7f6,stroke:#7e57c2,stroke-width:1px
style M fill:#fce4ec,stroke:#f06292,stroke-width:1px
style I fill:#c8e6c9,stroke:#43a047,stroke-width:1px
style J fill:#a5d6a7,stroke:#388e3c,stroke-width:1px
style E fill:#e0f7fa,stroke:#00acc1,stroke-width:1px
style D fill:#e1bee7,stroke:#8e24aa,stroke-width:1px
style F fill:#fff9c4,stroke:#fbc02d,stroke-width:1px
style G fill:#ffe0b2,stroke:#ff9800,stroke-width:1px
style N fill:#bbdefb,stroke:#1976d2,stroke-width:1px
style O fill:#d7ccc8,stroke:#5d4037,stroke-width:1px
```

---

## 🧠 **Subsystem Overview**

### 🖥️ **Client Layer**
- **React + TypeScript frontend** powers canvas rendering, shape manipulation, and real-time collaboration.
- Core modules include:
  - `Canvas State Manager`: orchestrates local updates and Firestore sync.
  - `AI Agent`: translates user text commands into canvas API actions.
  - `Layout Engine`: handles constraint-based auto-layout and bounding box logic.
  - `History Manager`: tracks both AI and manual actions for undo/redo.
  - `Component System`: manages reusable grouped elements.
  - `Export Engine`: enables export to PNG/SVG formats.

---

### ☁️ **Sync & Persistence Layer**
- **Firestore Realtime Database** provides low-latency sync for all objects, cursors, and edits.
- Employs **Last-Write-Wins (LWW)** conflict resolution globally.
- Maintains full local persistence for offline operations.
- Broadcasts updates via Firestore listeners to all active clients.

---

### 🗂️ **Projects & Collections**
- Introduce `projects/{projectId}` as the top-level container for multi-room support.
- Collections per project:
  - `projects/{projectId}/canvasObjects/{objectId}`
  - `projects/{projectId}/presence/{userId}`
  - `projects/{projectId}/cursors/{userId}`
  - `projects/{projectId}/components/{userId}/{componentId}`
- Use `collectionGroup` queries for performance-sensitive reads across projects when needed (dev tools only).

---

### 🖱️ **Cursor Sync Strategy**
- Local interpolation at ~60 FPS (≈16 ms) for smooth visuals.
- Network throttling of cursor writes to Firestore at ~25–50 ms to control cost and load.

---

### 🤖 **AI Layer**
- **Firebase Cloud Function** serves as a secure proxy for OpenAI requests.
- All AI actions are routed through `agent.ts` → `firebaseFunction` → `gpt-4-turbo-2024-04-09`.
- Function-calling schema executes structured canvas actions such as `createShape`, `moveShape`, and `arrangeLayout`.
- AI responses appear as **chat bubbles**, and raw prompt + JSON logs are stored for replay.

---

### 🔄 **Undo / Redo & History**
- **History Manager** records all AI and manual operations.
- History is stored **per user** and mirrored in Firestore for cross-device consistency.
- One AI command equals **one undo step**.
- Supports grouped rollbacks (multi-step actions like AI layout creation).

---

### 🧩 **Auto-Layout & Components**
- **Layout Engine** provides constraint-based automatic alignment and spacing.
- **Component System** enables creation of reusable objects synchronized across canvases.
- Stored in Firestore under `/components/{userId}` and auto-synced in real time.
- Bounding box behavior: **clip** objects at canvas edges (no reflow/shrink).

---

### 📦 **Export & Storage**
- Exports canvas or selection to **PNG** and **SVG**.
- Manages exports and component assets in Firebase Storage.
- Integrates with Firestore for metadata and access control.

---

### 🔐 **Authentication & Security**
- Managed via **Firebase Auth** (email + OAuth providers).
- Protects user and project data with scoped Firestore rules.
- Cloud Functions validate and log AI requests securely (no exposed API keys).

---

### ⚙️ **Deployment & Infrastructure**
- **Frontend:** Vercel static build via Vite.
- **Backend:** Firebase (Firestore, Auth, Cloud Functions).
- **AI Integration:** OpenAI GPT-4-Turbo through Firebase proxy.
- Manual E2E testing performed pre-deployment.

#### Cloud Functions & Secrets (Best Practices)
- Firebase Functions: Node 20, TypeScript (ESM), region `us-central1`.
- Store `OPENAI_API_KEY` as a **Functions secret** (not in client or Vercel envs).
- Restrict proxy CORS to your Vercel domains.

---

**Version:** Architecture v3.0  
**Author:** Tony Kim  
**Last Updated:** October 2025
