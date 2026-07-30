package com.example.vardiyadevir.repository;

import com.example.vardiyadevir.entity.ShiftForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.ZonedDateTime;
import java.util.List;

@Repository
public interface ShiftFormRepository extends JpaRepository<ShiftForm, Long> {
    // Sadece silinmemiş formları getirme (Soft Delete kontrolü)
    List<ShiftForm> findByIsDeletedFalse();

    // Yönetici: sadece kendi biriminin formları
    List<ShiftForm> findByIsDeletedFalseAndUnit_Name(String unitName);

    // Personel: sadece kendi oluşturduğu formlar
    List<ShiftForm> findByIsDeletedFalseAndTransferorUser_Id(Long userId);

    // Alan geçmişi (rehber): aynı form şablonuna ait, belirli bir tarihten sonraki kayıtlar
    List<ShiftForm> findByIsDeletedFalseAndFormDefinition_MenuKeyAndRecordDateAfterOrderByRecordDateDesc(
            String menuKey, ZonedDateTime after);
}