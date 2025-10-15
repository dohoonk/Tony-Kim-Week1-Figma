import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Canvas from '../components/Canvas/Canvas';

export default function CanvasPage() {
  const { user, loading } = useUser();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Canvas />;
}


