import { useState, useEffect } from 'react';
import type { CurrentUser, ShiftFormList } from '../types';

interface DashboardProps {
  currentUser: CurrentUser;
  onNewForm: () => void;
  onViewDetail: (id: number) => void;
}

export default function Dashboard({ currentUser, onNewForm, onViewDetail }: DashboardProps) {
  const [formsList, setFormsList] = useState<ShiftFormList[]>([]);

  useEffect(() => {
    fetch('http://localhost:8080/api/forms/list')
      .then(res => res.json())
      .then(data => setFormsList(data))
      .catch(err => console.error(err));
  }, []);

  const getStatusLabel = (status: string) => status === 'PENDING_MANAGER_APPROVAL' ? 'Amir Onayı Bekliyor' : 'Tamamlandı';
  const getStatusClass = (status: string) => status === 'PENDING_MANAGER_APPROVAL' ? 'status-pending' : 'status-completed';

  return (
    <>
      <div className="dashboard-header">
        <h2>Vardiya Kayıtları Paneli</h2>
        {currentUser.role === 'OPERATOR' && (
          <button className="btn btn-next" onClick={onNewForm}>+ Yeni Form Başlat</button>
        )}
      </div>
      <div className="scrollable-content animate-fade">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Birim</th><th>Form Şablonu</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr></thead>
          <tbody>
            {formsList.map((form) => (
              <tr key={form.id}>
                <td>#{form.id}</td><td>{form.unitName}</td><td>{form.formTitle}</td>
                <td>{new Date(form.recordDate).toLocaleString('tr-TR')}</td>
                <td><span className={`status-badge ${getStatusClass(form.status)}`}>{getStatusLabel(form.status)}</span></td>
                <td><button onClick={() => onViewDetail(form.id)} className="btn" style={{ background: '#3498db', color: 'white', padding: '5px 10px' }}>Detay</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}