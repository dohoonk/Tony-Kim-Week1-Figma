# 🧩 CollabCanvas – Product Requirements Document (v3.1)

This document defines the feature scope and design details for the **AI Collaboration Edition (Phase 2)** of CollabCanvas.

---

## 🎯 Overview

CollabCanvas is a collaborative canvas application enabling real-time, multi-user design interaction with AI-assisted creation tools.  
The platform supports seamless synchronization, intelligent layout management, and natural-language-driven design manipulation.

This version (v3.1) builds on the MVP to integrate advanced AI-driven interactions, improved real-time synchronization, Firestore-backed persistence, and extensible export capabilities.

---

## 🧠 Core Features

### **1. Real-Time Synchronization**
**Goal:**  
Ensure all users see updates within 100 ms for objects and 50 ms for cursors, with zero visible lag during rapid edits.

**Implementation Highlights:**
- Sub-100 ms object sync  
- Sub-50 ms cursor updates  
- Firestore **local persistence** for reconnect continuity (no separate IndexedDB shadow)  
- Batched writes using Firestore `writeBatch` (only if <30 ms delay)  
- Query-scoped snapshot listeners  
- Local optimistic updates for smooth UX  

---

### **2. Conflict Resolution & State Management**
**Goal:**  
Guarantee consistent, reliable shared state under concurrent edits with no duplicates or corruption.

**Implementation Highlights:**
- **Last-Write-Wins (LWW)** conflict resolution across entire object  
- `lastEditedBy` and `lastEditedAt` stored in metadata  
- Brief (<1 frame) divergence allowed before reconciliation  
- Rapid edits (10+ per second) handled safely without desync  

---

### **3. Persistence & Reconnection**
**Goal:**  
Ensure seamless experience during refresh or disconnection — users always return to the exact canvas state.

**Implementation Highlights:**
- Uses **Firestore local persistence** for offline reliability  
- Automatic reconnect with delta replay  
- Offline edits queue up to **1 minute**, then sync on reconnect  
- Offline operations **override remote state** using LWW  
- Clear connection status indicator in UI  

**Testing Scenarios:**
- Mid-edit refresh restores same position/state  
- Network drop (30–60 s) recovers full state  
- All users disconnect → return to full canvas intact  

---

### **4. AI Canvas Agent**
**Goal:**  
Enable users to manipulate the canvas using natural language commands.

**Example:**  
“Create a blue rectangle in the center.” → AI calls `createShape()` API → synced across users in real time.

**Implementation Highlights:**
- Uses **Firebase Cloud Function** as proxy to **OpenAI (gpt-4-turbo-2024-04-09)**  
- Function-calling schema for precise execution:  
  ```ts
  createShape(type, x, y, width, height, color)
  moveShape(shapeId, x, y)
  resizeShape(shapeId, width, height)
  rotateShape(shapeId, degrees)
  createText(text, x, y, fontSize, color)
  arrangeLayout(mode, options)
  getCanvasState()
  ```
- Supports multiple command categories: creation, manipulation, layout, and complex generation  
- **Chat bubble UI** for natural feedback  
- Logs **raw prompts + function-call JSON** in Firestore for replay and debugging  
- Max 50 objects created per command  

---

### **5. Layout Engine & Complex Commands**
**Goal:**  
Support structured layouts, arrangement automation, and AI-generated UI templates.

**Implementation Highlights:**
- Enforces **strict bounding box constraints** (clip at canvas edges)  
- Templates **generated dynamically by AI**, not hardcoded  
- Executes **single function call per layout** for predictable behavior  
- Supports templates: login form, navbar, card layout, grid, and rows  
- Integrates with `layoutEngine.ts` for shared logic with manual layout tools  

---

### **6. Undo / Redo System**
**Goal:**  
Allow users to revert or reapply actions seamlessly — including AI-generated operations.

**Implementation Highlights:**
- Tracks both **AI and manual actions**  
- History stack synchronized with **Firestore** for cross-device continuity, stored **per user**  
- Mac layout shortcuts: Cmd+Z / Cmd+Shift+Z  
- Supports undo/redo for grouped operations (e.g., AI layouts)  
- Conflict-free history management post reconnect  

---

### **7. Auto-Layout System**
**Goal:**  
Provide Figma-like constraint-based auto-layout and alignment tools.

**Implementation Highlights:**
- **Constraint-based** layout model  
- Unified engine for manual and AI-driven layouts  
- Auto-spacing, padding, and alignment logic  
- Prioritizes lowest-latency method (batch updates <30 ms)  
- Tested on canvases with 500+ shapes  

---

### **8. Export & Component System**
**Goal:**  
Allow users to export designs and create reusable components.

**Implementation Highlights:**
- Export supported in **PNG** and **SVG** formats  
- **Auto-sync components** across canvases in real time  
- Components stored **per-user** in Firestore under `/components/{userId}`  
- Grouping and reuse supported via `useComponents` hook  
- Export options integrated into toolbar menu  

---

### **9. Performance & Scalability**
**Goal:**  
Maintain 60 FPS and stable Firestore sync under high object load.

**Implementation Highlights:**
- Supports **mix of shapes and text objects** (500+)  
- Dev-only FPS and latency overlay for debugging  
- Firestore query optimization using **collectionGroup** reads  
- Lazy load for off-screen objects  

---

### **10. Authentication & Security**
**Goal:**  
Ensure secure, multi-user collaboration.

**Implementation Highlights:**
- Firebase Authentication for user identity  
- Protected Firestore paths per project and per user  
- API key hidden behind Cloud Function proxy  
- Session-based access validation  

---

### **11. Deployment**
**Goal:**  
Reliable, scalable deployment with minimal overhead.

**Implementation Highlights:**
- **Frontend:** Vercel static deployment via Vite  
- **Backend:** Firebase (Firestore, Functions, Auth)  
- **Testing:** Manual acceptance testing (E2E verification by Tony)  
- **Hosting Configuration:** Firestore rules and function IAM enforcement  

---

## 🧱 Architecture Summary

**Frontend:** React + TypeScript + Firebase SDK  
**Backend:** Firestore (Realtime sync + local cache) + Firebase Functions (AI Proxy)  
**AI Layer:** OpenAI GPT-4-Turbo (function calling)  
**Storage:** Firestore local persistence (no separate IndexedDB shadow)  
**Deployment:** Vercel (frontend) + Firebase (backend)

---

## 🚀 Future Considerations
- Voice command integration for AI  
- Version history and branching system  
- Multi-room / multi-project sessions  
- Firestore cost optimization (write batching, caching)  
- AI summarization of canvas state (“describe current design”)  

---

**Author:** Tony Kim  
**Version:** 3.1 (Updated for implementation readiness)
