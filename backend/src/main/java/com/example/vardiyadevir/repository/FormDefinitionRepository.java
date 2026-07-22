package com.example.vardiyadevir.repository;

import com.example.vardiyadevir.entity.FormDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FormDefinitionRepository extends JpaRepository<FormDefinition, Long> {
    // Menü key'ine göre (örn: 'satellite_control') aktif formu bulma
    Optional<FormDefinition> findByMenuKeyAndIsActiveTrue(String menuKey);
}