import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:8080/api/forms/${formId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedForm(data);
        
        // DÜZELTME 1: Sabit 'satellite_control' yerine, gelen formun kendi şemasını çekiyoruz.
        const formMenuKey = data.menuKey || data.formDefinition?.menuKey;
        if (formMenuKey) {
          fetch(`http://localhost:8080/api/forms/schema/${formMenuKey}`)
            .then(res => res.json())
            .then(schemaData => {
              if (schemaData && schemaData.schemaJson) {
                setSchema(typeof schemaData.schemaJson === 'string' ? JSON.parse(schemaData.schemaJson) : schemaData.schemaJson);
              }
              setLoading(false);
            })
            .catch(() => {
              console.warn("Şema bulunamadı, varsayılan görünüm kullanılacak.");
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Form verisi çekilemedi:", err);
        setLoading(false);
      });
  }, [formId]);

  const handleAdvanceStatus = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/forms/${formId}/advance-status`, { method: 'POST' });
      if (res.ok) {
        alert("Form başarıyla onaylandı!");
        onSuccess();
      } else {
        alert("Hata: Form onaylanırken sunucu bir hata döndürdü.");
      }
    } catch (err) {
      console.error(err);
      alert("Hata: Sunucuya ulaşılamadı.");
    }
  };

  if (loading || !selectedForm) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const parsedData = typeof selectedForm.formData === 'string' ? JSON.parse(selectedForm.formData) : (selectedForm.formData || {});

  // DÜZELTME 2: Varsayılan statü DRAFT olduğu için DRAFT olanları da onay bekliyor kabul ediyoruz
  const isPending = selectedForm.status === 'PENDING_MANAGER_APPROVAL' || selectedForm.status === 'DRAFT';

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', animation: 'fadeIn 0.5s ease-in', pb: 5 }}>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold', mb: 1 }}>
            Form Detayı (#{selectedForm.id}) {selectedForm.formTitle && `- ${selectedForm.formTitle}`}
          </Typography>
          <Box sx={{ mt: 1 }}>
            {isPending ? (
              <Chip label="Yönetici Onayı Bekliyor" color="warning" sx={{ fontWeight: 'bold' }} />
            ) : (
              <Chip label="Tamamlandı" color="success" sx={{ fontWeight: 'bold' }} />
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          
          {/* Sadece MANAGER yetkisi olanlar onaylayabilir */}
          {isPending && currentUser.role === 'MANAGER' && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<CheckCircleIcon />}
              onClick={handleAdvanceStatus}
              sx={{ boxShadow: 2 }}
            >
              Yönetici Olarak Onayla
            </Button>
          )}
          
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
            Listeye Dön
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        
        {/* DÜZELTME 4: Güvenlik Ağı (Şema varsa normal çiz, yoksa Fallback tablo çiz) */}
        {schema && schema.sections && schema.sections.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {schema.sections.map((sec, idx) => (
              <Box key={idx}>
                <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, borderBottom: '2px solid #ecf0f1', pb: 1 }}>
                  {sec.title}
                </Typography>
                
                {/* MUI v6 Grid Kullanımı */}
                <Grid container spacing={3}>
                  {sec.fields.map(f => {
                    // Şartlı alanlar için kontrol
                    if (f.dependsOn) {
                      const [depKey, depVal] = f.dependsOn.split(':');
                      if (parsedData[depKey] !== depVal) return null;
                    }
                    
                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={f.key}>
                        <Box sx={{ backgroundColor: '#f8f9fa', p: 2, borderRadius: 1, height: '100%' }}>
                          <Typography variant="caption" sx={{ color: '#7f8c8d', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            {f.label}
                          </Typography>
                          <Typography variant="body1" sx={{ color: parsedData[f.key] ? '#2c3e50' : '#bdc3c7', fontWeight: 500 }}>
                            {parsedData[f.key] || 'Boş bırakılmış'}
                          </Typography>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            ))}
          </Box>
        ) : (
          /* FALLBACK: Şema Yoksa Basit Liste Görünümü */
          <Box>
            <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, borderBottom: '2px solid #ecf0f1', pb: 1 }}>
              Form Yanıtları (Varsayılan Görünüm)
            </Typography>
            <Grid container spacing={3}>
              {Object.entries(parsedData).map(([key, value]) => (
                <Grid size={{ xs: 12, sm: 6 }} key={key}>
                  <Box sx={{ backgroundColor: '#f8f9fa', p: 2, borderRadius: 1, height: '100%' }}>
                    <Typography variant="caption" sx={{ color: '#7f8c8d', fontWeight: 'bold', display: 'block', mb: 0.5, textTransform: 'capitalize' }}>
                      {key.replace(/_/g, ' ')}
                    </Typography>
                    <Typography variant="body1" sx={{ color: value ? '#2c3e50' : '#bdc3c7', fontWeight: 500 }}>
                      {value ? String(value) : 'Boş bırakılmış'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

      </Paper>
    </Box>
  );
}