package com.example.vardiyadevir.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.ZonedDateTime;

@Entity
@Table(name = "form_attachments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_form_id", nullable = false)
    private ShiftForm shiftForm;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "content_type", length = 150)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    // Dosya içeriği doğrudan veritabanında (bytea) tutulur; ayrı bir dosya
    // sunucusu/disk yolu yönetimine gerek kalmaz, geliştirme ortamında da
    // taşınabilir olur.
    @JdbcTypeCode(SqlTypes.VARBINARY)
    @Column(name = "file_data", nullable = false)
    private byte[] fileData;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id")
    private User uploadedBy;

    @Column(name = "uploaded_at", updatable = false)
    private ZonedDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (this.uploadedAt == null) {
            this.uploadedAt = ZonedDateTime.now();
        }
    }
}
