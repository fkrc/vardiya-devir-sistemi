package com.example.vardiyadevir.dto;

import lombok.Data;
import java.time.ZonedDateTime;

@Data
public class ShiftFormResponse {
    private Long id;
    private String formTitle;   // Örn: "T4A Shift Handover Form"
    private String menuKey;     // Şablon anahtarı (örn: "t3a") - listede şablona göre filtreleme için
    private String unitName;    // Örn: "OKOM"
    private String status;      // Örn: "DRAFT"
    private ZonedDateTime recordDate;
    private Long createdById;   // Formu oluşturan (devreden) kullanıcının id'si
    private String createdByName; // Formu oluşturan kullanıcının adı
}