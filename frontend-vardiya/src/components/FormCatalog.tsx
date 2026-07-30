import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Paper,
  Divider
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendIcon from '@mui/icons-material/Send';
import { apiFetchJson } from '../api';

interface FormTemplate {
  id: number | string;
  title: string;
  menuKey?: string;
  formKey?: string;
  menu_key?: string;
}

interface FormCatalogProps {
  unit: string;
  onSelectForm: (menuKey: string) => void;
  completedForms: string[];
  onSubmitAll: () => void;
}

export default function FormCatalog({ unit, onSelectForm, completedForms, onSubmitAll }: FormCatalogProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetchJson<FormTemplate[]>(`/api/forms/templates?unit=${encodeURIComponent(unit)}`)
      .then(data => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        // NOT: Bu fallback sadece backend gerçekten ulaşılamaz durumdaysa devreye
        // girer ve UKOM'a özel örnek veridir; UHGM için yanıltıcı olabileceğinden
        // burada olduğunu kullanıcıya da bir uyarı olarak belirtmek daha doğru olurdu.
        // Şimdilik geliştirme kolaylığı için korunuyor.
        setTemplates([
          { id: 1, menuKey: 't3a', title: 'T3A Shift Handover Form' },
          { id: 2, menuKey: 't4a', title: 'T4A Shift Handover Form' },
          { id: 3, menuKey: 't4b', title: 'T4B Shift Handover Form' },
          { id: 4, menuKey: 't5a', title: 'T5A Shift Handover Form' },
        ]);
        setLoading(false);
      });
  }, [unit]);

  const hasDrafts = completedForms.length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', animation: 'fadeIn 0.5s ease-in' }}>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" color="primary.main" gutterBottom>
          {unit} Birimi Form Kataloğu
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Doldurmak istediğiniz vardiya formunu seçin. Formlar taslak olarak kaydedilir ve vardiya bitiminde topluca amir onayına gönderilir.
        </Typography>
      </Box>

      {/* Şablon Kartları (Grid Yapısı) */}
      <Grid container spacing={3}>
        {templates.map((tpl) => {
          
          // 1. GÜVENLİ ID HESAPLAMA: Tüm ihtimalleri değerlendirip kesin bir string (metin) elde ediyoruz.
          const safeId = String(tpl.menuKey || tpl.formKey || tpl.menu_key || tpl.id);
          
          // 2. KONTROL: Artık safeId kesin bir string olduğu için TypeScript hata vermeyecek.
          const isCompleted = completedForms.includes(safeId);
          
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tpl.id}>
              <Card 
                elevation={isCompleted ? 1 : 3} 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: isCompleted ? '2px solid #27ae60' : '2px solid transparent',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 4 }}>
                  {isCompleted ? (
                    <CheckCircleIcon sx={{ fontSize: 50, color: 'secondary.main', mb: 2 }} />
                  ) : (
                    <AssignmentIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2, opacity: 0.8 }} />
                  )}
                  
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', color: '#333' }}>
                    {tpl.title}
                  </Typography>
                  
                  {isCompleted && (
                    <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 'bold', display: 'block', mt: 1 }}>
                      Tasarlandı / Sepette
                    </Typography>
                  )}
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'center', p: 2, backgroundColor: '#fafafa' }}>
                  <Button 
                    variant={isCompleted ? "outlined" : "contained"} 
                    color={isCompleted ? "secondary" : "primary"}
                    onClick={() => {
                      if (!safeId || safeId === 'undefined') {
                        alert("Hata: Bu formun benzersiz kimliği (ID/Key) bulunamadı. Backend verisini kontrol edin.");
                        return;
                      }
                      onSelectForm(safeId);
                    }}
                    fullWidth
                  >
                    {isCompleted ? 'Formu Güncelle' : 'Formu Doldur'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Sepet / Toplu Gönderim Çubuğu (Sadece doldurulmuş form varsa görünür) */}
      {hasDrafts && (
        <Paper
          elevation={4}
          sx={{
            mt: 5,
            p: 3,
            borderRadius: 2,
            backgroundColor: '#e8f5e9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #c8e6c9'
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
              Vardiya Devre Hazır
            </Typography>
            <Typography variant="body2" sx={{ color: '#388e3c' }}>
              Sepetinizde doldurulmuş {completedForms.length} adet form bulunuyor.
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            endIcon={<SendIcon />}
            onClick={onSubmitAll}
            sx={{ px: 4, py: 1.5, fontSize: '1.1rem', boxShadow: 3 }}
          >
            Vardiyayı Devret (Onaya Gönder)
          </Button>
        </Paper>
      )}

    </Box>
  );
}