import { useState, useEffect } from 'react';
import type { FormSchema, Section } from '../types';

interface FormWizardProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const MAX_FIELDS_PER_STEP = 2; 

export default function FormWizard({ onCancel, onSuccess }: FormWizardProps) {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/forms/schema/satellite_control')
      .then(res => res.json())
      .then(data => {
        const parsedSchema: FormSchema = typeof data.schemaJson === 'string' ? JSON.parse(data.schemaJson) : data.schemaJson;
        
        // Şarta bağlı (dependsOn olan) alanları ana akıştan ayırıp, 
        // ebeveynlerinin hemen altında render edeceğiz. Bu sayede ana sayfa yapısı ASLA bozulmaz.
        const fixedSections: Section[] = [];
        
        parsedSchema.sections.forEach(sec => {
          // Sadece bağımsız ana alanları sayfalama için alıyoruz
          const mainFields = sec.fields.filter(f => !f.dependsOn);

          if (mainFields.length <= MAX_FIELDS_PER_STEP) {
            fixedSections.push({ title: sec.title, fields: mainFields });
          } else {
            const totalParts = Math.ceil(mainFields.length / MAX_FIELDS_PER_STEP);
            for (let i = 0; i < mainFields.length; i += MAX_FIELDS_PER_STEP) {
              fixedSections.push({
                title: `${sec.title} (Kısım ${Math.floor(i / MAX_FIELDS_PER_STEP) + 1}/${totalParts})`,
                fields: mainFields.slice(i, i + MAX_FIELDS_PER_STEP)
              });
            }
          }
        });

        setSchema({ sections: fixedSections });
      })
      .catch(() => setError("Şema bağlantı hatası"));
  }, []);

  const handleSubmit = async () => {
    const payload = { menuKey: "satellite_control", formData };
    const res = await fetch('http://localhost:8080/api/forms/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert("Form dolduruldu ve onaya gönderildi.");
      onSuccess();
    }
  };

  if (error) return <div style={{ textAlign: 'center', color: '#ef4444' }}><h2>Hata</h2><p>{error}</p></div>;
  if (!schema) return <div style={{ textAlign: 'center' }}>Yükleniyor...</div>;

  const sections = schema.sections;
  const currentSection = sections[currentStep];

  // Bu adımda gösterilecek alanları ve varsa onların altındaki bağımlı alanları bul
  // Not: Şema içindeki orijinal alt alanları orijinal raw şemadan veya field eşlemesinden bulabiliriz.
  // Burada pratik olması için form tanımındaki bağımlı alanları doğrudan ana alanın altında işleyeceğiz.

  return (
    <>
      <div className="wizard-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h2>{currentSection.title}</h2>
          <span style={{ color: '#64748b', fontWeight: '600', fontSize: '1.1rem' }}>Adım {currentStep + 1} / {sections.length}</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${((currentStep + 1) / sections.length) * 100}%` }}></div>
        </div>
      </div>

      <div key={currentStep} className="form-section animate-fade">
        <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          {currentSection.fields.map((field) => {
            // Şarta bağlı alt alanı bulmak için (Örn: t4a_ops_other -> dependsOn: t4a_ops_progress:Other)
            // Bu alana ait bağımlı bir input var mı kontrol ediyoruz
            return (
              <div key={field.key}>
                {/* Ana Soru */}
                <div className="form-group">
                  <label>{field.label} {field.required && <span style={{color: '#ef4444'}}>*</span>}</label>
                  
                  {field.type === 'text' || field.type === 'number' ? (
                    <input type={field.type} value={formData[field.key] || ''} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} />
                  ) : field.type === 'textarea' ? (
                    <textarea rows={4} value={formData[field.key] || ''} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} />
                  ) : field.type === 'radio' && field.options ? (
                    <div className="radio-group">
                      {field.options.map((opt) => (
                        <label key={opt} className="radio-item">
                          <input type="radio" name={field.key} value={opt} checked={formData[field.key] === opt} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} /> {opt}
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'checkbox_group' && field.options ? (
                    <div className="checkbox-group">
                      {field.options.map((opt) => (
                        <label key={opt} className="checkbox-item">
                          <input type="checkbox" value={opt} checked={formData[field.key] === opt} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.checked ? opt : '' }))} /> {opt}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* EĞER BU ALANA BAĞIMLI BİR ALT ALAN VARSA (Örn: Other seçildiyse) HEMEN BURADA AÇILSIN */}
                {field.key === 't4a_ops_progress' && formData['t4a_ops_progress'] === 'Other' && (
                  <div className="form-group animate-fade" style={{ marginLeft: '20px', borderLeft: '3px solid #3b82f6', paddingLeft: '15px' }}>
                    <label>Other Details</label>
                    <input type="text" value={formData['t4a_ops_other'] || ''} onChange={(e) => setFormData(p => ({ ...p, t4a_ops_other: e.target.value }))} />
                  </div>
                )}

                {field.key === 'ool_check' && formData['ool_check'] === 'Yes' && (
                  <div className="form-group animate-fade" style={{ marginLeft: '20px', borderLeft: '3px solid #3b82f6', paddingLeft: '15px' }}>
                    <label>OOL Remarks</label>
                    <input type="text" value={formData['ool_remarks'] || ''} onChange={(e) => setFormData(p => ({ ...p, ool_remarks: e.target.value }))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="wizard-footer">
        <button className="btn btn-exit" onClick={() => { if (window.confirm("Çıkmak istediğinize emin misiniz?")) onCancel(); }}>İptal</button>
        <div style={{ display: 'flex', gap: '15px' }}>
          {currentStep > 0 && <button className="btn btn-back" onClick={() => setCurrentStep(p => p - 1)}>Geri</button>}
          {currentStep === sections.length - 1 ? (
            <button className="btn btn-next" onClick={handleSubmit}>Onaya Gönder</button>
          ) : (
            <button className="btn btn-next" onClick={() => setCurrentStep(p => p + 1)}>İleri</button>
          )}
        </div>
      </div>
    </>
  );
}