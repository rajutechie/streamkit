package com.rajutechie.streamkit.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateCallRequest(
    @NotBlank(message = "Call type is required (audio or video)")
    String type,

    @NotEmpty(message = "At least one participant is required")
    List<String> participants
) {}
