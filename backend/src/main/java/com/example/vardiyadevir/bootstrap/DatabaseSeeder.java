package com.example.vardiyadevir.bootstrap;

import com.example.vardiyadevir.entity.FormDefinition;
import com.example.vardiyadevir.entity.Unit;
import com.example.vardiyadevir.entity.User; // EKLENDİ
import com.example.vardiyadevir.repository.FormDefinitionRepository;
import com.example.vardiyadevir.repository.UnitRepository;
import com.example.vardiyadevir.repository.UserRepository; // EKLENDİ
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final UnitRepository unitRepository;
    private final FormDefinitionRepository formDefinitionRepository;
    private final UserRepository userRepository; // EKLENDİ

    @Override
    public void run(String... args) throws Exception {
        
        // 1. OKOM Birimini Kontrol Et ve Ekle
        Unit okomUnit = unitRepository.findByName("OKOM").orElseGet(() -> {
            Unit unit = new Unit();
            unit.setName("OKOM");
            return unitRepository.save(unit);
        });

        // 2. KULLANICILARI EKLE (U1, U2, A1) - PARANTEZ İÇİNE ALINDI
        if (userRepository.findByUsername("U1").isEmpty()) {
            User u1 = new User();
            u1.setUsername("U1");
            u1.setFullName("Operatör Bir");
            u1.setEmail("u1@turksat.com.tr");
            u1.setUnit(okomUnit);
            u1.setRole("OPERATOR");
            userRepository.save(u1);

            User u2 = new User();
            u2.setUsername("U2");
            u2.setFullName("Operatör İki");
            u2.setEmail("u2@turksat.com.tr");
            u2.setUnit(okomUnit);
            u2.setRole("OPERATOR");
            userRepository.save(u2);

            User a1 = new User();
            a1.setUsername("A1");
            a1.setFullName("Amir Bir");
            a1.setEmail("a1@turksat.com.tr");
            a1.setUnit(okomUnit);
            a1.setRole("UNIT_MANAGER");
            userRepository.save(a1);

            System.out.println("Test kullanıcıları (U1, U2, A1) başarıyla eklendi!");
        }

        // 3. T4A Form Şablonunu Kontrol Et ve Ekle
        if (formDefinitionRepository.findByMenuKeyAndIsActiveTrue("satellite_control").isEmpty()) {
            
            String t4aJsonSchema = "{\"sections\":[{\"title\":\"Aktif İstasyon & Genel Bilgiler\",\"fields\":[{\"key\":\"active_station\",\"label\":\"Active Station\",\"type\":\"radio\",\"options\":[\"GOLBASI\",\"ODTU\"],\"required\":true}]},{\"title\":\"1. Devredilen İşlemler (Operations in Progress)\",\"fields\":[{\"key\":\"t4a_ops_progress\",\"label\":\"1.1 T4A operation(s) in progress\",\"type\":\"checkbox_group\",\"options\":[\"Ranging\",\"Other\"]},{\"key\":\"t4a_ops_other\",\"label\":\"Other Details\",\"type\":\"text\",\"dependsOn\":\"t4a_ops_progress:Other\"},{\"key\":\"transferred_info\",\"label\":\"1.2 Transferred information\",\"type\":\"textarea\"}]},{\"title\":\"2. Anomaly Check\",\"fields\":[{\"key\":\"event_logger\",\"label\":\"Filter messages in Event Logger\",\"type\":\"checkbox_group\",\"options\":[\"Fatal\",\"Error\",\"Warn\"]},{\"key\":\"ool_check\",\"label\":\"Check OOL's\",\"type\":\"radio\",\"options\":[\"No\",\"Yes\"]},{\"key\":\"ool_remarks\",\"label\":\"OOL Remarks\",\"type\":\"text\",\"dependsOn\":\"ool_check:Yes\"}]},{\"title\":\"3. Telemetry Checks\",\"fields\":[{\"key\":\"tdg1_max_v\",\"label\":\"TDG1 Max value (V)\",\"type\":\"number\",\"step\":\"0.01\"},{\"key\":\"tdg1_min_v\",\"label\":\"TDG1 Min value (V)\",\"type\":\"number\",\"step\":\"0.01\"},{\"key\":\"acsm006_counter\",\"label\":\"ACSM006 - CSM Timeout Counter\",\"type\":\"text\"},{\"key\":\"acsm004_key\",\"label\":\"ACSM004 - CSM Selected Key\",\"type\":\"text\"}]},{\"title\":\"4. Remarks\",\"fields\":[{\"key\":\"remarks\",\"label\":\"In case of unexpected status note here\",\"type\":\"textarea\"}]}]}";

            FormDefinition t4aForm = new FormDefinition();
            t4aForm.setTitle("T4A Shift Handover Form");
            t4aForm.setUnit(okomUnit);
            t4aForm.setMenuKey("satellite_control");
            t4aForm.setSchemaJson(t4aJsonSchema);
            t4aForm.setVersion(1);
            t4aForm.setIsActive(true);

            formDefinitionRepository.save(t4aForm);
            System.out.println("T4A Form şablonu veritabanına başarıyla eklendi!");
        }
    }
}