package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.dto.FieldHistoryEntry;
import com.example.vardiyadevir.dto.FormSubmissionRequest;
import com.example.vardiyadevir.dto.ShiftFormResponse;
import com.example.vardiyadevir.dto.ShiftFormDetailResponse;
import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.ShiftForm;
import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.ShiftFormRepository;
import com.example.vardiyadevir.repository.UserRepository;
import com.example.vardiyadevir.config.FormSchemaProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
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
    private final FormSchemaProvider schemaProvider;
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

    @PostMapping("/submit")
    public ResponseEntity<String> submitForm(@RequestBody FormSubmissionRequest request) {
        try {
            FormDefinition definition = formDefinitionRepository.findByMenuKeyAndIsActiveTrue(request.getMenuKey())
                    .orElseThrow(() -> new RuntimeException("Form şablonu bulunamadı!"));

            // Formu kimin gönderdiği artık zorunlu: "sadece kendi formlarını görme" kuralı
            // bu bilgi olmadan sunucu tarafında uygulanamaz.
            User creator = resolveCurrentUser(request.getUserId());

            ShiftForm shiftForm = new ShiftForm();
            shiftForm.setFormDefinition(definition);
            shiftForm.setUnit(definition.getUnit());
            shiftForm.setTransferorUser(creator);
            shiftForm.setStatus("PENDING_MANAGER_APPROVAL");
            shiftForm.setRecordDate(ZonedDateTime.now());

            String jsonFormData = objectMapper.writeValueAsString(request.getFormData());
            shiftForm.setFormData(jsonFormData);

            shiftFormRepository.save(shiftForm);

            return ResponseEntity.ok("Vardiya formu başarıyla kaydedildi!");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Hata oluştu: " + e.getMessage());
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

        List<ShiftFormResponse> responses = forms.stream()
                .map(form -> {
                    ShiftFormResponse res = new ShiftFormResponse();
                    res.setId(form.getId());
                    res.setFormTitle(form.getFormDefinition().getTitle());
                    res.setUnitName(form.getUnit() != null ? form.getUnit().getName() : null);
                    res.setStatus(form.getStatus());
                    res.setRecordDate(form.getRecordDate());
                    res.setCreatedById(form.getTransferorUser() != null ? form.getTransferorUser().getId() : null);
                    return res;
                }).toList();

        return ResponseEntity.ok(responses);
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
        res.setMenuKey(form.getFormDefinition().getMenuKey());
        return ResponseEntity.ok(res);
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