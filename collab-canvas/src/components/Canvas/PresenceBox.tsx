import { usePresence } from '../../hooks/usePresence';
import '../../styles/PresenceBox.css';

export default function PresenceBox() {
  const { self, others, getInitials } = usePresence();

  return (
    <div className="presence-box">
      {self && (
        <div className="presence-avatar self" title={self.name}>
          <span>{getInitials(self.name)}</span>
        </div>
      )}
      {others.map((u) => (
        <div key={u.uid} className="presence-avatar" title={u.name}>
          <span>{getInitials(u.name)}</span>
        </div>
      ))}
    </div>
  );
}


