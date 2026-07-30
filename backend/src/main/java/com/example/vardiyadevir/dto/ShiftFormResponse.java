package com.example.vardiyadevir.dto;

import lombok.Data;
import java.time.ZonedDateTime;

@Data
public class ShiftFormResponse {
    private Long id;
    private String formTitle;   // Örn: "T4A Shift Handover Form"
    private String unitName;    // Örn: "OKOM"
    private String status;      // Örn: "DRAFT"
    private ZonedDateTime recordDate;
    private Long createdById;   // Formu oluşturan (devreden) kullanıcının id'si
}