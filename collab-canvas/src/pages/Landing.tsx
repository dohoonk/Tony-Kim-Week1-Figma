import Login from '../components/Auth/Login';

export default function Landing() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 24 }}>
      <h1>Tony's Figma</h1>
      <Login />
    </div>
  );
}
