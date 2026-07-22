package com.example.vardiyadevir.repository;

import com.example.vardiyadevir.entity.ShiftForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftFormRepository extends JpaRepository<ShiftForm, Long> {
    // Sadece silinmemiş formları getirme (Soft Delete kontrolü)
    List<ShiftForm> findByIsDeletedFalse();
}