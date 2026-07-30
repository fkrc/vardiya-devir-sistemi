import { AppBar, Toolbar, Box, Typography, Avatar, Chip, IconButton, Tooltip, Divider } from '@mui/material';
import SatelliteAltIcon from '@mui/icons-material/SatelliteAlt';
import LogoutIcon from '@mui/icons-material/Logout';
import type { CurrentUser } from '../types';

interface HeaderProps {
  currentUser: CurrentUser;
  onLogout: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Yönetici',
  PERSONNEL: 'Personel',
};

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Header({ currentUser, onLogout }: HeaderProps) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: 'linear-gradient(120deg, #1976d2 0%, #135ba1 55%, #0d3f73 100%)',
        boxShadow: '0 4px 20px rgba(13, 63, 115, 0.25)',
      }}
    >
      <Toolbar sx={{ py: 1, gap: 2 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.15)',
            flexShrink: 0,
          }}
        >
          <SatelliteAltIcon sx={{ color: '#fff', fontSize: 24 }} />
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" component="div" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
            Vardiya Devir Uygulaması
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 }}>
            Uydu Kontrol Vardiya Sistemi
          </Typography>
        </Box>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: 'rgba(255,255,255,0.2)', display: { xs: 'none', sm: 'block' } }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 38,
              height: 38,
              backgroundColor: 'secondary.main',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            {getInitials(currentUser.fullName)}
          </Avatar>

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
              {currentUser.fullName}
            </Typography>
            <Chip
              label={`${ROLE_LABELS[currentUser.role] || currentUser.role}${currentUser.unit ? ` · ${currentUser.unit}` : ''}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#fff',
              }}
            />
          </Box>

          <Tooltip title="Çıkış Yap">
            <IconButton
              onClick={onLogout}
              sx={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.7)' },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
