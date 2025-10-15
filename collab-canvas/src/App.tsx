import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import CanvasPage from './pages/CanvasPage';
import { useEffect } from 'react';
import { useUser } from './context/UserContext';

function AutoRedirectOnLogin() {
  const { user } = useUser();
  const navigate = useNavigate();
  useEffect(() => {
    if (user) navigate('/canvas', { replace: true });
  }, [user, navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AutoRedirectOnLogin />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
