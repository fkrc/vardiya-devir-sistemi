import type { CurrentUser } from '../types';

interface HeaderProps {
  currentUser: CurrentUser;
  onLogout: () => void;
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#ecf0f1', padding: '10px 15px', borderRadius: '8px' }}>
      <span style={{ fontWeight: 'bold', color: '#34495e' }}>
        Hoş geldin, {currentUser.fullName} ({currentUser.role === 'OPERATOR' ? 'Saha Operatörü' : 'Birim Amiri'})
      </span>
      <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 'bold' }}>
        Çıkış Yap
      </button>
    </div>
  );
}