import { useState } from 'react';
import { useAIAgent } from '../../hooks/useAIAgent';

export default function CommandInput() {
  const { execute } = useAIAgent();
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

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
  ];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;

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
              default:
                break;
            }
          }
          if (executed) {
            setValue('');
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

    if (executedLocal) {
      setValue('');
    } else {
      setFlash('Please try a different command');
      window.setTimeout(() => setFlash(null), 2000);
    }
  };

  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 30 }}>
      {flash && (
        <div style={{ marginBottom: 8, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 6, padding: '6px 10px' }}>
          {flash}
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={proxyUrl ? 'Ask the AI (e.g., Create a blue rectangle in the center)' : 'Try: rectangle | circle | triangle | text hello | color #ff00aa'}
          style={{ width: 420, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8 }}
        />
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>Run</button>
      </form>
    </div>
  );
}


