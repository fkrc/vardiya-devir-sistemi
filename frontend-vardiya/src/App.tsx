import { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Typography,
  Box,
  Container,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import type { CurrentUser } from './types';
import { apiFetch, setCurrentUserId } from './api';
import './style.css';

import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FormCatalog from './components/FormCatalog';
import FormWizard from './components/FormWizard';
import FormDetail from './components/FormDetail';

// Operasyonel Kurumsal MUI Teması
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#27ae60' },
    background: { default: '#f4f6f8', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: '8px' },
      },
    },
  },
});

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'catalog' | 'wizard' | 'detail'>('login');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { formData: Record<string, string>; files: File[] }>>({});
  const [editingForm, setEditingForm] = useState<{ id: number; menuKey: string; initialData: Record<string, string> } | null>(null);

  // YENİ: Global Bildirim (Snackbar) State'i
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserId(null);
    setCurrentView('login');
    setDrafts({});
  };

 const handleBatchSubmit = async () => {
    try {
      const promises = Object.entries(drafts).map(([menuKey, draft]) => {
        const body = new FormData();
        body.append('menuKey', menuKey);
        body.append('formData', JSON.stringify(draft.formData));
        body.append('userId', String(currentUser?.id));
        draft.files.forEach(file => body.append('files', file));

        return apiFetch('/api/forms/submit', {
          method: 'POST',
          body
        }).then(res => {
          if (!res.ok) throw new Error("Backend'e kayıt başarısız oldu.");
          return res;
        });
      });

      await Promise.all(promises);
      
      showNotification('Tüm formlar başarıyla Yönetici onayına gönderildi!', 'success');
      
      setDrafts({}); 
      setCurrentView('dashboard'); 
    } catch (error) {
      console.error(error);
      // ESKİ: alert('Formlar gönderilirken bir hata oluştu!');
      // YENİ: Şık hata bildirimi
      showNotification('Formlar gönderilirken bir hata oluştu! Lütfen konsolu kontrol edin.', 'error');
    }
  };

  // EKRAN: LOGIN
  if (currentView === 'login') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentUserId(user.id);
          setCurrentView('dashboard');
          showNotification(`Hoş geldin, ${user.fullName}`, 'info');
        }} />
        
        {/* Login ekranı için de bildirimleri aktif ediyoruz */}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    );
  }

  if (!currentUser) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        <Header currentUser={currentUser} onLogout={handleLogout} />

        <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, py: 4, display: 'flex', flexDirection: 'column' }}>
          
          {currentView === 'dashboard' && (
            <Dashboard 
              currentUser={currentUser} 
              onNewForm={() => setCurrentView('catalog')} 
              onViewDetail={(id) => { setSelectedFormId(id); setCurrentView('detail'); }} 
            />
          )}

          {currentView === 'catalog' && (
            <FormCatalog 
              unit={currentUser.unit || 'UKOM'} 
              onSelectForm={(formId) => {
                setActiveTemplateId(formId);
                setCurrentView('wizard');
              }}
              completedForms={Object.keys(drafts)} 
              onSubmitAll={handleBatchSubmit} 
            />
          )}

          {currentView === 'wizard' && (
            editingForm ? (
              <FormWizard
                formId={editingForm.menuKey}
                initialData={editingForm.initialData}
                submitLabel="Tekrar Onaya Gönder"
                cancelLabel="Vazgeç"
                onCancel={() => {
                  setEditingForm(null);
                  setCurrentView('dashboard');
                }}
                onSuccess={async (formData, files) => {
                  try {
                    const body = new FormData();
                    body.append('formData', JSON.stringify(formData));
                    files.forEach(file => body.append('files', file));

                    const res = await apiFetch(`/api/forms/${editingForm.id}`, {
                      method: 'PUT',
                      body
                    });
                    if (!res.ok) {
                      const text = await res.text().catch(() => '');
                      throw new Error(text || "Form güncellenirken bir hata oluştu.");
                    }
                    showNotification('Form güncellendi ve tekrar Yönetici onayına gönderildi!', 'success');
                  } catch (err: any) {
                    console.error(err);
                    showNotification(err.message || 'Form güncellenirken bir hata oluştu!', 'error');
                  } finally {
                    setEditingForm(null);
                    setCurrentView('dashboard');
                  }
                }}
              />
            ) : activeTemplateId ? (
              <FormWizard
                formId={activeTemplateId}
                onCancel={() => setCurrentView('catalog')}
                onSuccess={(formData, files) => {
                  setDrafts(prev => ({ ...prev, [activeTemplateId]: { formData, files } }));
                  setActiveTemplateId(null);
                  setCurrentView('catalog');
                  // Sepete ekleme bildirimi
                  showNotification('Form taslağı başarıyla sepete eklendi!', 'success');
                }}
              />
            ) : (
              <Box sx={{ mt: 5, textAlign: 'center' }}>
                <Typography variant="h5" color="error">Sistemsel bir hata oluştu!</Typography>
                <Typography variant="body1">Seçilen formun ID'si algılanamadı.</Typography>
                <Button sx={{ mt: 2 }} variant="outlined" onClick={() => setCurrentView('catalog')}>Kataloga Dön</Button>
              </Box>
            )
          )}

          {currentView === 'detail' && selectedFormId && (
            <FormDetail
              formId={selectedFormId}
              currentUser={currentUser}
              onBack={() => setCurrentView('dashboard')}
              onNotify={showNotification}
              onSuccess={() => {
                // Bildirim FormDetail içinde (onayla/reddet'e özel mesajla) zaten gösterildi.
                setCurrentView('dashboard');
              }}
              onEditRejected={(id, menuKey, initialData) => {
                setEditingForm({ id, menuKey, initialData });
                setCurrentView('wizard');
              }}
            />
          )}
          
        </Container>
      </Box>

      {/* TÜM UYGULAMA İÇİN ORTAK BİLDİRİM (SNACKBAR) KUTUSU */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%', boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </ThemeProvider>
  );
}