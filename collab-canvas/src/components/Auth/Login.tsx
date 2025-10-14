import { useUser } from '../../context/UserContext';

export default function Login() {
  const { loading, user, signInWithGoogle } = useUser();
  if (loading) return <button disabled>Loading...</button>;
  if (user) return null;
  return (
    <button onClick={signInWithGoogle}>
      Sign in with Google
    </button>
  );
}
