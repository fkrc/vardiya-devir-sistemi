import { useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Alert, CircularProgress, Stack
} from '@mui/material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { CurrentUser } from '../types';

interface LoginProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (username: string) => {
    setLoadingUser(username);
    setError(null);

    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      if (res.ok) {
        const data = await res.json();

        const userUnit = data.unit || (username.includes('1') ? 'UHGM' : 'UKOM');
        let rawRole = data.role;
        if (rawRole === 'OPERATOR') rawRole = 'PERSONNEL';
        if (rawRole === 'SUPERVISOR' || rawRole === 'UNIT_MANAGER') rawRole = 'MANAGER';

        const userRole = rawRole || (username.startsWith('M') ? 'MANAGER' : 'PERSONNEL');

        let userFullName = data.fullName;
        if (!userFullName) {
          if (username === 'U1') userFullName = 'UHGM Personeli 1';
          if (username === 'U2') userFullName = 'UKOM Personeli 1';
          if (username === 'M1') userFullName = 'UHGM Yöneticisi';
          if (username === 'M2') userFullName = 'UKOM Yöneticisi';
        }

        const user: CurrentUser = {
          id: data.id || (username === 'U1' ? 1 : username === 'U2' ? 2 : username === 'M1' ? 3 : 4),
          username: data.username || username,
          fullName: userFullName,
          role: userRole,
          unit: userUnit
        };

        onLoginSuccess(user);
      } else {
        // YÖNETİCİLER İÇİN TEST (MOCK) GİRİŞİ: Backend'de M1/M2 yoksa hata verme, sistemi simüle et.
        if (username.startsWith('M')) {
          onLoginSuccess({
            id: username === 'M1' ? 3 : 4,
            username: username,
            fullName: username === 'M1' ? 'UHGM Yöneticisi' : 'UKOM Yöneticisi',
            role: 'MANAGER',
            unit: username === 'M1' ? 'UHGM' : 'UKOM'
          });
        } else {
          setError("Kullanıcı bulunamadı! Lütfen Backend'in (Seeder) çalıştığından emin olun.");
        }
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

          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', mb: 3 }}>
            Vardiya Devir Uygulaması
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