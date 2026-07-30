import { useState, useEffect, useMemo } from 'react';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, Pagination } from '@mui/material';
import { AddCircleOutlined as AddCircleOutlineIcon, Visibility as VisibilityIcon, FilterAlt as FilterAltIcon } from '@mui/icons-material';
import type { CurrentUser, ShiftFormList } from '../types';
import { apiFetchJson } from '../api';

interface DashboardProps {
  currentUser: CurrentUser;
  onNewForm: () => void;
  onViewDetail: (id: number) => void;
}

const ALL_TEMPLATES = '__ALL__';
const PAGE_SIZE = 10;

export default function Dashboard({ currentUser, onNewForm, onViewDetail }: DashboardProps) {
  const [formsList, setFormsList] = useState<ShiftFormList[]>([]);
  const [templateFilter, setTemplateFilter] = useState<string>(ALL_TEMPLATES);
  const [page, setPage] = useState(1);

  useEffect(() => {
    // NOT: Rol/birim filtresi artık sunucu tarafında uygulanıyor
    // (X-User-Id header'ı apiFetch tarafından otomatik ekleniyor, backend
    // bu id'ye göre gerçek rol/birimi DB'den okuyup listeyi süzüyor).
    // Liste ayrıca backend tarafından "onay/işlem bekleyenler önce, her grup
    // içinde en yeni kayıt en üstte" olacak şekilde sıralanmış gelir.
    apiFetchJson<ShiftFormList[]>('/api/forms/list')
      .then(setFormsList)
      .catch(err => console.error(err));
  }, [currentUser]);

  // Şablon filtresi seçenekleri: listede fiilen bulunan form şablonlarından türetilir.
  const templateOptions = useMemo(() => {
    const seen = new Map<string, string>();
    formsList.forEach(f => {
      const key = f.menuKey || f.formTitle;
      if (!seen.has(key)) seen.set(key, f.formTitle);
    });
    return Array.from(seen.entries()).map(([key, title]) => ({ key, title }));
  }, [formsList]);

  const visibleForms = useMemo(() => {
    if (templateFilter === ALL_TEMPLATES) return formsList;
    return formsList.filter(f => (f.menuKey || f.formTitle) === templateFilter);
  }, [formsList, templateFilter]);

  // Filtre değiştiğinde veya liste yenilendiğinde sayfa numarasını başa al.
  useEffect(() => {
    setPage(1);
  }, [templateFilter, formsList]);

  const pageCount = Math.max(1, Math.ceil(visibleForms.length / PAGE_SIZE));
  const pagedForms = useMemo(
    () => visibleForms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleForms, page]
  );

  const getStatusChip = (status: string) => {
    if (status === 'PENDING_MANAGER_APPROVAL' || status === 'DRAFT') {
      return <Chip label="Yönetici Onayı Bekliyor" color="warning" size="small" sx={{ fontWeight: 'bold' }} />;
    }
    if (status === 'REJECTED') {
      return <Chip label="Reddedildi (Düzenleme Gerekli)" color="error" size="small" sx={{ fontWeight: 'bold' }} />;
    }
    return <Chip label="Tamamlandı" color="success" size="small" sx={{ fontWeight: 'bold' }} />;
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeIn 0.5s ease-in' }}>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0 }}>
        <Typography variant="h5" color="primary.main">
          {currentUser.unit} Vardiya Devir Kayıtları
        </Typography>

        {/* Sadece Personel yeni form başlatabilir */}
        {currentUser.role === 'PERSONNEL' && (
          <Button variant="contained" color="primary" startIcon={<AddCircleOutlineIcon />} onClick={onNewForm} sx={{ boxShadow: 2 }}>
            Yeni Form Başlat
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexShrink: 0 }}>
        <FilterAltIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="template-filter-label">Form Şablonu</InputLabel>
          <Select
            labelId="template-filter-label"
            label="Form Şablonu"
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
          >
            <MenuItem value={ALL_TEMPLATES}>Tüm Şablonlar</MenuItem>
            {templateOptions.map(opt => (
              <MenuItem key={opt.key} value={opt.key}>{opt.title}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <Table stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Birim</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Form Adı</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Oluşturan</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Tarih</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>Durum</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: '#555', backgroundColor: '#f8f9fa' }}>İşlem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleForms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {formsList.length === 0
                    ? 'Bu birime veya size ait kayıtlı vardiya formu bulunmuyor.'
                    : 'Seçili şablona ait kayıtlı vardiya formu bulunmuyor.'}
                </TableCell>
              </TableRow>
            ) : (
              pagedForms.map((form) => (
                <TableRow key={form.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: '#f5f5f5' } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: '500' }}>#{form.id}</TableCell>
                  <TableCell>{form.unitName}</TableCell>
                  <TableCell>{form.formTitle}</TableCell>
                  <TableCell>{form.createdByName || '-'}</TableCell>
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

      {pageCount > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, flexShrink: 0 }}>
          <Pagination
            count={pageCount}
            page={page}
            onChange={(_e, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}