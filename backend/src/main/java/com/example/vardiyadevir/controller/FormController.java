package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.dto.FormSubmissionRequest;
import com.example.vardiyadevir.dto.ShiftFormResponse;
import com.example.vardiyadevir.dto.ShiftFormDetailResponse;
import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.ShiftForm;
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.ShiftFormRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZonedDateTime;

@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormDefinitionRepository formDefinitionRepository;
    private final ShiftFormRepository shiftFormRepository;

    @GetMapping("/schema/{menuKey}")
    public ResponseEntity<FormDefinition> getFormSchema(@PathVariable String menuKey) {
        return formDefinitionRepository.findByMenuKeyAndIsActiveTrue(menuKey)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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
            
            // ObjectMapper'ı doğrudan burada manuel olarak oluşturuyoruz
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

    // YENİ EKLENEN KISIM: Veritabanındaki tüm formları listeler
    @GetMapping("/list")
    public ResponseEntity<java.util.List<ShiftFormResponse>> getAllForms() {
        java.util.List<ShiftFormResponse> responses = shiftFormRepository.findByIsDeletedFalse()
                .stream()
                .map(form -> {
                    ShiftFormResponse res = new ShiftFormResponse();
                    res.setId(form.getId());
                    res.setFormTitle(form.getFormDefinition().getTitle());
                    res.setUnitName(form.getUnit().getName());
                    res.setStatus(form.getStatus());
                    res.setRecordDate(form.getRecordDate());
                    return res;
                }).toList();

        return ResponseEntity.ok(responses);
    }

    // YENİ EKLENEN KISIM: ID'ye göre form detayını getirir
    @GetMapping("/{id}")
    public ResponseEntity<ShiftFormDetailResponse> getFormById(@PathVariable Long id) {
        return shiftFormRepository.findById(id).map(form -> {
            ShiftFormDetailResponse res = new ShiftFormDetailResponse();
            res.setId(form.getId());
            res.setFormTitle(form.getFormDefinition().getTitle());
            res.setUnitName(form.getUnit().getName());
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
            
            // Artık sadece Amir Onayı -> Tamamlandı geçişi var
            if ("PENDING_MANAGER_APPROVAL".equals(currentStatus)) {
                form.setStatus("COMPLETED");
            } else {
                return ResponseEntity.badRequest().body("Form zaten tamamlanmış veya geçersiz statüde.");
            }
            
            shiftFormRepository.save(form);
            return ResponseEntity.ok(form.getStatus());
        }).orElse(ResponseEntity.notFound().build());
    }
}