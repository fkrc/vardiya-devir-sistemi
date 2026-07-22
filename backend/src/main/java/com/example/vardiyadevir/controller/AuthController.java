package com.example.vardiyadevir.controller;

import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional; // YENİ EKLENDİ

@CrossOrigin
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        
        // Kullanıcıyı veritabanında ara
        Optional<User> userOptional = userRepository.findByUsername(username);
        
        // Eğer kullanıcı varsa (if), User objesini başarıyla dön
        if (userOptional.isPresent()) {
            return ResponseEntity.ok(userOptional.get());
        } 
        // Eğer kullanıcı yoksa (else), 401 hatasıyla metin dön
        else {
            return ResponseEntity.status(401).body("Kullanıcı bulunamadı!");
        }
    }
}