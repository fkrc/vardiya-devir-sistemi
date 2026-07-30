import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { CurrentUser, FormSchema } from '../types';
import { apiFetch, apiFetchJson } from '../api';
import AttachmentGallery from './AttachmentGallery';

interface FormDetailProps {
  formId: number;
  currentUser: CurrentUser;
  onBack: () => void;
  onSuccess: () => void;
  onNotify: (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
  onEditRejected: (formId: number, menuKey: string, initialData: Record<string, string>) => void;
}

export default function FormDetail({ formId, currentUser, onBack, onSuccess, onNotify, onEditRejected }: FormDetailProps) {
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    apiFetchJson<any>(`/api/forms/${formId}`)
      .then(data => {
        setSelectedForm(data);

        const formMenuKey = data.menuKey || data.formDefinition?.menuKey;
        if (formMenuKey) {
          apiFetchJson<any>(`/api/forms/schema/${formMenuKey}`)
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
        onNotify('Form verisi çekilemedi ya da bu formu görüntüleme yetkiniz yok.', 'error');
        setLoading(false);
      });
  }, [formId, onNotify]);

  const handleAdvanceStatus = async () => {
    try {
      const res = await apiFetch(`/api/forms/${formId}/advance-status`, { method: 'POST' });
      if (res.ok) {
        onNotify('Form başarıyla onaylandı!', 'success');
        onSuccess();
      } else {
        const text = await res.text().catch(() => '');
        onNotify(text || 'Hata: Form onaylanırken sunucu bir hata döndürdü.', 'error');
      }
    } catch (err) {
      console.error(err);
      onNotify('Hata: Sunucuya ulaşılamadı.', 'error');
    }
  };

  const handleRejectConfirm = async () => {
    setRejecting(true);
    try {
      const res = await apiFetch(`/api/forms/${formId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectReason })
      });
      if (res.ok) {
        onNotify('Form reddedildi ve personele düzenlemesi için geri gönderildi.', 'success');
        setRejectDialogOpen(false);
        setRejectReason('');
        onSuccess();
      } else {
        const text = await res.text().catch(() => '');
        onNotify(text || 'Hata: Form reddedilirken sunucu bir hata döndürdü.', 'error');
      }
    } catch (err) {
      console.error(err);
      onNotify('Hata: Sunucuya ulaşılamadı.', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await apiFetch(`/api/forms/${formId}/pdf`);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'PDF indirilemedi.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `vardiya-formu-${formId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      onNotify(err.message || 'PDF indirilirken bir hata oluştu.', 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleEditRejected = () => {
    const formMenuKey = selectedForm.menuKey || selectedForm.formDefinition?.menuKey;
    if (!formMenuKey) {
      onNotify('Bu formun şablon bilgisi bulunamadığı için düzenlenemiyor.', 'error');
      return;
    }
    onEditRejected(selectedForm.id, formMenuKey, parsedData);
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
  const isRejected = selectedForm.status === 'REJECTED';
  const isOwner = selectedForm.createdById === currentUser.id;

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', animation: 'fadeIn 0.5s ease-in', pb: 5 }}>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold', mb: 1 }}>
            Form Detayı (#{selectedForm.id}) {selectedForm.formTitle && `- ${selectedForm.formTitle}`}
          </Typography>
          {selectedForm.createdByName && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Oluşturan: {selectedForm.createdByName}
            </Typography>
          )}
          <Box sx={{ mt: 1 }}>
            {isPending && <Chip label="Yönetici Onayı Bekliyor" color="warning" sx={{ fontWeight: 'bold' }} />}
            {isRejected && <Chip label="Reddedildi (Düzenleme Gerekli)" color="error" sx={{ fontWeight: 'bold' }} />}
            {!isPending && !isRejected && <Chip label="Tamamlandı" color="success" sx={{ fontWeight: 'bold' }} />}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>

          {/* Sadece MANAGER yetkisi olanlar onaylayabilir/reddedebilir */}
          {isPending && currentUser.role === 'MANAGER' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleAdvanceStatus}
                sx={{ boxShadow: 2 }}
              >
                Yönetici Olarak Onayla
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setRejectDialogOpen(true)}
              >
                Reddet
              </Button>
            </>
          )}

          {/* Reddedilen formu sadece sahibi düzenleyip tekrar gönderebilir */}
          {isRejected && isOwner && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<EditIcon />}
              onClick={handleEditRejected}
              sx={{ boxShadow: 2 }}
            >
              Düzenle ve Tekrar Gönder
            </Button>
          )}

          {/* Onaylanmış formlar arşiv amaçlı PDF olarak indirilebilir */}
          {!isPending && !isRejected && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={downloadingPdf ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              sx={{ boxShadow: 2 }}
            >
              PDF İndir
            </Button>
          )}

          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBack}>
            Listeye Dön
          </Button>
        </Box>
      </Box>

      {isRejected && selectedForm.rejectionReason && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Reddedilme gerekçesi:</strong> {selectedForm.rejectionReason}
        </Alert>
      )}

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

      <AttachmentGallery attachments={selectedForm.attachments || []} />

      <Dialog open={rejectDialogOpen} onClose={() => !rejecting && setRejectDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Formu Reddet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bu form personele geri gönderilecek. İsteğe bağlı olarak bir gerekçe belirtebilirsiniz.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Reddetme gerekçesi (opsiyonel)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} disabled={rejecting}>Vazgeç</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={rejecting}
            startIcon={rejecting ? <CircularProgress size={16} color="inherit" /> : <CancelIcon />}
          >
            Formu Reddet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}