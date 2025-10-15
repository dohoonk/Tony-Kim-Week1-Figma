import { usePresence } from '../../hooks/usePresence';
import '../../styles/PresenceBox.css';

export default function PresenceBox() {
  const { self, others, getInitials } = usePresence();

  return (
    <div className="presence-box left-stack">
      {self && (
        <div className="presence-avatar self" title={self.name} style={{ background: self.color }}>
          <span>{getInitials(self.name)}</span>
        </div>
      )}
      {others.map((u) => (
        <div key={u.uid} className="presence-avatar" title={u.name} style={{ background: u.color }}>
          <span>{getInitials(u.name)}</span>
        </div>
      ))}
    </div>
  );
}


