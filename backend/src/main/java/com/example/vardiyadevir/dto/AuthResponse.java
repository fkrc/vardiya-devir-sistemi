package com.example.vardiyadevir.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Login sonrası döndürülen kullanıcı bilgisi.
// DİKKAT: User entity'si doğrudan dönülmez, çünkü onun içinde hashlenmiş
// şifre alanı da bulunuyor. Bu DTO şifreyi asla içermez.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private Long id;
    private String username;
    private String fullName;
    private String role;
    private String unit;
}
