import { useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Alert, CircularProgress, Stack
} from '@mui/material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { CurrentUser } from '../types';
import { apiFetch } from '../api';

interface LoginProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

// Test/demo paneli: gerçek bir şifre giriş formu yerine hızlı giriş butonları
// kullanılıyor, ancak artık bu butonlar da backend'e gerçek şifreyle (BCrypt
// doğrulamalı) istek atıyor. Backend seed verisinde U1/U2/M1/M2 kullanıcılarının
// hepsinin test şifresi "1234"tür (bkz. DatabaseSeeder).
const DEMO_PASSWORD = '1234';

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string) => {
    setLoadingUser(username);
    setError(null);

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password: DEMO_PASSWORD })
      });

      if (res.ok) {
        const data = await res.json();
        const user: CurrentUser = {
          id: data.id,
          username: data.username,
          fullName: data.fullName,
          role: data.role,
          unit: data.unit
        };
        onLoginSuccess(user);
      } else {
        setError("Giriş başarısız! Lütfen Backend'in (Seeder) çalıştığından emin olun.");
      }
    } catch {
      setError("Sunucuya bağlanılamadı. Backend servisinin ayakta olduğunu kontrol edin.");
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' }}>
      <Card elevation={4} sx={{ maxWidth: 450, width: '100%', borderRadius: 3, mx: 2 }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <Box sx={{ backgroundColor: 'primary.main', p: 2, borderRadius: '50%', display: 'flex', mb: 2, boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)' }}>
            <SatelliteAltIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>

          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', mb: 1 }}>
            Uydu Hub Operasyonları
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 4 }}>
            Hızlı Giriş Paneli (Test Modu)
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Stack spacing={2} sx={{ width: '100%' }}>
            {/* PERSONEL GİRİŞLERİ */}
            <Button variant="contained" color="primary" size="large" startIcon={loadingUser === 'U1' ? <CircularProgress size={20} color="inherit" /> : <EngineeringIcon />} onClick={() => handleLogin('U1')} disabled={loadingUser !== null} sx={{ py: 1.5, fontSize: '0.95rem' }}>
              U1 (UHGM Personeli)
            </Button>

            <Button variant="contained" color="info" size="large" startIcon={loadingUser === 'U2' ? <CircularProgress size={20} color="inherit" /> : <EngineeringIcon />} onClick={() => handleLogin('U2')} disabled={loadingUser !== null} sx={{ py: 1.5, fontSize: '0.95rem' }}>
              U2 (UKOM Personeli)
            </Button>

            {/* YÖNETİCİ GİRİŞLERİ */}
            <Button variant="contained" color="warning" size="large" startIcon={loadingUser === 'M1' ? <CircularProgress size={20} color="inherit" /> : <AdminPanelSettingsIcon />} onClick={() => handleLogin('M1')} disabled={loadingUser !== null} sx={{ py: 1.5, fontSize: '0.95rem', mt: 2 }}>
              M1 (UHGM Yöneticisi)
            </Button>

            <Button variant="contained" color="error" size="large" startIcon={loadingUser === 'M2' ? <CircularProgress size={20} color="inherit" /> : <AdminPanelSettingsIcon />} onClick={() => handleLogin('M2')} disabled={loadingUser !== null} sx={{ py: 1.5, fontSize: '0.95rem' }}>
              M2 (UKOM Yöneticisi)
            </Button>
          </Stack>

        </CardContent>
      </Card>
    </Box>
  );
}