package com.example.vardiyadevir.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;

// Form doldururken kullanıcıya rehberlik etmesi için, aynı alana geçmişte
// girilmiş değerleri taşıyan kayıt (bkz. FormController#getFieldHistory).
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FieldHistoryEntry {
    private String value;
    private ZonedDateTime recordDate;
    private String unitName;
}
