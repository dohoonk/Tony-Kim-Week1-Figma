import { useUser } from '../../context/UserContext';

export default function LogoutButton() {
  const { user, signOutUser } = useUser();
  if (!user) return null;
  return (
    <button onClick={signOutUser}>
      Logout
    </button>
  );
}
