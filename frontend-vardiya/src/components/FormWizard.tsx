import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  LinearProgress,
  Divider,
  Alert,
  Tooltip,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { Field, FieldHistoryEntry, FormSchema, Section } from '../types';
import { apiFetchJson } from '../api';

interface FormWizardProps {
  formId: string;
  onCancel: () => void;
  onSuccess: (formData: Record<string, string>, files: File[]) => void;
  initialData?: Record<string, string>;
  submitLabel?: string;
  cancelLabel?: string;
}

const MAX_FIELDS_PER_STEP = 2;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Backend ile aynı limit (10MB/dosya)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Bir alanın geçmiş değerlerinin (rehber verisi) yüklenme durumu.
interface FieldHistoryState {
  loading: boolean;
  entries: FieldHistoryEntry[] | null;
  error?: string;
}

export default function FormWizard({ formId, onCancel, onSuccess, initialData, submitLabel, cancelLabel }: FormWizardProps) {
  const [rawSchema, setRawSchema] = useState<FormSchema | null>(null);
  const [paginatedSections, setPaginatedSections] = useState<Section[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Alan bazlı "geçmiş girişler" (rehber) verisi. Her alan ilk kez hover
  // edildiğinde lazy olarak yüklenir ve burada key: fieldKey olarak cache'lenir.
  const [fieldHistory, setFieldHistory] = useState<Record<string, FieldHistoryState>>({});

  const loadFieldHistory = (fieldKey: string) => {
    setFieldHistory(prev => {
      if (prev[fieldKey]) return prev; // zaten yüklendi veya yükleniyor
      return { ...prev, [fieldKey]: { loading: true, entries: null } };
    });

    apiFetchJson<FieldHistoryEntry[]>(`/api/forms/${formId}/field-history/${fieldKey}?days=10`)
      .then(entries => {
        setFieldHistory(prev => ({ ...prev, [fieldKey]: { loading: false, entries } }));
      })
      .catch(() => {
        setFieldHistory(prev => ({
          ...prev,
          [fieldKey]: { loading: false, entries: null, error: 'Geçmiş veriler yüklenemedi.' }
        }));
      });
  };

  useEffect(() => {
    apiFetchJson<any>(`/api/forms/schema/${formId}`)
      .then(data => {
        // Veriyi güvenli parse etme
        let parsed: FormSchema;
        if (data && data.schemaJson) {
          parsed = typeof data.schemaJson === 'string'
            ? JSON.parse(data.schemaJson)
            : data.schemaJson;
        } else {
          parsed = data;
        }

        if (!parsed || !parsed.sections) {
           console.warn("DİKKAT: Şema içinde 'sections' dizisi bulunamadı!");
           return;
        }

        const fixedSections: Section[] = [];
        parsed.sections.forEach(sec => {
          const safeFields = sec.fields || [];
          const mainFields = safeFields.filter(f => !f.dependsOn);

          if (mainFields.length <= MAX_FIELDS_PER_STEP) {
            fixedSections.push({ title: sec.title, fields: mainFields });
          } else {
            const totalParts = Math.ceil(mainFields.length / MAX_FIELDS_PER_STEP);
            for (let i = 0; i < mainFields.length; i += MAX_FIELDS_PER_STEP) {
              fixedSections.push({
                title: `${sec.title} (Kısım ${Math.floor(i / MAX_FIELDS_PER_STEP) + 1}/${totalParts})`,
                fields: mainFields.slice(i, i + MAX_FIELDS_PER_STEP)
              });
            }
          }
        });

        setPaginatedSections(fixedSections);
        setRawSchema(parsed);
        setCurrentStep(0);
        setFormData(initialData || {});
        setFieldHistory({});
      })
      .catch(err => {
        console.error("Şema yüklenirken hata:", err);
        setError(err.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const handleComplete = () => {
    onSuccess(formData, attachedFiles); // Veriyi (ve varsa ekleri) doğrudan App.tsx'teki sepete yolla
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setCancelDialogOpen(false);
    onCancel();
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const oversized = incoming.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      setFileError(`${oversized.map(f => f.name).join(', ')} dosyası 10MB sınırını aşıyor ve eklenemedi.`);
    } else {
      setFileError(null);
    }
    const accepted = incoming.filter(f => f.size <= MAX_FILE_SIZE_BYTES);
    setAttachedFiles(prev => [...prev, ...accepted]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Alert severity="error" variant="filled">Hata: {error}</Alert>
      </Box>
    );
  }

  if (!rawSchema || paginatedSections.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentSection = paginatedSections[currentStep];
  const allFields = rawSchema.sections.flatMap(s => s.fields);
  const progressPercent = ((currentStep + 1) / paginatedSections.length) * 100;

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', animation: 'fadeIn 0.5s ease-in', pb: 5 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        
        {/* ÜST BİLGİ VE İLERLEME ÇUBUĞU */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold' }}>
              {currentSection.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 600 }}>
              Adım {currentStep + 1} / {paginatedSections.length}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercent} 
            sx={{ height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' }} 
          />
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* FORM ALANLARI */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minHeight: '30vh' }}>
          {currentSection.fields.map((field) => {
            
            // Bu ana soruya bağlı olan alt soruları bul
            const dependentFields = allFields.filter(f => f.dependsOn && f.dependsOn.startsWith(field.key + ':'));

            return (
              <Box key={field.key}>
                {/* 1. ANA SORU */}
                <FormControl fullWidth component="fieldset">
                  
                  {field.type === 'text' || field.type === 'number' ? (
                    <TextField
                      fullWidth
                      type={field.type}
                      label={field.label}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      variant="outlined"
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              <FieldHistoryButton
                                field={field}
                                historyState={fieldHistory[field.key]}
                                onOpen={() => loadFieldHistory(field.key)}
                              />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  ) : field.type === 'textarea' ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label={field.label}
                      value={formData[field.key] || ''}
                      onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      variant="outlined"
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                              <FieldHistoryButton
                                field={field}
                                historyState={fieldHistory[field.key]}
                                onOpen={() => loadFieldHistory(field.key)}
                              />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  ) : field.type === 'radio' && field.options ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {field.label}
                        </FormLabel>
                        <FieldHistoryButton
                          field={field}
                          historyState={fieldHistory[field.key]}
                          onOpen={() => loadFieldHistory(field.key)}
                        />
                      </Box>
                      <RadioGroup
                        value={formData[field.key] || ''}
                        onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))}
                      >
                        {field.options.map((opt) => (
                          <FormControlLabel key={opt} value={opt} control={<Radio color="primary" />} label={opt} />
                        ))}
                      </RadioGroup>
                    </>
                  ) : field.type === 'checkbox_group' && field.options ? (
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel sx={{ fontWeight: 500, color: 'text.primary' }}>
                          {field.label}
                        </FormLabel>
                        <FieldHistoryButton
                          field={field}
                          historyState={fieldHistory[field.key]}
                          onOpen={() => loadFieldHistory(field.key)}
                        />
                      </Box>
                      <FormGroup>
                        {field.options.map((opt) => (
                          <FormControlLabel
                            key={opt}
                            control={
                              <Checkbox
                                checked={formData[field.key] === opt}
                                onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.checked ? opt : '' }))}
                                color="primary"
                              />
                            }
                            label={opt}
                          />
                        ))}
                      </FormGroup>
                    </>
                  ) : null}
                </FormControl>

                {/* 2. DİNAMİK ALT SORULAR (Animasyonlu Görünüm) */}
                {dependentFields.map(childField => {
                  const requiredValue = childField.dependsOn!.split(':')[1];
                  
                  if (formData[field.key] === requiredValue) {
                    return (
                      <Box 
                        key={childField.key} 
                        sx={{ 
                          mt: 2, 
                          ml: 3, 
                          pl: 2, 
                          borderLeft: '3px solid', 
                          borderColor: 'primary.main',
                          animation: 'fadeIn 0.3s ease-in'
                        }}
                      >
                        <TextField
                          fullWidth
                          size="small"
                          label={childField.label}
                          value={formData[childField.key] || ''}
                          onChange={(e) => setFormData(p => ({ ...p, [childField.key]: e.target.value }))}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <FieldHistoryButton
                                    field={childField}
                                    historyState={fieldHistory[childField.key]}
                                    onOpen={() => loadFieldHistory(childField.key)}
                                  />
                                </InputAdornment>
                              )
                            }
                          }}
                        />
                      </Box>
                    );
                  }
                  return null;
                })}
              </Box>
            );
          })}
        </Box>

        {/* DOSYA EKLEME BÖLÜMÜ: Formun en sonunda, gerektiğinde belge/görsel eklenebilir */}
        {currentStep === paginatedSections.length - 1 && (
          <>
            <Divider sx={{ my: 4 }} />
            <Box>
              <Typography variant="h6" sx={{ color: '#2c3e50', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachFileIcon fontSize="small" color="primary" />
                Dosya Ekleme
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Gerekli görüyorsanız, bu formla ilgili belge veya fotoğrafları ekleyebilirsiniz (opsiyonel, dosya başına en fazla 10MB).
              </Typography>

              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                sx={{ borderStyle: 'dashed', py: 1.5, px: 3 }}
              >
                Dosya Seç
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={(e) => {
                    handleFilesSelected(e.target.files);
                    e.target.value = '';
                  }}
                />
              </Button>

              {fileError && <Alert severity="warning" sx={{ mt: 2 }}>{fileError}</Alert>}

              {attachedFiles.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  {attachedFiles.map((file, idx) => (
                    <Box
                      key={`${file.name}-${idx}`}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #eef1f4'
                      }}
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon color="primary" />
                      ) : (
                        <InsertDriveFileIcon color="action" />
                      )}
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(file.size)}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleRemoveFile(idx)} aria-label={`${file.name} dosyasını kaldır`}>
                        <DeleteOutlineIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </>
        )}

        <Divider sx={{ my: 4 }} />

        {/* ALT BUTONLAR */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<CancelIcon />}
            onClick={handleCancelClick}
          >
            {cancelLabel || 'Kataloğa Dön'}
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {currentStep > 0 && (
              <Button 
                variant="outlined" 
                startIcon={<ArrowBackIosNewIcon fontSize="small" />}
                onClick={() => setCurrentStep(p => p - 1)}
              >
                Geri
              </Button>
            )}
            
            {currentStep === paginatedSections.length - 1 ? (
              <Button 
                variant="contained" 
                color="secondary" 
                startIcon={<CheckCircleIcon />}
                onClick={handleComplete}
                sx={{ px: 3 }}
              >
                {submitLabel || 'Dolduruldu Olarak İşaretle'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                endIcon={<ArrowForwardIosIcon fontSize="small" />}
                onClick={() => setCurrentStep(p => p + 1)}
                sx={{ px: 3 }}
              >
                İleri
              </Button>
            )}
          </Box>
        </Box>

      </Paper>

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Formdan Çıkılsın mı?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Bu forma ait kaydedilmemiş veriler silinecek. Çıkmak istediğinize emin misiniz?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)}>Vazgeç</Button>
          <Button variant="contained" color="error" startIcon={<CancelIcon />} onClick={handleConfirmCancel}>
            Evet, Çık
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// REHBER BUTONU: Alanın yanındaki küçük "i" ikonu. Üzerine gelindiğinde
// (Tooltip onOpen), bu alana son 10 gün içinde girilmiş değerleri backend'den
// çeker ve listeler. Amaç, formu dolduran kişiye "genelde buraya ne yazılıyor"
// konusunda bir rehber sağlamak.
function FieldHistoryButton({
  field,
  historyState,
  onOpen
}: {
  field: Field;
  historyState?: FieldHistoryState;
  onOpen: () => void;
}) {
  const renderContent = () => {
    if (!historyState || historyState.loading) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          <CircularProgress size={12} color="inherit" />
          <Typography variant="caption">Yükleniyor...</Typography>
        </Box>
      );
    }

    if (historyState.error) {
      return <Typography variant="caption">{historyState.error}</Typography>;
    }

    if (!historyState.entries || historyState.entries.length === 0) {
      return <Typography variant="caption">Son 10 günde bu alana ait kayıt bulunamadı.</Typography>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {historyState.entries.map((entry, idx) => (
          <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
            • {entry.value}{' '}
            <Box component="span" sx={{ opacity: 0.7 }}>
              ({new Date(entry.recordDate).toLocaleDateString('tr-TR')})
            </Box>
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <Tooltip
      arrow
      placement="right"
      onOpen={onOpen}
      title={
        <Box sx={{ p: 0.5, minWidth: 200, maxWidth: 280 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
            "{field.label}" - Son 10 Gün
          </Typography>
          {renderContent()}
        </Box>
      }
    >
      <IconButton size="small" tabIndex={-1} aria-label={`${field.label} geçmiş değerleri`}>
        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </IconButton>
    </Tooltip>
  );
}