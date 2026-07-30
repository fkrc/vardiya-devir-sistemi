import { useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Alert, CircularProgress
} from '@mui/material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import type { CurrentUser } from '../types';
import { apiFetch } from '../api';
import EarthScene from '../three/EarthScene';

interface LoginProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

// Test/demo paneli: gerçek bir şifre giriş formu yerine hızlı giriş butonları
// kullanılıyor, ancak artık bu butonlar da backend'e gerçek şifreyle (BCrypt
// doğrulamalı) istek atıyor. Backend seed verisinde U1/U2/M1/M2 kullanıcılarının
// hepsinin test şifresi "1234"tür (bkz. DatabaseSeeder).
const DEMO_PASSWORD = '1234';

const LOGIN_USERS = [
  { username: 'U1', unit: 'UHGM', roleLabel: 'Personel', icon: EngineeringIcon, color: 'primary' as const },
  { username: 'U2', unit: 'UKOM', roleLabel: 'Personel', icon: EngineeringIcon, color: 'info' as const },
  { username: 'M1', unit: 'UHGM', roleLabel: 'Yönetici', icon: AdminPanelSettingsIcon, color: 'warning' as const },
  { username: 'M2', unit: 'UKOM', roleLabel: 'Yönetici', icon: AdminPanelSettingsIcon, color: 'error' as const },
];

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
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#02030a' }}>
      {/* Arka planda: yıldız alanı, Dünya ve yörüngedeki uydular (Three.js) */}
      <EarthScene />

      {/* Ön planda: giriş paneli, ekranın sol tarafına kaydırılmış */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'center', md: 'flex-start' },
          pl: { xs: 2, md: '6vw' },
          pr: 2
        }}
      >
        <Card
          elevation={0}
          sx={{
            maxWidth: 460,
            width: '100%',
            borderRadius: 4,
            backgroundColor: 'rgba(13, 20, 38, 0.55)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(38,131,255,0.08)'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            <Box
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #22d3ee 100%)',
                p: 1.75,
                borderRadius: '50%',
                display: 'flex',
                mb: 2,
                boxShadow: '0 4px 20px rgba(34, 211, 238, 0.35)'
              }}
            >
              <SatelliteAltIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>

            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#fff', textAlign: 'center', mb: 0.5 }}>
              Vardiya Devir Uygulaması
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', mb: 3.5 }}>
              Uydu Kontrol Vardiya Sistemi
            </Typography>

            {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, width: '100%' }}>
              {LOGIN_USERS.map(({ username, unit, roleLabel, icon: Icon, color }) => (
                <Button
                  key={username}
                  variant="contained"
                  color={color}
                  onClick={() => handleLogin(username)}
                  disabled={loadingUser !== null}
                  sx={{
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 0.75,
                    borderRadius: 3,
                    boxShadow: 2,
                    '&:hover': { boxShadow: 5 }
                  }}
                >
                  {loadingUser === username ? (
                    <CircularProgress size={32} color="inherit" />
                  ) : (
                    <Icon sx={{ fontSize: 34 }} />
                  )}
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                    {roleLabel}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.85, lineHeight: 1 }}>
                    {unit}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1, fontSize: '0.65rem' }}>
                    ({username})
                  </Typography>
                </Button>
              ))}
            </Box>

          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
