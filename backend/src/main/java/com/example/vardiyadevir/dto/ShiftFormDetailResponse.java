package com.example.vardiyadevir.dto;

import lombok.Data;
import java.time.ZonedDateTime;

@Data
public class ShiftFormDetailResponse {
    private Long id;
    private String formTitle;
    private String unitName;
    private String status;
    private ZonedDateTime recordDate;
    private String formData; // Kullanıcının doldurduğu asıl form verisi
}