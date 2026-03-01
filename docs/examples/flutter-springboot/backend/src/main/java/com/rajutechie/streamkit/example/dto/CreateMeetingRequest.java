package com.rajutechie.streamkit.example.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateMeetingRequest {

    @NotBlank(message = "title is required")
    private String title;

    /** ISO-8601 date-time string, e.g. "2026-04-01T14:00:00Z". Null = start immediately. */
    private String scheduledAt;

    /** Optional room password. */
    private String password;

    @Min(1)
    @Max(480)
    private int durationMins = 60;

    private MeetingSettings settings = new MeetingSettings();

    @Data
    public static class MeetingSettings {
        private boolean muteOnJoin = false;
        private boolean waitingRoom = false;
        private int maxParticipants = 100;
        private boolean recording = false;
    }
}
