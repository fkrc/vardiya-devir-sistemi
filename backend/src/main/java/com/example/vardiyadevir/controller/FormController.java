package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.dto.FormSubmissionRequest;
import com.example.vardiyadevir.dto.ShiftFormResponse;
import com.example.vardiyadevir.dto.ShiftFormDetailResponse;
import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.ShiftForm;
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.ShiftFormRepository;
import com.example.vardiyadevir.config.FormSchemaProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    private final FormSchemaProvider schemaProvider;

    // 1. DÜZELTME: Eski veritabanı tabanlı (/schema/{menuKey}) ile yeni provider 
    // tabanlı metotlar birbiriyle çakışıyordu. Sadece yeni Provider yapısı bırakıldı.
    @GetMapping("/schema/{formId}")
    public ResponseEntity<?> getSchema(@PathVariable String formId) {
        String schemaJson = schemaProvider.getSchemaForForm(formId);
        return ResponseEntity.ok(Map.of("schemaJson", schemaJson));
    }

    // 2. DÜZELTME: Sınıf seviyesinde zaten "@RequestMapping("/api/forms")" olduğu için, 
    // metodun başındaki "/api/forms" kısmı silindi. (Yoksa adres /api/forms/api/forms/templates olurdu)
    @GetMapping("/templates")
    public ResponseEntity<?> getTemplates(@RequestParam String unit) {
        return ResponseEntity.ok(schemaProvider.getTemplatesForUnit(unit));
    }

    @PostMapping("/submit")
    public ResponseEntity<String> submitForm(@RequestBody FormSubmissionRequest request) {
        try {
            FormDefinition definition = formDefinitionRepository.findByMenuKeyAndIsActiveTrue(request.getMenuKey())
                    .orElseThrow(() -> new RuntimeException("Form şablonu bulunamadı!"));

            ShiftForm shiftForm = new ShiftForm();
            shiftForm.setFormDefinition(definition);
            shiftForm.setUnit(definition.getUnit()); 
            shiftForm.setStatus("PENDING_MANAGER_APPROVAL"); 
            shiftForm.setRecordDate(ZonedDateTime.now()); 
            
            ObjectMapper mapper = new ObjectMapper();
            String jsonFormData = mapper.writeValueAsString(request.getFormData());
            shiftForm.setFormData(jsonFormData);

            // TODO: İleride giriş yapan kullanıcının ID'sini buraya ekleyeceğiz.

            shiftFormRepository.save(shiftForm);

            return ResponseEntity.ok("Vardiya formu başarıyla kaydedildi!");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Hata oluştu: " + e.getMessage());
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<ShiftFormResponse>> getAllForms() {
        List<ShiftFormResponse> responses = shiftFormRepository.findByIsDeletedFalse()
                .stream()
                .map(form -> {
                    ShiftFormResponse res = new ShiftFormResponse();
                    res.setId(form.getId());
                    res.setFormTitle(form.getFormDefinition().getTitle());
                    
                    // DÜZELTME: Unit bir nesne olduğu için .getName() geri eklendi
                    res.setUnitName(form.getUnit() != null ? form.getUnit().getName() : null); 
                    
                    res.setStatus(form.getStatus());
                    res.setRecordDate(form.getRecordDate());
                    return res;
                }).toList();

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShiftFormDetailResponse> getFormById(@PathVariable Long id) {
        return shiftFormRepository.findById(id).map(form -> {
            ShiftFormDetailResponse res = new ShiftFormDetailResponse();
            res.setId(form.getId());
            res.setFormTitle(form.getFormDefinition().getTitle());
            
            // DÜZELTME: Unit bir nesne olduğu için .getName() geri eklendi
            res.setUnitName(form.getUnit() != null ? form.getUnit().getName() : null); 
            
            res.setStatus(form.getStatus());
            res.setRecordDate(form.getRecordDate());
            res.setFormData(form.getFormData());
            return res;
        }).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/advance-status")
    public ResponseEntity<String> advanceFormStatus(@PathVariable Long id) {
        return shiftFormRepository.findById(id).map(form -> {
            String currentStatus = form.getStatus();
            
            if ("PENDING_MANAGER_APPROVAL".equals(currentStatus)) {
                form.setStatus("COMPLETED");
            } else {
                return ResponseEntity.badRequest().body("Form zaten tamamlanmış veya geçersiz statüde.");
            }
            
            shiftFormRepository.save(form);
            return ResponseEntity.ok("İşlem başarıyla tamamlandı.");
        }).orElse(ResponseEntity.notFound().build());
    }
}