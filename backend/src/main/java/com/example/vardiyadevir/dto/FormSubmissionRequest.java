package com.example.vardiyadevir.dto;

import lombok.Data;
import java.util.Map;

@Data
public class FormSubmissionRequest {
    private String menuKey; // Hangi şablona ait veri geldiğini bilmek için (örn: "satellite_control")
    private Map<String, Object> formData; // Ekrandan gelen asıl form yanıtları
    private Long userId; // Formu dolduran/gönderen personelin id'si (devir zinciri ve "sadece kendi formların" filtresi için gerekli)
}