import { useUser } from '../../context/UserContext';

export default function Login() {
  const { loading, user, signInWithGoogle } = useUser();
  const buttonStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#fff',
    border: '1px solid #fff',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 16,
    cursor: 'pointer'
  };
  if (loading) return <button style={buttonStyle} disabled>Loading...</button>;
  if (user) return null;
  return (
    <button onClick={signInWithGoogle} style={buttonStyle}>
      Sign in with Google
    </button>
  );
}
