package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.dto.AttachmentResponse;
import com.example.vardiyadevir.dto.FieldHistoryEntry;
import com.example.vardiyadevir.dto.ShiftFormResponse;
import com.example.vardiyadevir.dto.ShiftFormDetailResponse;
import com.example.vardiyadevir.entity.FormAttachment;
import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.ShiftForm;
import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.repository.FormAttachmentRepository;
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.ShiftFormRepository;
import com.example.vardiyadevir.repository.UserRepository;
import com.example.vardiyadevir.config.FormSchemaProvider;
import com.example.vardiyadevir.service.PdfGeneratorService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.ZonedDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/forms")
@CrossOrigin
@RequiredArgsConstructor
public class FormController {

    private final FormDefinitionRepository formDefinitionRepository;
    private final ShiftFormRepository shiftFormRepository;
    private final UserRepository userRepository;
    private final FormAttachmentRepository formAttachmentRepository;
    private final FormSchemaProvider schemaProvider;
    private final PdfGeneratorService pdfGeneratorService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Şu an sistemde gerçek bir oturum/token (JWT vb.) mekanizması yok.
    // Frontend, login sonrası aldığı kullanıcı id'sini her istekte "X-User-Id"
    // header'ı olarak gönderir; burada bu id DB'den çözülüp rol/birim bilgisi
    // DOĞRUDAN VERİTABANINDAN alınır (client'ın gönderdiği rol/birim bilgisine
    // asla güvenilmez). Bu, RBAC ve birim izolasyonunun sunucu tarafında
    // zorunlu kılınmasını sağlar.
    private User resolveCurrentUser(Long userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-User-Id header eksik.");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Geçersiz kullanıcı."));
    }

    @GetMapping("/schema/{formId}")
    public ResponseEntity<?> getSchema(@PathVariable String formId) {
        String schemaJson = schemaProvider.getSchemaForForm(formId);
        return ResponseEntity.ok(Map.of("schemaJson", schemaJson));
    }

    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(@RequestParam String unit) {
        return ResponseEntity.ok(schemaProvider.getTemplatesForUnit(unit));
    }

    // NOT: multipart/form-data kullanılıyor çünkü personel, formu doldururken
    // en sonunda isteğe bağlı olarak belge/görsel ekleyebiliyor (bkz. ek
    // yönetimi). "formData" text alanı JSON string olarak gönderilir.
    @PostMapping(value = "/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> submitForm(
            @RequestParam String menuKey,
            @RequestParam("formData") String formDataJson,
            @RequestParam Long userId,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        try {
            FormDefinition definition = formDefinitionRepository.findByMenuKeyAndIsActiveTrue(menuKey)
                    .orElseThrow(() -> new RuntimeException("Form şablonu bulunamadı!"));

            // Formu kimin gönderdiği artık zorunlu: "sadece kendi formlarını görme" kuralı
            // bu bilgi olmadan sunucu tarafında uygulanamaz.
            User creator = resolveCurrentUser(userId);

            ShiftForm shiftForm = new ShiftForm();
            shiftForm.setFormDefinition(definition);
            shiftForm.setUnit(definition.getUnit());
            shiftForm.setTransferorUser(creator);
            shiftForm.setStatus("PENDING_MANAGER_APPROVAL");
            shiftForm.setRecordDate(ZonedDateTime.now());

            Map<String, Object> formDataMap = objectMapper.readValue(formDataJson, new TypeReference<Map<String, Object>>() {});
            shiftForm.setFormData(objectMapper.writeValueAsString(formDataMap));

            ShiftForm saved = shiftFormRepository.save(shiftForm);
            saveAttachments(saved, files, creator);

            return ResponseEntity.ok(Map.of("id", saved.getId(), "message", "Vardiya formu başarıyla kaydedildi!"));
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Hata oluştu: " + e.getMessage());
        }
    }

    // Yüklenen dosyaları ilgili forma bağlı FormAttachment kayıtları olarak
    // veritabanına yazar. files boş/null ise sessizce hiçbir şey yapmaz (ek
    // eklemek zorunlu değil).
    private void saveAttachments(ShiftForm form, List<MultipartFile> files, User uploader) throws IOException {
        if (files == null) return;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            FormAttachment attachment = new FormAttachment();
            attachment.setShiftForm(form);
            attachment.setFileName(file.getOriginalFilename());
            attachment.setContentType(file.getContentType());
            attachment.setFileSize(file.getSize());
            attachment.setFileData(file.getBytes());
            attachment.setUploadedBy(uploader);
            formAttachmentRepository.save(attachment);
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<ShiftFormResponse>> getAllForms(
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User currentUser = resolveCurrentUser(userId);

        List<ShiftForm> forms;
        if ("MANAGER".equalsIgnoreCase(currentUser.getRole())) {
            // Yönetici sadece kendi biriminin formlarını görür
            forms = shiftFormRepository.findByIsDeletedFalseAndUnit_Name(currentUser.getUnit());
        } else {
            // Personel sadece kendi oluşturduğu formları görür
            forms = shiftFormRepository.findByIsDeletedFalseAndTransferorUser_Id(currentUser.getId());
        }

        // Sıralama: önce aksiyon bekleyenler (onay bekleyen / reddedilmiş), sonra
        // tamamlananlar; her grup içinde en yeni kayıt en üstte.
        List<ShiftForm> sorted = forms.stream()
                .sorted(Comparator.comparingInt((ShiftForm f) -> statusSortPriority(f.getStatus()))
                        .thenComparing(ShiftForm::getRecordDate, Comparator.reverseOrder()))
                .toList();

        List<ShiftFormResponse> responses = sorted.stream()
                .map(form -> {
                    ShiftFormResponse res = new ShiftFormResponse();
                    res.setId(form.getId());
                    res.setFormTitle(form.getFormDefinition().getTitle());
                    res.setMenuKey(form.getFormDefinition().getMenuKey());
                    res.setUnitName(form.getUnit() != null ? form.getUnit().getName() : null);
                    res.setStatus(form.getStatus());
                    res.setRecordDate(form.getRecordDate());
                    res.setCreatedById(form.getTransferorUser() != null ? form.getTransferorUser().getId() : null);
                    res.setCreatedByName(form.getTransferorUser() != null ? form.getTransferorUser().getFullName() : null);
                    return res;
                }).toList();

        return ResponseEntity.ok(responses);
    }

    // Onay/işlem bekleyen formlar (PENDING_MANAGER_APPROVAL, DRAFT, REJECTED) her
    // zaman tamamlanmış formların üstünde listelenir.
    private int statusSortPriority(String status) {
        return "COMPLETED".equals(status) ? 1 : 0;
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShiftFormDetailResponse> getFormById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User currentUser = resolveCurrentUser(userId);

        ShiftForm form = shiftFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form bulunamadı."));

        boolean isOwner = form.getTransferorUser() != null && form.getTransferorUser().getId().equals(currentUser.getId());
        boolean isUnitManager = "MANAGER".equalsIgnoreCase(currentUser.getRole())
                && form.getUnit() != null
                && form.getUnit().getName().equalsIgnoreCase(currentUser.getUnit());

        if (!isOwner && !isUnitManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu formu görüntüleme yetkiniz yok.");
        }

        ShiftFormDetailResponse res = new ShiftFormDetailResponse();
        res.setId(form.getId());
        res.setFormTitle(form.getFormDefinition().getTitle());
        res.setUnitName(form.getUnit() != null ? form.getUnit().getName() : null);
        res.setStatus(form.getStatus());
        res.setRecordDate(form.getRecordDate());
        res.setFormData(form.getFormData());
        res.setCreatedById(form.getTransferorUser() != null ? form.getTransferorUser().getId() : null);
        res.setCreatedByName(form.getTransferorUser() != null ? form.getTransferorUser().getFullName() : null);
        res.setMenuKey(form.getFormDefinition().getMenuKey());
        res.setRejectionReason(form.getRejectionReason());

        List<AttachmentResponse> attachments = formAttachmentRepository.findByShiftForm_IdOrderByUploadedAtAsc(form.getId())
                .stream()
                .map(att -> {
                    AttachmentResponse a = new AttachmentResponse();
                    a.setId(att.getId());
                    a.setFileName(att.getFileName());
                    a.setContentType(att.getContentType());
                    a.setFileSize(att.getFileSize());
                    a.setUploadedAt(att.getUploadedAt());
                    return a;
                }).toList();
        res.setAttachments(attachments);

        return ResponseEntity.ok(res);
    }

    // Bir ekin ham içeriğini indirir/görüntüler. Erişim kontrolü, ekin bağlı
    // olduğu formun görüntüleme yetkisiyle aynıdır (sahibi veya birim yöneticisi).
    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<byte[]> downloadAttachment(
            @PathVariable Long attachmentId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User currentUser = resolveCurrentUser(userId);

        FormAttachment attachment = formAttachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ek bulunamadı."));

        ShiftForm form = attachment.getShiftForm();
        boolean isOwner = form.getTransferorUser() != null && form.getTransferorUser().getId().equals(currentUser.getId());
        boolean isUnitManager = "MANAGER".equalsIgnoreCase(currentUser.getRole())
                && form.getUnit() != null
                && form.getUnit().getName().equalsIgnoreCase(currentUser.getUnit());

        if (!isOwner && !isUnitManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu eki görüntüleme yetkiniz yok.");
        }

        MediaType mediaType;
        try {
            mediaType = attachment.getContentType() != null
                    ? MediaType.parseMediaType(attachment.getContentType())
                    : MediaType.APPLICATION_OCTET_STREAM;
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + attachment.getFileName() + "\"")
                .body(attachment.getFileData());
    }

    // Onaylanmış (COMPLETED) formlar için arşivlik PDF üretir. Sadece formun
    // sahibi veya birim yöneticisi indirebilir; onaylanmamış formlar için
    // (henüz kesinleşmediği için) PDF üretilmez.
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User currentUser = resolveCurrentUser(userId);

        ShiftForm form = shiftFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form bulunamadı."));

        boolean isOwner = form.getTransferorUser() != null && form.getTransferorUser().getId().equals(currentUser.getId());
        boolean isUnitManager = "MANAGER".equalsIgnoreCase(currentUser.getRole())
                && form.getUnit() != null
                && form.getUnit().getName().equalsIgnoreCase(currentUser.getUnit());

        if (!isOwner && !isUnitManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu formu görüntüleme yetkiniz yok.");
        }

        if (!"COMPLETED".equals(form.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sadece onaylanmış formlar için PDF oluşturulabilir.");
        }

        try {
            byte[] pdfBytes = pdfGeneratorService.generate(form);
            String fileName = "vardiya-formu-" + form.getId() + ".pdf";
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .body(pdfBytes);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "PDF oluşturulamadı: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/advance-status")
    public ResponseEntity<String> advanceFormStatus(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        User currentUser = resolveCurrentUser(userId);

        ShiftForm form = shiftFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form bulunamadı."));

        boolean isUnitManager = "MANAGER".equalsIgnoreCase(currentUser.getRole())
                && form.getUnit() != null
                && form.getUnit().getName().equalsIgnoreCase(currentUser.getUnit());

        if (!isUnitManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sadece bu birimin yöneticisi formu onaylayabilir.");
        }

        if (!"PENDING_MANAGER_APPROVAL".equals(form.getStatus())) {
            return ResponseEntity.badRequest().body("Form zaten tamamlanmış veya geçersiz statüde.");
        }

        form.setStatus("COMPLETED");
        shiftFormRepository.save(form);
        return ResponseEntity.ok("İşlem başarıyla tamamlandı.");
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<String> rejectForm(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestBody(required = false) Map<String, String> body) {
        User currentUser = resolveCurrentUser(userId);

        ShiftForm form = shiftFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form bulunamadı."));

        boolean isUnitManager = "MANAGER".equalsIgnoreCase(currentUser.getRole())
                && form.getUnit() != null
                && form.getUnit().getName().equalsIgnoreCase(currentUser.getUnit());

        if (!isUnitManager) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sadece bu birimin yöneticisi formu reddedebilir.");
        }

        if (!"PENDING_MANAGER_APPROVAL".equals(form.getStatus()) && !"DRAFT".equals(form.getStatus())) {
            return ResponseEntity.badRequest().body("Form onay bekleyen durumda değil, reddedilemez.");
        }

        String reason = body != null ? body.get("reason") : null;
        form.setStatus("REJECTED");
        form.setRejectionReason((reason == null || reason.isBlank()) ? null : reason.trim());
        shiftFormRepository.save(form);
        return ResponseEntity.ok("Form reddedildi.");
    }

    // Personel, reddedilen formu düzenleyip bu uç nokta üzerinden tekrar
    // yönetici onayına gönderir. Sadece formun sahibi ve sadece REJECTED
    // durumundaki formlar için kullanılabilir. Düzenleme sırasında yeni
    // ek dosyalar da eklenebilir (mevcut ekler korunur, silinmez).
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> resubmitForm(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam("formData") String formDataJson,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        User currentUser = resolveCurrentUser(userId);

        ShiftForm form = shiftFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Form bulunamadı."));

        boolean isOwner = form.getTransferorUser() != null && form.getTransferorUser().getId().equals(currentUser.getId());
        if (!isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu formu sadece oluşturan kişi düzenleyebilir.");
        }

        if (!"REJECTED".equals(form.getStatus())) {
            return ResponseEntity.badRequest().body("Sadece reddedilmiş formlar düzenlenip tekrar gönderilebilir.");
        }

        try {
            Map<String, Object> formDataMap = objectMapper.readValue(formDataJson, new TypeReference<Map<String, Object>>() {});
            form.setFormData(objectMapper.writeValueAsString(formDataMap));
            saveAttachments(form, files, currentUser);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Form verisi işlenemedi: " + e.getMessage());
        }
        form.setStatus("PENDING_MANAGER_APPROVAL");
        form.setRejectionReason(null);
        form.setRecordDate(ZonedDateTime.now());
        shiftFormRepository.save(form);
        return ResponseEntity.ok("Form güncellendi ve tekrar Yönetici onayına gönderildi.");
    }

    // REHBER ÖZELLİĞİ: Form doldururken kullanıcıya yardımcı olmak için,
    // aynı form şablonuna (menuKey) ait, son N gün içinde girilmiş bu alana
    // (fieldKey) ait değerleri döndürür. Kimlik/rol kontrolü gerektirmez;
    // /schema ve /templates gibi bilgilendirme amaçlı bir uç noktadır.
    @GetMapping("/{menuKey}/field-history/{fieldKey}")
    public ResponseEntity<List<FieldHistoryEntry>> getFieldHistory(
            @PathVariable String menuKey,
            @PathVariable String fieldKey,
            @RequestParam(defaultValue = "10") int days) {

        ZonedDateTime cutoff = ZonedDateTime.now().minusDays(Math.max(days, 1));

        List<ShiftForm> forms = shiftFormRepository
                .findByIsDeletedFalseAndFormDefinition_MenuKeyAndRecordDateAfterOrderByRecordDateDesc(menuKey, cutoff);

        List<FieldHistoryEntry> history = forms.stream()
                .map(form -> {
                    try {
                        JsonNode node = objectMapper.readTree(form.getFormData());
                        JsonNode valueNode = node.get(fieldKey);
                        if (valueNode == null || valueNode.isNull() || valueNode.asText().isBlank()) {
                            return null;
                        }
                        return new FieldHistoryEntry(
                                valueNode.asText(),
                                form.getRecordDate(),
                                form.getUnit() != null ? form.getUnit().getName() : null
                        );
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(entry -> entry != null)
                .limit(8)
                .toList();

        return ResponseEntity.ok(history);
    }
}