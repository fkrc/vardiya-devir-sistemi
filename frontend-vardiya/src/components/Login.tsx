import { useState } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Alert, CircularProgress
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
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f8' }}>
      <Card elevation={4} sx={{ maxWidth: 560, width: '100%', borderRadius: 3, mx: 2 }}>
        <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          <Box sx={{ backgroundColor: 'primary.main', p: 2, borderRadius: '50%', display: 'flex', mb: 2, boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)' }}>
            <SatelliteAltIcon sx={{ color: 'white', fontSize: 32 }} />
          </Box>

          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#2c3e50', textAlign: 'center', mb: 4 }}>
            Vardiya Devir Uygulaması
          </Typography>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: '100%' }}>
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
                  gap: 1,
                  borderRadius: 3,
                  boxShadow: 2,
                  '&:hover': { boxShadow: 5 }
                }}
              >
                {loadingUser === username ? (
                  <CircularProgress size={36} color="inherit" />
                ) : (
                  <Icon sx={{ fontSize: 40 }} />
                )}
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {roleLabel}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, lineHeight: 1 }}>
                  {unit}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1 }}>
                  ({username})
                </Typography>
              </Button>
            ))}
          </Box>

        </CardContent>
      </Card>
    </Box>
  );
}