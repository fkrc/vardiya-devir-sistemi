package com.example.vardiyadevir.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "full_name")
    private String fullName;

    // BCrypt ile hashlenmiş şifre. Asla düz metin olarak saklanmaz veya response'a dahil edilmez.
    private String password;

    private String role; // PERSONNEL / MANAGER (veya eski değerler: OPERATOR / SUPERVISOR)
    private String unit;
}