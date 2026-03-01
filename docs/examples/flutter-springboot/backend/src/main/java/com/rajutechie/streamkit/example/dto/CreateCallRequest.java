package com.rajutechie.streamkit.example.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateCallRequest {

    @NotBlank(message = "Call type is required (audio or video)")
    private String type;

    @NotEmpty(message = "At least one participant is required")
    private List<String> participants;
}
