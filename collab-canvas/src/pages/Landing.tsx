import Login from '../components/Auth/Login';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  if (!loading && user) navigate('/canvas', { replace: true });
  return (
    <div style={{
      backgroundColor: '#000',
      color: '#fff',
      height: '100vh',
      width: '100vw',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      textAlign: 'center'
    }}>
      <div style={{ position: 'absolute', top: 16, left: 16, fontWeight: 800, fontSize: 22 }}>CollabCanvas</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          fontSize: 12,
          background: '#222',
          color: '#fff',
          padding: '3px 8px',
          borderRadius: 8,
          letterSpacing: 1,
          opacity: 0.9,
          marginBottom: 4
        }}>BETA</div>
        <div style={{ fontSize: 'clamp(36px, 10vw, 120px)', lineHeight: 1.05, fontWeight: 800, margin: 0 }}>Build Togather.</div>
        <div style={{ fontSize: 'clamp(36px, 10vw, 120px)', lineHeight: 1.05, fontWeight: 800, margin: 0 }}>Sketch Faster.</div>
        <div style={{ fontSize: 16, opacity: 0.85, marginTop: 8 }}>powered by AI chat.</div>
        <div style={{ height: 12 }} />
        {/* Styled login button inline to ensure white-on-black */}
        <Login />
      </div>
    </div>
  );
}
