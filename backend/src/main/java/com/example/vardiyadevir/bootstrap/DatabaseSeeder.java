package com.example.vardiyadevir.bootstrap;

import com.example.vardiyadevir.entity.User;
import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.Unit; // Unit Sınıfı Eklendi
import com.example.vardiyadevir.repository.UserRepository;
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.UnitRepository; // Unit Repository Eklendi
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository,
                                   FormDefinitionRepository formDefinitionRepository,
                                   UnitRepository unitRepository,
                                   PasswordEncoder passwordEncoder) {
        return args -> {

            // 1. KULLANICILARIN EKLENMESİ
            // NOT: Eskiden bu blok yalnızca "userRepository.count() == 0" iken çalışıyordu.
            // Bu, daha önceden (şifreleme eklenmeden ve M1/M2 tanımlanmadan önce) çalıştırılmış
            // bir veritabanında iki soruna yol açıyordu: (a) M1/M2 hiç eklenmiyordu, (b) U1/U2'nin
            // eski düz-metin "1234" şifresi BCrypt ile karşılaştırıldığı için giriş hep başarısız
            // oluyordu. Artık her test kullanıcısı ayrı ayrı, username'e göre kontrol edilip
            // eksikse oluşturuluyor, var ama şifresi BCrypt formatında değilse yeniden hashleniyor.
            seedTestUser(userRepository, passwordEncoder, "U1", "UHGM Personeli 1", "PERSONNEL", "UHGM");
            seedTestUser(userRepository, passwordEncoder, "U2", "UKOM Personeli 1", "PERSONNEL", "UKOM");
            seedTestUser(userRepository, passwordEncoder, "M1", "UHGM Yöneticisi", "MANAGER", "UHGM");
            seedTestUser(userRepository, passwordEncoder, "M2", "UKOM Yöneticisi", "MANAGER", "UKOM");

            // 2. FORM ŞABLONLARI İÇİN 'UNIT' NESNELERİNİN HAZIRLANMASI
            Unit ukom = null;
            Unit uhgm = null;
            
            // Veritabanında bu birimler var mı diye kontrol et (Özel metot gerektirmeyen güvenli arama)
            for (Unit u : unitRepository.findAll()) {
                if ("UKOM".equalsIgnoreCase(u.getName())) ukom = u;
                if ("UHGM".equalsIgnoreCase(u.getName())) uhgm = u;
            }
            
            // Eğer veritabanında yoklarsa yeni Unit nesneleri oluştur ve kaydet
            if (ukom == null) { ukom = new Unit(); ukom.setName("UKOM"); unitRepository.save(ukom); }
            if (uhgm == null) { uhgm = new Unit(); uhgm.setName("UHGM"); unitRepository.save(uhgm); }

            // 3. FORM ŞABLONLARININ EKLENMESİ (String yerine Unit nesnesi atayarak)
            if (formDefinitionRepository.count() == 0) {
                FormDefinition f1 = new FormDefinition(); f1.setMenuKey("t3a"); f1.setTitle("T3A Vardiya Devir Formu"); f1.setUnit(ukom); f1.setIsActive(true); f1.setSchemaJson("{}"); formDefinitionRepository.save(f1);
                
                FormDefinition f2 = new FormDefinition(); f2.setMenuKey("t4a"); f2.setTitle("T4A Vardiya Devir Formu"); f2.setUnit(ukom); f2.setIsActive(true); f2.setSchemaJson("{}"); formDefinitionRepository.save(f2);
                
                FormDefinition f3 = new FormDefinition(); f3.setMenuKey("t4b"); f3.setTitle("T4B Vardiya Devir Formu"); f3.setUnit(ukom); f3.setIsActive(true); f3.setSchemaJson("{}"); formDefinitionRepository.save(f3);
                
                FormDefinition f4 = new FormDefinition(); f4.setMenuKey("t5a"); f4.setTitle("T5A Vardiya Devir Formu"); f4.setUnit(ukom); f4.setIsActive(true); f4.setSchemaJson("{}"); formDefinitionRepository.save(f4);
                
                FormDefinition f5 = new FormDefinition(); f5.setMenuKey("cmc_daily"); f5.setTitle("CMC Günlük Kontrol Formu"); f5.setUnit(uhgm); f5.setIsActive(true); f5.setSchemaJson("{}"); formDefinitionRepository.save(f5);
                
                System.out.println("Form şablonları veritabanına başarıyla eklendi!");
            }
        };
    }

    private void seedTestUser(UserRepository userRepository, PasswordEncoder passwordEncoder,
                               String username, String fullName, String role, String unit) {
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setFullName(fullName);
            user.setPassword(passwordEncoder.encode("1234"));
            user.setRole(role);
            user.setUnit(unit);
            userRepository.save(user);
            System.out.println("Test kullanıcısı oluşturuldu: " + username + " (şifre: 1234)");
            return;
        }

        boolean needsUpdate = false;

        // BCrypt hash'leri her zaman "$2a$", "$2b$" veya "$2y$" ile başlar.
        // Şifre bu formatta değilse, eski (hashlenmemiş) bir kayıttır.
        if (user.getPassword() == null || !user.getPassword().startsWith("$2")) {
            user.setPassword(passwordEncoder.encode("1234"));
            needsUpdate = true;
        }
        if (!fullName.equals(user.getFullName())) {
            user.setFullName(fullName);
            needsUpdate = true;
        }
        if (!role.equals(user.getRole())) {
            user.setRole(role);
            needsUpdate = true;
        }
        if (!unit.equals(user.getUnit())) {
            user.setUnit(unit);
            needsUpdate = true;
        }

        if (needsUpdate) {
            userRepository.save(user);
            System.out.println("Eski test kullanıcısı güncellendi/normalize edildi: " + username);
        }
    }
}