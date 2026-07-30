import type { CurrentUser } from '../types';

interface LoginProps {  
  onLoginSuccess: (user: CurrentUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const handleLogin = async (username: string) => {
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (res.ok) {
        const user = await res.json();
        onLoginSuccess(user);
      } else {
        alert("Kullanıcı bulunamadı! Lütfen Backend'in (Seeder) çalıştığından emin olun.");
      }
    } catch { 
      alert("Sunucuya bağlanılamadı."); 
    }
  };

  return (
    <div className="animate-fade" style={{textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Sisteme Giriş</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button className="btn btn-next" onClick={() => handleLogin('U1')}>U1 (Operatör 1) Olarak Gir</button>
        <button className="btn btn-next" onClick={() => handleLogin('U2')}>U2 (Operatör 2) Olarak Gir</button>
        <button className="btn" style={{ background: '#e67e22', color: 'white' }} onClick={() => handleLogin('A1')}>A1 (Amir) Olarak Gir</button>
      </div>
    </div>
  );
}