package com.example.vardiyadevir.repository;

import com.example.vardiyadevir.entity.FormAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FormAttachmentRepository extends JpaRepository<FormAttachment, Long> {
    List<FormAttachment> findByShiftForm_IdOrderByUploadedAtAsc(Long shiftFormId);
}
