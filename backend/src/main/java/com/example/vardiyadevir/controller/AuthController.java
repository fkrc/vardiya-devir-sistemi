package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.dto.AuthResponse;
import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@CrossOrigin
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        Optional<User> userOptional = userRepository.findByUsername(username);

        // Kullanıcı bulunamadıysa ya da şifre eşleşmiyorsa aynı genel mesajla reddet
        // (kullanıcı adının var olup olmadığını sızdırmamak için).
        if (userOptional.isEmpty() || password == null
                || !passwordEncoder.matches(password, userOptional.get().getPassword())) {
            return ResponseEntity.status(401).body("Kullanıcı adı veya şifre hatalı!");
        }

        User user = userOptional.get();
        AuthResponse response = new AuthResponse(
                user.getId(), user.getUsername(), user.getFullName(), user.getRole(), user.getUnit()
        );
        return ResponseEntity.ok(response);
    }
}