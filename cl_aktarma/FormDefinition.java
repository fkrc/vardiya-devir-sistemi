package com.example.vardiyadevir.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.ZonedDateTime;

@Entity
@Table(name = "form_definitions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "unit_id")
    private Unit unit;

    @Column(name = "menu_key", nullable = false, length = 50)
    private String menuKey;

    // PostgreSQL'deki JSONB yapısını Java'da yönetmek için gereken sihirli kısım
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "schema_json", columnDefinition = "jsonb", nullable = false)
    private String schemaJson; 

    @Column(columnDefinition = "integer default 1")
    private Integer version = 1;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private ZonedDateTime createdAt;
}