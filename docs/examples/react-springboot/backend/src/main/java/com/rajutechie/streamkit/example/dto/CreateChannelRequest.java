package com.rajutechie.streamkit.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateChannelRequest(
    @NotBlank(message = "Channel type is required")
    String type,

    String name,

    String description,

    @NotNull(message = "Members list is required")
    List<String> members
) {}
