import { useEffect, useState } from 'react';
import { Box, Typography, Paper, IconButton, Dialog, CircularProgress } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import type { Attachment } from '../types';
import { apiFetch } from '../api';

interface AttachmentGalleryProps {
  attachments: Attachment[];
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentGallery({ attachments }: AttachmentGalleryProps) {
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Ek görsellerin küçük resimleri: indirme uç noktası X-User-Id header'ı
  // gerektirdiği için düz <img src="..."> kullanılamıyor; blob olarak çekilip
  // object URL'e çevriliyor.
  useEffect(() => {
    const imageAttachments = attachments.filter(a => a.contentType?.startsWith('image/'));
    let cancelled = false;
    const objectUrls: string[] = [];

    imageAttachments.forEach(async (att) => {
      try {
        const res = await apiFetch(`/api/forms/attachments/${att.id}`);
        if (!res.ok) return;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        if (!cancelled) setPreviews(prev => ({ ...prev, [att.id]: url }));
      } catch {
        // Önizleme yüklenemezse sessizce yoksay; dosya yine de indirilebilir.
      }
    });

    return () => {
      cancelled = true;
      objectUrls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [attachments]);

  const handleDownload = async (att: Attachment) => {
    setDownloadingId(att.id);
    try {
      const res = await apiFetch(`/api/forms/attachments/${att.id}`);
      if (!res.ok) throw new Error('İndirme başarısız oldu.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = att.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2, mt: 3 }}>
      <Typography variant="h6" sx={{ color: '#2c3e50', mb: 2, borderBottom: '2px solid #ecf0f1', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AttachFileIcon fontSize="small" color="primary" />
        Ekler ({attachments.length})
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
        {attachments.map(att => {
          const isImage = !!att.contentType?.startsWith('image/');
          return (
            <Paper
              key={att.id}
              variant="outlined"
              sx={{ borderRadius: 2, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <Box
                onClick={() => isImage && previews[att.id] && setLightbox(previews[att.id])}
                sx={{
                  height: 110,
                  backgroundColor: '#f4f6f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isImage && previews[att.id] ? 'pointer' : 'default',
                  overflow: 'hidden'
                }}
              >
                {isImage ? (
                  previews[att.id] ? (
                    <Box component="img" src={previews[att.id]} alt={att.fileName} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CircularProgress size={22} />
                  )
                ) : (
                  <InsertDriveFileIcon sx={{ fontSize: 40, color: '#94a3b8' }} />
                )}
              </Box>
              <Box sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.fileName}>
                    {att.fileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(att.fileSize)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => handleDownload(att)} disabled={downloadingId === att.id} aria-label={`${att.fileName} dosyasını indir`}>
                  {downloadingId === att.id ? <CircularProgress size={16} /> : <DownloadIcon fontSize="small" />}
                </IconButton>
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth="md">
        <Box sx={{ position: 'relative', backgroundColor: '#000', lineHeight: 0 }}>
          <IconButton
            onClick={() => setLightbox(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' } }}
          >
            <CloseIcon />
          </IconButton>
          {lightbox && (
            <Box component="img" src={lightbox} alt="Önizleme" sx={{ maxWidth: '90vw', maxHeight: '85vh', display: 'block' }} />
          )}
        </Box>
      </Dialog>
    </Paper>
  );
}
