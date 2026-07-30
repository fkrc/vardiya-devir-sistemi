package com.example.vardiyadevir.bootstrap;

import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                // UHGM Operatörü
                User u1 = new User();
                u1.setUsername("U1");
                u1.setPassword("1234");
                u1.setRole("OPERATOR");
                u1.setUnit("UHGM"); 
                userRepository.save(u1);

                // UKOM Operatörü
                User u2 = new User();
                u2.setUsername("U2");
                u2.setPassword("1234");
                u2.setRole("OPERATOR");
                u2.setUnit("UKOM");
                userRepository.save(u2);

                // Amir (Supervisor) - Amirin tüm birimleri görmesi için birimi null veya "ALL" bırakılabilir
                User a1 = new User();
                a1.setUsername("A1");
                a1.setPassword("1234");
                a1.setRole("SUPERVISOR");
                a1.setUnit("ALL");
                userRepository.save(a1);

                System.out.println("Test kullanıcıları (UHGM, UKOM, Amir) başarıyla eklendi!");
            }
        };
    }
}