AI Development Log
Tools & Workflow
Initial brain storming for PRD/TASK/MERMAID. (ChatGPT)
Cursor AI with GPT-5 model for coding.
Iterative loop: Cursor update code → run locally → fix lints/build → commit/push; feature flags tracked in task.md as PRs.
Prompting Strategies (examples)
Breaking the prompt into smaller PR ingestible steps really helped to keep context tight.
Asking for clarification before each task helped eliminate any guess work AI had to do.
Emphasising on important things like “Focus on just the MVP” multiple times helped AI with the scope.
“Based on the system architecture I want to do the initial setup myself. What do we need to install ? Lets go step at a time and explain why we need to install that. After that Let's commit the initial setup.”
I will attach the couple prompts at the end of the this log for more examples.
Code Analysis (AI vs human)
AI-authored: 90% (contexts/hooks, canvas logic, Firestore sync, cursors/presence, routing, styling, docs).
Human-authored: 10% (requirements & decisions, Firebase/Vercel setup, docs edit).
Strengths & Limitations
Strengths: Rapid multi-file implementation; consistent patterns; quick fixes for TS/Vite/Firebase issues; effective and fast real-time feature development (debounced LWW, liveness filters, deterministic colors).
Limitations: GPT-5 took a long time to think before each task(around 45 seconds per task). Canvas testing in jsdom is limited; relies on manual/E2E checks. Will continue to monitor for this.
Key Learnings
Limiting context by breaking task into smaller pr size bites will drastically improve AI performance.
Prompting for AI to ask questions before each step helps minimize the chance for AI to go off the rails.
I was genuinely surprised at how well GPT-5 was able to handle these small tasks.


