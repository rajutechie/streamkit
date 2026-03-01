package com.rajutechie.streamkit.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateStreamRequest(
    @NotBlank(message = "Stream title is required")
    @Size(max = 120, message = "Title must not exceed 120 characters")
    String title,

    String visibility
) {}
