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
            // NOT: Şifreler artık düz metin değil, BCrypt ile hashlenerek saklanıyor.
            // Test giriş şifresi hepsi için "1234".
            // MANAGER kullanıcıları (M1/M2) eskiden hiç seed edilmiyordu; frontend login ekranı
            // bu kullanıcıları varsayıyordu ve backend'de bulunamadıkları için sahte (mock) bir
            // girişe düşülüyordu. Artık gerçek DB kullanıcıları olarak ekleniyorlar.
            if (userRepository.count() == 0) {
                User u1 = new User(); u1.setUsername("U1"); u1.setFullName("UHGM Personeli 1"); u1.setPassword(passwordEncoder.encode("1234")); u1.setRole("PERSONNEL"); u1.setUnit("UHGM"); userRepository.save(u1);
                User u2 = new User(); u2.setUsername("U2"); u2.setFullName("UKOM Personeli 1"); u2.setPassword(passwordEncoder.encode("1234")); u2.setRole("PERSONNEL"); u2.setUnit("UKOM"); userRepository.save(u2);
                User m1 = new User(); m1.setUsername("M1"); m1.setFullName("UHGM Yöneticisi"); m1.setPassword(passwordEncoder.encode("1234")); m1.setRole("MANAGER"); m1.setUnit("UHGM"); userRepository.save(m1);
                User m2 = new User(); m2.setUsername("M2"); m2.setFullName("UKOM Yöneticisi"); m2.setPassword(passwordEncoder.encode("1234")); m2.setRole("MANAGER"); m2.setUnit("UKOM"); userRepository.save(m2);
                System.out.println("Test kullanıcıları eklendi! (U1, U2, M1, M2 - şifre: 1234)");
            }

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
                FormDefinition f1 = new FormDefinition(); f1.setMenuKey("t3a"); f1.setTitle("T3A Shift Handover Form"); f1.setUnit(ukom); f1.setIsActive(true); f1.setSchemaJson("{}"); formDefinitionRepository.save(f1);
                
                FormDefinition f2 = new FormDefinition(); f2.setMenuKey("t4a"); f2.setTitle("T4A Shift Handover Form"); f2.setUnit(ukom); f2.setIsActive(true); f2.setSchemaJson("{}"); formDefinitionRepository.save(f2);
                
                FormDefinition f3 = new FormDefinition(); f3.setMenuKey("t4b"); f3.setTitle("T4B Shift Handover Form"); f3.setUnit(ukom); f3.setIsActive(true); f3.setSchemaJson("{}"); formDefinitionRepository.save(f3);
                
                FormDefinition f4 = new FormDefinition(); f4.setMenuKey("t5a"); f4.setTitle("T5A Shift Handover Form"); f4.setUnit(ukom); f4.setIsActive(true); f4.setSchemaJson("{}"); formDefinitionRepository.save(f4);
                
                FormDefinition f5 = new FormDefinition(); f5.setMenuKey("cmc_daily"); f5.setTitle("CMC Günlük Kontrol Formu"); f5.setUnit(uhgm); f5.setIsActive(true); f5.setSchemaJson("{}"); formDefinitionRepository.save(f5);
                
                System.out.println("Form şablonları veritabanına başarıyla eklendi!");
            }
        };
    }
}