package com.example.vardiyadevir.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 1. Security katmanında CORS ayarlarını devreye sokuyoruz
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 2. Geliştirme aşamasında CSRF korumasını kapatıyoruz
            .csrf(csrf -> csrf.disable())
            
            // 3. /api/forms/ altındaki tüm linklere şifresiz (login olmadan) erişime izin veriyoruz
           .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/forms/**", "/api/auth/**").permitAll() // <-- "/api/auth/**" BURADA OLMALI
                .anyRequest().authenticated()
            );
            
        return http.build();
    }

    // CORS ayarlarını tanımladığımız kısım
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}