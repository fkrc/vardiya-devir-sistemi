package com.example.vardiyadevir.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.ZonedDateTime;

@Entity
@Table(name = "units")
@Data // Lombok: Getter, Setter, toString metodlarını otomatik üretir
@NoArgsConstructor // Lombok: Parametresiz constructor üretir
@AllArgsConstructor // Lombok: Tüm parametreleri içeren constructor üretir
public class Unit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "created_at", insertable = false, updatable = false)
    private ZonedDateTime createdAt;
}