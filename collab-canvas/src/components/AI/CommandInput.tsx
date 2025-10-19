import { useEffect, useRef, useState } from 'react';
import { useAIAgent } from '../../hooks/useAIAgent';
import { db } from '../../utils/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../context/UserContext';

export default function CommandInput() {
  const { execute } = useAIAgent();
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'ai'; text: string; createdAtMs?: number }>>([]);
  const { user } = useUser();
  const sessionIdRef = useRef<string>((() => {
    try { return crypto.randomUUID(); } catch { return String(Date.now()); }
  })());
  const listRef = useRef<HTMLDivElement>(null);

  const proxyUrl = (import.meta as any).env?.VITE_AI_PROXY_URL as string | undefined;

  const tools = [
    {
      type: 'function',
      function: {
        name: 'createShape',
        description: 'Create rectangle|circle|triangle at x,y with optional color',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['rectangle', 'circle', 'triangle'] },
            x: { type: 'number' },
            y: { type: 'number' },
            color: { type: 'string' },
          },
          required: ['type'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createMany',
        description: 'Create many shapes in a grid without overlap',
        parameters: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['rectangle', 'circle', 'triangle'] },
            count: { type: 'number' },
            color: { type: 'string' },
            gap: { type: 'number' },
            padding: { type: 'number' },
          },
          required: ['type', 'count'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'createText',
        description: 'Create a text object at x,y with optional fontSize and color',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
            fontSize: { type: 'number' },
            color: { type: 'string' },
          },
          required: ['text'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'moveSelected',
        description: 'Move the currently selected object to x,y',
        parameters: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
          required: ['x', 'y'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'resizeSelected',
        description: 'Resize the currently selected object to width,height',
        parameters: {
          type: 'object',
          properties: { width: { type: 'number' }, height: { type: 'number' } },
          required: ['width', 'height'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'rotateSelected',
        description: 'Rotate the currently selected object to rotation degrees',
        parameters: {
          type: 'object',
          properties: { rotation: { type: 'number' } },
          required: ['rotation'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'setColorSelected',
        description: 'Set color of the currently selected object',
        parameters: {
          type: 'object',
          properties: { color: { type: 'string' } },
          required: ['color'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'arrangeCenter',
        description: 'Center the currently selected object on the canvas',
        parameters: { type: 'object', properties: {} },
      },
    },
    {
      type: 'function',
      function: {
        name: 'alignSelected',
        description: 'Align selected object to left/right/top/bottom of canvas',
        parameters: {
          type: 'object',
          properties: { position: { type: 'string', enum: ['left', 'right', 'top', 'bottom'] } },
          required: ['position']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'distributeObjects',
        description: 'Distribute objects horizontally or vertically within canvas',
        parameters: {
          type: 'object',
          properties: { axis: { type: 'string', enum: ['horizontal', 'vertical'] } },
          required: ['axis']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'setTextKindSelected',
        description: 'Set text kind (heading/subtitle/body) for selected text',
        parameters: {
          type: 'object',
          properties: { kind: { type: 'string', enum: ['heading', 'subtitle', 'body'] } },
          required: ['kind']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'gridLayout',
        description: 'Arrange existing objects in a grid; optional gap and padding',
        parameters: {
          type: 'object',
          properties: { gap: { type: 'number' }, padding: { type: 'number' } }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'rowLayout',
        description: 'Arrange existing objects in a single row; optional gap and padding',
        parameters: {
          type: 'object',
          properties: { gap: { type: 'number' }, padding: { type: 'number' } }
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'generateLoginForm',
        description: 'Generate a simple login form (title, two inputs, button) centered with padding',
        parameters: {
          type: 'object',
          properties: { width: { type: 'number' }, padding: { type: 'number' }, gap: { type: 'number' }, color: { type: 'string' }, title: { type: 'string' }, buttonText: { type: 'string' } }
        }
      }
    },
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    // optimistic user message
    setValue('');
    const userMsg = { role: 'user' as const, text: v };
    setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), ...userMsg }]);
    // persist
    if (user) {
      try {
        const col = collection(db, 'chats', user.uid, 'sessions', sessionIdRef.current, 'messages');
        await addDoc(col, { role: 'user', text: v, createdAt: serverTimestamp() });
      } catch { /* ignore */ }
    }

    // If proxy is configured, use function calling
    if (proxyUrl) {
      try {
        const resp = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: v, tools }),
        });
        const json = await resp.json();
        const choice = json?.choices?.[0];
        const toolCalls = choice?.message?.tool_calls as
          | Array<{ id: string; type: string; function: { name: string; arguments: string } }>
          | undefined;
        if (toolCalls && toolCalls.length) {
          let executed = false;
          for (const call of toolCalls) {
            const args = (() => {
              try { return JSON.parse(call.function.arguments || '{}'); } catch { return {}; }
            })();
            switch (call.function.name) {
              case 'createMany':
                execute({ type: 'createMany', payload: { type: args.type, count: args.count, color: args.color, gap: args.gap, padding: args.padding } as any });
                executed = true;
                break;
              case 'createShape':
                execute({ type: 'createShape', payload: { type: args.type, x: args.x, y: args.y, color: args.color } });
                executed = true;
                break;
              case 'createText':
                execute({ type: 'createText', payload: { text: args.text, x: args.x, y: args.y, fontSize: args.fontSize, color: args.color } });
                executed = true;
                break;
              case 'moveSelected':
                execute({ type: 'moveSelected', payload: { x: args.x, y: args.y } });
                executed = true;
                break;
              case 'resizeSelected':
                execute({ type: 'resizeSelected', payload: { width: args.width, height: args.height } });
                executed = true;
                break;
              case 'rotateSelected':
                execute({ type: 'rotateSelected', payload: { rotation: args.rotation } });
                executed = true;
                break;
              case 'setColorSelected':
                execute({ type: 'setColorSelected', payload: { color: args.color } });
                executed = true;
                break;
              case 'alignSelected':
                execute({ type: 'alignSelected', payload: { position: args.position } });
                executed = true;
                break;
              case 'distributeObjects':
                execute({ type: 'distributeObjects', payload: { axis: args.axis } });
                executed = true;
                break;
              case 'setTextKindSelected':
                execute({ type: 'setTextKindSelected', payload: { kind: args.kind } });
                executed = true;
                break;
              case 'gridLayout':
                execute({ type: 'gridLayout', payload: { gap: args.gap, padding: args.padding } });
                executed = true;
                break;
              case 'rowLayout':
                execute({ type: 'rowLayout', payload: { gap: args.gap, padding: args.padding } });
                executed = true;
                break;
              case 'generateLoginForm':
                execute({ type: 'generateLoginForm', payload: { width: args.width, padding: args.padding, gap: args.gap, color: args.color, title: args.title, buttonText: args.buttonText } });
                executed = true;
                break;
              case 'arrangeCenter':
                execute({ type: 'arrangeCenter' });
                executed = true;
                break;
              default:
                break;
            }
          }
          if (executed) {
            const aiText = '✨ All set!';
            setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: 'ai', text: aiText }]);
            if (user) {
              try {
                const col = collection(db, 'chats', user.uid, 'sessions', sessionIdRef.current, 'messages');
                await addDoc(col, { role: 'ai', text: aiText, createdAt: serverTimestamp() });
              } catch { /* ignore */ }
            }
            return;
          }
        }
      } catch {
        // fall through to local parser
      }
    }

    // Fallback: super-minimal local parser
    let executedLocal = false;
    if (v.startsWith('rectangle')) { execute({ type: 'createShape', payload: { type: 'rectangle' } }); executedLocal = true; }
    else if (v.startsWith('circle')) { execute({ type: 'createShape', payload: { type: 'circle' } }); executedLocal = true; }
    else if (v.startsWith('triangle')) { execute({ type: 'createShape', payload: { type: 'triangle' } }); executedLocal = true; }
    else if (v.startsWith('text ')) { execute({ type: 'createText', payload: { text: v.slice(5) } }); executedLocal = true; }
    else if (v.startsWith('color ')) { execute({ type: 'setColorSelected', payload: { color: v.slice(6) } }); executedLocal = true; }

    if (!executedLocal) {
      setFlash('Please try a different command');
      window.setTimeout(() => setFlash(null), 2000);
    } else {
      const aiText = '✨ All set!';
      setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: 'ai', text: aiText }]);
      if (user) {
        try {
          const col = collection(db, 'chats', user.uid, 'sessions', sessionIdRef.current, 'messages');
          await addDoc(col, { role: 'ai', text: aiText, createdAt: serverTimestamp() });
        } catch { /* ignore */ }
      }
    }
  };

  // subscribe to chat history for this session (optional per user)
  useEffect(() => {
    if (!user) return;
    const col = collection(db, 'chats', user.uid, 'sessions', sessionIdRef.current, 'messages');
    const q = query(col, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const next: Array<{ id: string; role: 'user' | 'ai'; text: string; createdAtMs?: number }> = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        next.push({ id: d.id, role: (data.role as 'user' | 'ai') ?? 'ai', text: data.text ?? '', createdAtMs: data.createdAt?.toMillis?.() });
      });
      setMessages(next);
      // auto-scroll
      setTimeout(() => { listRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, 0);
    });
    return unsub;
  }, [user]);

  const launcher = (
    <button
      aria-label="Open AI Assistant"
      onClick={() => setOpen(true)}
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        border: '1px solid #e2e8f0',
        background: '#4f46e5',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
        cursor: 'pointer',
        zIndex: 40,
      }}
    >
      AI
    </button>
  );

  const panel = (
    <div
      role="dialog"
      aria-label="AI Assistant"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 380,
        height: 480,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b1220',
        color: '#e2e8f0',
        border: '1px solid #1f2937',
        borderRadius: 16,
        overflow: 'hidden',
        zIndex: 40,
        boxShadow: '0 20px 40px rgba(2,6,23,0.5)'
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid #1f2937' }}>
        <div style={{ fontWeight: 600 }}>Canvas Assistant</div>
        <button onClick={() => setOpen(false)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>×</button>
      </div>
      <div ref={listRef} style={{ flex: 1, padding: 12, overflow: 'auto', fontSize: 13, color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {flash && (
          <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px' }}>{flash}</div>
        )}
        {messages.length === 0 && <div style={{ opacity: 0.8 }}>Ask things like “Create a blue rectangle in the center”.</div>}
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#1f2937' : '#0b1220', border: '1px solid #334155', padding: '8px 10px', borderRadius: 10, maxWidth: '80%' }}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, padding: 12, background: 'rgba(255,255,255,0.03)', borderTop: '1px solid #1f2937' }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={proxyUrl ? 'Ask the AI…' : 'Try: rectangle | circle | triangle | text hello'}
          style={{ flex: 1, padding: '10px 12px', border: '1px solid #334155', background: '#0b1220', color: '#e2e8f0', borderRadius: 12, outline: 'none' }}
        />
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #334155', background: '#111827', color: '#e2e8f0' }}>Send</button>
      </form>
    </div>
  );

  return open ? panel : launcher;
}


