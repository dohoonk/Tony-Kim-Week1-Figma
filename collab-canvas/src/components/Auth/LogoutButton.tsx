import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const { user, signOutUser } = useUser();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <button
      onClick={async () => {
        await signOutUser();
        navigate('/', { replace: true });
      }}
    >
      Logout
    </button>
  );
}
