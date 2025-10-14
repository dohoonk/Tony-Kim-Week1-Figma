# 📄 Product Requirements Document (PRD) – CollabCanvas (MVP)

---

## **1. Overview**

**Goal:**  
Build a real-time collaborative design canvas that enables multiple users to create, move, and modify shapes simultaneously, with smooth performance and seamless synchronization across clients.

**Purpose:**  
To establish the foundation for multiplayer collaboration — focusing on real-time synchronization, user presence, and shared state persistence.  
This MVP is not about feature richness but reliability: a simple, solid multiplayer canvas that can be extended later.

**Primary Outcome:**  
A publicly accessible web app demonstrating reliable real-time collaboration with minimal latency and stable synchronization.

**Scope Clarification:**  
Single shared global canvas (no rooms/sessions in MVP). Anonymous users are blocked; Google sign-in required.

---

## **2. User Types**

### **Designer / Collaborator (MVP Focus)**
- Sign in using Google OAuth (transient session).
- Create and modify objects on a shared canvas.
- See other users’ cursors and selections in real time.
- Reconnect or refresh without losing shared state.

### **Excluded for MVP**
- AI Canvas Agent and natural language features.
- Viewer-only or admin roles.
- Offline editing, grouping, or version history.

---

## **3. User Stories**

### **Canvas Creation and Manipulation**
- As a user, I can create shapes (rectangle, circle, triangle) to visualize ideas.  
- As a user, I can move, resize, and delete shapes.  
- As a user, I can pan and zoom the canvas.  
- As a user, I can select a single object for transformation.

### **Real-Time Collaboration**
- As a user, I can see other users’ cursors and names while they edit.  
- As a user, I can see edits made by others instantly.  
- As a user, I can view who is currently online.  
- As a user, I can collaborate simultaneously without sync conflicts.

### **Persistence and Reliability**
- As a user, I can refresh the page and retain the canvas state.  
- As a user, I expect smooth performance (~60 FPS) even with multiple users.

### **Authentication**
- As a user, I can log in using Google OAuth.  
- As a user, my session resets when I log out or close the browser (Firebase Auth persistence: NONE).

---

## **4. Core MVP Features**

| Feature | Description | Priority |
|----------|--------------|-----------|
| Google OAuth Authentication | Single sign-in provider with transient sessions. | Must-have |
| Canvas Rendering (Pan & Zoom) | Smooth, performant Konva-based canvas. | Must-have |
| Shape Creation | Choose from three predefined shapes (no text in MVP). | Must-have |
| Object Manipulation | Move, resize, and delete shapes (single selection). | Must-have |
| Multiplayer Sync | Real-time updates via Firestore listeners. | Must-have |
| Multiplayer Cursors | Display active users’ cursors with labels. | Must-have |
| Presence Awareness | Show who’s connected (Figma-style box). | Must-have |
| Persistence | Save state in Firestore and restore on reload. | Must-have |
| Deployment | Hosted on Vercel + Firebase backend. | Must-have |
| Conflict Resolution | “Last-write-wins” updates. | Should-have |
| Performance Optimization | Maintain 60 FPS interactions. | Should-have |

---

## **5. Presence Awareness (Who’s Online)**

**Purpose:**  
Display all active users in the shared canvas session — similar to Figma’s collaborator bar.

### **UI Behavior**
- Small presence box at the top-right of the canvas.  
- Each user represented by an avatar (photo or initials).  
- Colored border/background matches their session color.  
- Hover shows display name.  
- Avatars disappear instantly when users disconnect.

### **Firestore Schema**
```json
{
  "userId": "firebase_uid",
  "displayName": "Tony Kim",
  "photoURL": "https://...",
  "color": "#4E91F9",
  "expiresAt": "timestamp" // used by Firestore TTL (~5 minutes)
}
```

**Behavior:**
1. On login → add presence doc to Firestore with `color`, `displayName`, `photoURL`.  
2. Client heartbeats update `expiresAt = serverTimestamp() + 5 minutes`.  
3. Firestore TTL removes stale presence docs automatically after ~5 minutes.  
4. Frontend listens to `/presence` updates for re-render.

**Performance & Testing:**
- Minimal re-rendering (<100ms latency).  
- Tested with 3+ concurrent users.  

**Edge Cases:**
- Multiple sessions = multiple avatars.  
- Fallback initials if no photo.  
- Stale sessions auto-cleared.

---

## **6. Technical Architecture**

### **Frontend**
- Framework: React (Vite)  
- Rendering: Konva.js  
- Auth: Firebase SDK (Google provider)  
- State: React Context

### **Backend**
- Firebase Firestore for real-time sync.  
- Firebase Auth for Google OAuth.  
- Firestore `/presence` for online tracking.

### **Hosting**
- Frontend: Vercel  
- Backend: Firebase (Auth + Firestore)

### **Sync Mechanism**
- Firestore listeners on `canvasObjects`.  
- Full-document writes on changes, debounced (~100ms) during drags/resizes.  
- Timestamps via `serverTimestamp()`; last-write-wins by `updatedAt`.  
- No offline support (MVP).

### **Data Model**
```json
{
  "id": "string",
  "type": "rectangle | circle | triangle",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 100,
  "color": "#FF0000",
  "rotation": 0,
  "updatedAt": "timestamp"
}
```

---

## **7. Technical Considerations**
- “Last-write-wins” conflict resolution using `updatedAt` (`serverTimestamp()`).  
- Render with `requestAnimationFrame` for smooth performance.  
- Hard delete from Firestore on shape removal.  
- Presence removal via Firestore TTL (5 minutes after last heartbeat).  
- Cursor labels display user names.  
- Canvas state auto-saves on every mutation (writes debounced ~100ms during interaction).  
- Basic logging; no retry logic.

### **Canvas Interaction Defaults**
- Zoom: mouse wheel; clamped min/max scale (e.g., 0.25–4).  
- Pan: right-drag and space+drag; clamped to canvas bounds.  
- Deletion: `Delete` (Windows) and `Backspace` (macOS).

---

## **8. Evaluation Criteria (MVP Checkpoint)**

| Category | Metric / Expectation |
|-----------|----------------------|
| Functionality | Pan/zoom, shape creation, move, delete. |
| Collaboration | 2+ users see changes instantly (<150ms). |
| Presence | Top-right avatars update on join/leave. |
| Persistence | Reload restores canvas. |
| Performance | 60 FPS, 3–5 users active. |
| Deployment | Publicly accessible via Vercel + Firebase. |
| Reliability | No crashes or desync under load. |

### **Performance Guardrails**
- Soft cap of ~300 shapes to sustain 60 FPS in MVP.  
- Larger scenes are allowed but may degrade performance; optimize later as needed.

---

## **9. Excluded Features (Future Work)**
- AI Canvas Agent or natural language input.  
- Grouping, layering, or z-index management.  
- Offline mode or reconnection queue.  
- Version history / undo-redo.  
- Staging or multi-deploy pipelines.

---

## **10. Summary**
The **CollabCanvas MVP** focuses on robust real-time collaboration powered by Firebase Firestore.  
A successful MVP will demonstrate:
- Smooth real-time editing & sync.  
- Live presence and cursor tracking.  
- Persistent, reliable state and low latency.  

This foundation enables future expansions (grouping, AI tools, version control, etc.).
