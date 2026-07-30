import { useState } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Container, 
  Chip, 
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import type { CurrentUser } from './types';
import './style.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FormCatalog from './components/FormCatalog'; 
import FormWizard from './components/FormWizard';
import FormDetail from './components/FormDetail';


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
  const [drafts, setDrafts] = useState<Record<string, any>>({});

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
    setCurrentView('login');
    setDrafts({}); 
  };

 const handleBatchSubmit = async () => {
    try {
      const promises = Object.entries(drafts).map(([formId, formData]) => {
        // YENİ: currentUser.id payload'a eklendi!
        const payload = { 
          menuKey: formId, 
          formData, 
          userId: currentUser?.id 
        };
        
        return fetch('http://localhost:8080/api/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
        
        <AppBar position="sticky" elevation={1} sx={{ backgroundColor: '#fff', color: '#333' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main' }}>
              Uydu Kontrol Vardiya Sistemi
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip label={currentUser.unit || 'BİLİNMİYOR'} size="small" color="primary" variant="outlined" />
              <Typography variant="body2" sx={{ fontWeight: '500' }}>
                {currentUser.fullName} ({currentUser.role})
              </Typography>
              <Button color="error" size="small" endIcon={<LogoutIcon />} onClick={handleLogout}>
                Çıkış
              </Button>
            </Box>
          </Toolbar>
        </AppBar>

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
            activeTemplateId ? (
              <FormWizard 
                formId={activeTemplateId} 
                onCancel={() => setCurrentView('catalog')} 
                onSuccess={(formData) => {
                  setDrafts(prev => ({ ...prev, [activeTemplateId]: formData }));
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
              onSuccess={() => {
                setCurrentView('dashboard');
                // Onaylama bildirimi
                showNotification('Form başarıyla Yönetici tarafından onaylandı!', 'success');
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