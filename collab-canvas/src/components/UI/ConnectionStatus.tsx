import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const bg = online ? '#ecfdf5' : '#fef3c7';
  const border = online ? '#a7f3d0' : '#fde68a';
  const color = online ? '#065f46' : '#92400e';
  const text = online ? 'Online' : 'Reconnecting…';

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 110,
        background: bg,
        border: `1px solid ${border}`,
        color,
        borderRadius: 6,
        padding: '4px 8px',
        fontSize: 12,
        zIndex: 12,
      }}
    >
      {text}
    </div>
  );
}


