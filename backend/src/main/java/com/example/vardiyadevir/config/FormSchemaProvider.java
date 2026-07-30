package com.example.vardiyadevir.config;

import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class FormSchemaProvider {

    // Katalog ekranında listelenecek form özetleri
    public List<Map<String, String>> getTemplatesForUnit(String unit) {
        if ("UKOM".equalsIgnoreCase(unit)) {
            return List.of(
                Map.of("id", "t3a", "title", "T3A Vardiya Devir Formu", "description", "T3A Operasyonları, SCC ve Anomali Kontrolleri"),
                Map.of("id", "t4a", "title", "T4A Vardiya Devir Formu", "description", "T4A Operasyonları ve Telemetri Kontrolleri"),
                Map.of("id", "t4b", "title", "T4B Vardiya Devir Formu", "description", "T4B OOL, Hifly ve İstasyon Kontrolleri"),
                Map.of("id", "t5a", "title", "T5A Vardiya Devir Formu", "description", "T5A STR Minor/Major ve Hifly Kontrolleri")
            );
        } else if ("UHGM".equalsIgnoreCase(unit)) {
            return List.of(
                Map.of("id", "cmc_daily", "title", "CMC Günlük Kontrol Formu", "description", "TV Wall, Eb/No, IPCam ve Ekipman Kontrolleri")
            );
        }
        return List.of();
    }

    // Seçilen formun detaylı JSON şemasını döndürür
    public String getSchemaForForm(String formId) {
        return switch (formId) {
            case "t3a" -> """
                {
                  "sections": [
                    {
                      "title": "1. Genel Bilgiler ve Operasyonlar",
                      "fields": [
                        {"key": "active_station", "label": "Active Station", "type": "radio", "options": ["GOLBASI", "ODTU"], "required": true},
                        {"key": "t3a_in_progress", "label": "T3A operation(s) in progress", "type": "radio", "options": ["No", "Yes"], "required": true},
                        {"key": "t3a_in_progress_details", "label": "Operation Details", "type": "text", "dependsOn": "t3a_in_progress:Yes"}
                      ]
                    },
                    {
                      "title": "2. Anomali ve Alarm Kontrolleri",
                      "fields": [
                        {"key": "wait_alarms", "label": "Wait 32 seconds and check alarms", "type": "radio", "options": ["No", "Yes", "Traced", "Noted"], "required": true},
                        {"key": "other_anomalies", "label": "Other anomalies", "type": "radio", "options": ["No", "Yes"], "required": true},
                        {"key": "anomalies_details", "label": "Anomaly Details", "type": "text", "dependsOn": "other_anomalies:Yes"}
                      ]
                    }
                  ]
                }
                """;
            case "cmc_daily" -> """
                {
                  "sections": [
                    {
                      "title": "1. Devralan Grup Sistem Kontrolleri",
                      "fields": [
                        {"key": "tv_wall_status", "label": "TV Wall Sistemi Görsel Kontrolü", "type": "radio", "options": ["İyi", "Kötü"], "required": true},
                        {"key": "tv_wall_issues", "label": "Problemli Kanallar", "type": "text", "dependsOn": "tv_wall_status:Kötü"},
                        {"key": "eb_no_status", "label": "Eb/No Programı (Ankara 2.4m)", "type": "radio", "options": ["Çalışıyor", "Çalışmıyor"], "required": true}
                      ]
                    },
                    {
                      "title": "2. Ekipman ve Anten Kontrolleri",
                      "fields": [
                        {"key": "antenna_signal", "label": "Antenlerin Alış Sinyal Seviyeleri", "type": "radio", "options": ["İyi", "Kötü"], "required": true},
                        {"key": "f43_carrier", "label": "TKS.F43 İle Uyduya Taşıyıcı Çıkılıyor mu?", "type": "radio", "options": ["Hayır", "Evet"], "required": true},
                        {"key": "f43_details", "label": "Uydu / CF / Pol Bilgileri", "type": "text", "dependsOn": "f43_carrier:Evet"}
                      ]
                    }
                  ]
                }
                """;
            // T4B, T5A ve T4A için geçici taslaklar (Daha sonra içlerini senaryona göre doldurabiliriz)
            case "t4b", "t5a", "t4a" -> "{\"sections\":[{\"title\":\"Test Section\",\"fields\":[{\"key\":\"test\",\"label\":\"Test Field\",\"type\":\"text\"}]}]}";
            default -> "{}";
        };
    }
}