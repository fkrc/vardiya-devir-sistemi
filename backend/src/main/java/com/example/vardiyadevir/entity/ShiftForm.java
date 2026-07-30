package com.example.vardiyadevir.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.ZonedDateTime;

@Entity
@Table(name = "shift_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_definition_id", nullable = false)
    private FormDefinition formDefinition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    // Rol bazlı kullanıcı eşleşmeleri
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transferor_user_id")
    private User transferorUser; // Devreden

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transferee_user_id")
    private User transfereeUser; // Devralan

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "observer_user_id")
    private User observerUser;   // Gözlemci

    @Column(nullable = false, length = 30)
    private String status = "DRAFT"; // DRAFT, PENDING_MANAGER_APPROVAL, REJECTED, COMPLETED vb.

    // Yönetici formu reddettiğinde belirttiği gerekçe. Form tekrar onaya
    // gönderildiğinde (bkz. FormController#resubmitForm) temizlenir.
    @Column(name = "rejection_reason", columnDefinition = "text")
    private String rejectionReason;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "is_problematic")
    private Boolean isProblematic = false;

    // Sistem tarafından atanan değiştirilemez tarih
    @Column(name = "transaction_date", updatable = false)
    private ZonedDateTime transactionDate;

    // Kullanıcının ekrandan değiştirebileceği tarih
    @Column(name = "record_date", nullable = false)
    private ZonedDateTime recordDate;

    // Formun içine doldurulan asıl veriler (JSONB)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "form_data", columnDefinition = "jsonb", nullable = false)
    private String formData;

    // Soft delete yönetimi
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "deleted_at")
    private ZonedDateTime deletedAt;
    
    @Column(name = "deleted_by")
    private Long deletedBy;

    // YENİ EKLENDİ: Veritabanına yazılmadan hemen önce otomatik tarih ataması yapar
    @PrePersist
    protected void onCreate() {
        if (this.transactionDate == null) {
            this.transactionDate = ZonedDateTime.now();
        }
        if (this.recordDate == null) {
            this.recordDate = ZonedDateTime.now();
        }
    }
}