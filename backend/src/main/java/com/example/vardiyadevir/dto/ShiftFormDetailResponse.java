package com.example.vardiyadevir.dto;

import lombok.Data;
import java.time.ZonedDateTime;
import java.util.List;

@Data
public class ShiftFormDetailResponse {
    private Long id;
    private String formTitle;
    private String unitName;
    private String status;
    private ZonedDateTime recordDate;
    private String formData; // Kullanıcının doldurduğu asıl form verisi
    private Long createdById; // Formu oluşturan (devreden) kullanıcının id'si
    private String createdByName; // Formu oluşturan kullanıcının adı
    private String menuKey;   // Formun şablon anahtarı (frontend şemayı buradan tekrar çeker)
    private String rejectionReason; // Yönetici reddettiyse belirttiği gerekçe
    private List<AttachmentResponse> attachments; // Forma eklenmiş belge/görsel ekleri
}