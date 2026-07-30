import { useState, useEffect } from 'react';
import type { CurrentUser, FormSchema } from '../types';

interface FormDetailProps {
  formId: number;
  currentUser: CurrentUser;
  onBack: () => void;
  onSuccess: () => void;
}

export default function FormDetail({ formId, currentUser, onBack, onSuccess }: FormDetailProps) {
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);

  useEffect(() => {
    fetch(`http://localhost:8080/api/forms/${formId}`)
      .then(res => res.json())
      .then(data => setSelectedForm(data));

    fetch('http://localhost:8080/api/forms/schema/satellite_control')
      .then(res => res.json())
      .then(data => setSchema(typeof data.schemaJson === 'string' ? JSON.parse(data.schemaJson) : data.schemaJson));
  }, [formId]);

  const handleAdvanceStatus = async () => {
    const res = await fetch(`http://localhost:8080/api/forms/${formId}/advance-status`, { method: 'POST' });
    if (res.ok) {
      alert("Form başarıyla onaylandı!");
      onSuccess();
    }
  };

  if (!selectedForm || !schema) return <div style={{ textAlign: 'center' }}>Yükleniyor...</div>;

  const parsedData = typeof selectedForm.formData === 'string' ? JSON.parse(selectedForm.formData) : selectedForm.formData;

  return (
    <>
      <div className="dashboard-header animate-fade" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ marginBottom: '10px' }}>Form Detayı (#{selectedForm.id})</h2>
          <span className={`status-badge ${selectedForm.status === 'PENDING_MANAGER_APPROVAL' ? 'status-pending' : 'status-completed'}`}>
            {selectedForm.status === 'PENDING_MANAGER_APPROVAL' ? 'Amir Onayı Bekliyor' : 'Tamamlandı'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedForm.status === 'PENDING_MANAGER_APPROVAL' && currentUser.role === 'UNIT_MANAGER' && (
            <button className="btn" style={{ background: '#27ae60', color: 'white'}} onClick={handleAdvanceStatus}>Amir Olarak Onayla</button>
          )}
          <button className="btn btn-back" onClick={onBack}>Listeye Dön</button>
        </div>
      </div>
      <div className="scrollable-content animate-fade">
        {schema.sections.map((sec, idx) => (
          <div key={idx} style={{ marginBottom: '25px', padding: '20px', background: '#f8f9fa', border: '1px solid #e1e8ed', borderRadius: '8px' }}>
            <h3 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '15px', color: '#2c3e50', fontSize: '1.2rem' }}>{sec.title}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {sec.fields.map(f => {
                if (f.dependsOn && parsedData[f.dependsOn.split(':')[0]] !== f.dependsOn.split(':')[1]) return null;
                return (
                  <div key={f.key}>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: '#7f8c8d', fontWeight: 'bold' }}>{f.label}</span>
                    <span style={{ fontSize: '1.05rem', color: '#2c3e50', fontWeight: '500' }}>{parsedData[f.key] || <span style={{ color: '#bdc3c7' }}>Boş bırakılmış</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}