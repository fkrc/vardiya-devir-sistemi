import { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { AddCircleOutlined as AddCircleOutlineIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import type { CurrentUser, ShiftFormList } from '../types';

interface DashboardProps {
  currentUser: CurrentUser;
  onNewForm: () => void;
  onViewDetail: (id: number) => void;
}

export default function Dashboard({ currentUser, onNewForm, onViewDetail }: DashboardProps) {
  const [formsList, setFormsList] = useState<ShiftFormList[]>([]);

  useEffect(() => {
    fetch('http://localhost:8080/api/forms/list')
      .then(res => res.json())
      .then(data => {
        const filteredData = data.filter((form: any) => {
          if (currentUser.role === 'MANAGER') {
            // Yönetici sadece kendi biriminin formlarını görür
            return form.unitName === currentUser.unit;
          } else {
            // Personel kendi oluşturduğu formları görür.
            // ESKİ KAYIT DESTEĞİ: Eğer formun veritabanında userId'si yoksa (eski test verisiyse), personelin kendi birimindeki formları göster.
            if (form.userId || form.createdById) {
              return form.userId === currentUser.id || form.createdById === currentUser.id;
            }
            return form.unitName === currentUser.unit;
          }
        });
        
        setFormsList(filteredData);
      })
      .catch(err => console.error(err));
  }, [currentUser]);

  const getStatusChip = (status: string) => {
    if (status === 'PENDING_MANAGER_APPROVAL' || status === 'DRAFT') {
      return <Chip label="Yönetici Onayı Bekliyor" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
    }
    return <Chip label="Tamamlandı" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-in' }}>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Typography variant="h5" color="primary.main">
          {currentUser.unit} Vardiya Kayıtları
        </Typography>

        {/* Sadece Personel yeni form başlatabilir */}
        {currentUser.role === 'PERSONNEL' && (
          <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />} onClick={onNewForm} sx={{ boxShadow: 2 }}>
            Yeni Form Başlat
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Birim</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Form Şablonu</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Tarih</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Durum</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Bu birime veya size ait kayıtlı vardiya formu bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              formsList.map((form) => (
                <TableRow key={form.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#f5f5f5' } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: '500' }}>#{form.id}</TableCell>
                  <TableCell>{form.unitName}</TableCell>
                  <TableCell>{form.formTitle}</TableCell>
                  <TableCell>{new Date(form.recordDate).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>{getStatusChip(form.status)}</TableCell>
                  <TableCell align="right">
                    <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={() => onViewDetail(form.id)}>Detay</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}