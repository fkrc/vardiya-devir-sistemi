import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl, 
  FormLabel, 
  Checkbox, 
  FormGroup, 
  CircularProgress,
  LinearProgress,
  Divider,
  Alert
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { FormSchema, Section } from '../types';

interface FormWizardProps {
  formId: string;
  onCancel: () => void;
  onSuccess: (formData: Record<string, string>) => void;
}

const MAX_FIELDS_PER_STEP = 2; 

export default function FormWizard({ formId, onCancel, onSuccess }: FormWizardProps) {
  const [rawSchema, setRawSchema] = useState<FormSchema | null>(null);
  const [paginatedSections, setPaginatedSections] = useState<Section[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("1. WIZARD TETİKLENDİ. İstenen formId:", formId);
    
    fetch(`http://localhost:8080/api/forms/schema/${formId}`)
      .then(res => {
        console.log("2. BACKEND CEVAP VERDİ. Durum:", res.status);
        if (!res.ok) throw new Error("Şema bağlantı hatası");
        return res.json();
      })
      .then(data => {
        console.log("3. BACKEND'DEN GELEN HAM VERİ:", data);
        
        // Veriyi güvenli parse etme
        let parsed: FormSchema;
        if (data && data.schemaJson) {
          parsed = typeof data.schemaJson === 'string' 
            ? JSON.parse(data.schemaJson) 
            : data.schemaJson;
        } else {
          parsed = data;
        }
        
        console.log("4. PARSE EDİLMİŞ ŞEMA NESNESİ:", parsed);

        if (!parsed || !parsed.sections) {
           console.warn("DİKKAT: Şema içinde 'sections' dizisi bulunamadı!");
           return;
        }

        const fixedSections: Section[] = [];
        parsed.sections.forEach(sec => {
          const safeFields = sec.fields || []; 
          console.log(`Bölüm: ${sec.title}, Toplam Soru Sayısı: ${safeFields.length}`);
          
          const mainFields = safeFields.filter(f => !f.dependsOn);

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

        console.log("5. EKRANA ÇİZİLECEK SAYFALAR:", fixedSections);

        setPaginatedSections(fixedSections);
        setRawSchema(parsed);
        setCurrentStep(0); 
        setFormData({}); 
      })
      .catch(err => {
        console.error("6. HATA YAKALANDI:", err);
        setError(err.message);
      });
  }, [formId]);

  const handleComplete = () => {
    onSuccess(formData); // Veriyi doğrudan App.tsx'teki sepete yolla
  };

  const handleCancelClick = () => {
    if (window.confirm("Bu forma ait kaydedilmemiş veriler silinecek. Çıkmak istediğinize emin misiniz?")) {
      onCancel();
    }
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Alert severity="error" variant="filled">Hata: {error}</Alert>
      </Box>
    );
  }

  if (!rawSchema || paginatedSections.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentSection = paginatedSections[currentStep];
  const allFields = rawSchema.sections.flatMap(s => s.fields);
  const progressPercent = ((currentStep + 1) / paginatedSections.length) * 100;

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', animation: 'fadeIn 0.5s ease-in', pb: 5 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        
        {/* ÜST BİLGİ VE İLERLEME ÇUBUĞU */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {currentSection.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Adım {currentStep + 1} / {paginatedSections.length}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercent} 
            sx={{ height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' }} 
          />
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* FORM ALANLARI */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: '30vh' }}>
          {currentSection.fields.map((field) => {
            
            // Bu ana soruya bağlı olan alt soruları bul
            const dependentFields = allFields.filter(f => f.dependsOn && f.dependsOn.startsWith(field.key + ':'));

            return (
              <Box key={field.key}>
                {/* 1. ANA SORU */}
                <FormControl fullWidth required={field.required} component="fieldset">
                  
                  {field.type === 'text' || field.type === 'number' ? (
                    <TextField 
                      fullWidth 
                      type={field.type}
                      label={field.label} 
                      required={field.required}
                      value={formData[field.key] || ''} 
                      onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} 
                      variant="outlined"
                    />
                  ) : field.type === 'textarea' ? (
                    <TextField 
                      fullWidth 
                      multiline 
                      rows={4}
                      label={field.label} 
                      required={field.required}
                      value={formData[field.key] || ''} 
                      onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} 
                      variant="outlined"
                    />
                  ) : field.type === 'radio' && field.options ? (
                    <>
                      <FormLabel sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                        {field.label} {field.required && <span style={{color: '#ef4444'}}>*</span>}
                      </FormLabel>
                      <RadioGroup
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      >
                        {field.options.map((opt) => (
                          <FormControlLabel key={opt} value={opt} control={<Radio color="primary" />} label={opt} />
                        ))}
                      </RadioGroup>
                    </>
                  ) : field.type === 'checkbox_group' && field.options ? (
                    <>
                      <FormLabel sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
                        {field.label} {field.required && <span style={{color: '#ef4444'}}>*</span>}
                      </FormLabel>
                      <FormGroup>
                        {field.options.map((opt) => (
                          <FormControlLabel 
                            key={opt} 
                            control={
                              <Checkbox 
                                checked={formData[field.key] === opt} 
                                onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.checked ? opt : '' }))}
                                color="primary"
                              />
                            } 
                            label={opt} 
                          />
                        ))}
                      </FormGroup>
                    </>
                  ) : null}
                </FormControl>

                {/* 2. DİNAMİK ALT SORULAR (Animasyonlu Görünüm) */}
                {dependentFields.map(childField => {
                  const requiredValue = childField.dependsOn!.split(':')[1];
                  
                  if (formData[field.key] === requiredValue) {
                    return (
                      <Box 
                        key={childField.key} 
                        sx={{ 
                          mt: 2, 
                          ml: 3, 
                          pl: 2, 
                          borderLeft: '3px solid', 
                          borderColor: 'primary.main',
                          animation: 'fadeIn 0.3s ease-in'
                        }}
                      >
                        <TextField 
                          fullWidth 
                          size="small"
                          label={childField.label} 
                          value={formData[childField.key] || ''} 
                          onChange={(e) => setFormData(p => ({ ...p, [childField.key]: e.target.value }))} 
                        />
                      </Box>
                    );
                  }
                  return null;
                })}
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* ALT BUTONLAR */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<CancelIcon />}
            onClick={handleCancelClick}
          >
            Kataloğa Dön
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentStep > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<ArrowBackIosNewIcon fontSize="small" />}
                onClick={() => setCurrentStep(p => p - 1)}
              >
                Geri
              </Button>
            )}
            
            {currentStep === paginatedSections.length - 1 ? (
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<CheckCircleIcon />}
                onClick={handleComplete}
                sx={{ px: 3 }}
              >
                Dolduruldu Olarak İşaretle
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                endIcon={<ArrowForwardIosIcon fontSize="small" />}
                onClick={() => setCurrentStep(p => p + 1)}
                sx={{ px: 3 }}
              >
                İleri
              </Button>
            )}
          </Box>
        </Box>

      </Paper>
    </Box>
  );
}