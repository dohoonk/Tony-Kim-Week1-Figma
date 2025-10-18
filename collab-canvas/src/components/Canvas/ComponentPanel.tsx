import { useState } from 'react';
import { useComponents } from '../../hooks/useComponents';

export default function ComponentPanel() {
  const { items, saveSelected, insert, remove } = useComponents();
  const [name, setName] = useState('My Component');
  return (
    <div style={{ position: 'absolute', top: 56, right: 8, width: 240, background: '#ffffffd9', border: '1px solid #e2e8f0', borderRadius: 8, padding: 8, zIndex: 15 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 6px' }} />
        <button onClick={() => saveSelected(name)} style={{ padding: '4px 8px' }}>Save</button>
      </div>
      <div style={{ maxHeight: 200, overflow: 'auto' }}>
        {items.map((i) => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #e2e8f0', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#334155', flex: 1 }}>{i.name}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => insert(i.id)} style={{ padding: '2px 6px' }}>Insert</button>
              <button onClick={() => remove(i.id)} style={{ padding: '2px 6px', color: '#b91c1c' }}>Delete</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={{ fontSize: 12, color: '#94a3b8' }}>No components yet.</div>}
      </div>
    </div>
  );
}


