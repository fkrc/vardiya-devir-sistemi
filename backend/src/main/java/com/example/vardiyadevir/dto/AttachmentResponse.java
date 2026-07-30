package com.example.vardiyadevir.dto;

import lombok.Data;
import java.time.ZonedDateTime;

@Data
public class AttachmentResponse {
    private Long id;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private ZonedDateTime uploadedAt;
}
