package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.LoginRequest;
import com.rajutechie.streamkit.example.dto.RegisterRequest;
import com.rajutechie.streamkit.example.model.User;
import com.rajutechie.streamkit.example.service.TokenService;
import com.rajutechie.streamkit.example.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final TokenService tokenService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest request) {

        return userService.authenticate(request.getUsername(), request.getPassword())
                .map(user -> {
                    String rajutechieStreamKitToken = tokenService.generateUserToken(user.getId());
                    log.info("User logged in: {} ({})", user.getUsername(), user.getId());

                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("user", userToMap(user));
                    data.put("token", rajutechieStreamKitToken);

                    return ResponseEntity.ok(ApiResponse.ok("Login successful", data));
                })
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("Invalid username or password")));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
            @Valid @RequestBody RegisterRequest request) {

        return userService.register(
                        request.getUsername(),
                        request.getPassword(),
                        request.getDisplayName())
                .map(user -> {
                    String rajutechieStreamKitToken = tokenService.generateUserToken(user.getId());
                    log.info("User registered: {} ({})", user.getUsername(), user.getId());

                    Map<String, Object> data = new LinkedHashMap<>();
                    data.put("user", userToMap(user));
                    data.put("token", rajutechieStreamKitToken);

                    return ResponseEntity
                            .status(HttpStatus.CREATED)
                            .body(ApiResponse.ok("Registration successful", data));
                })
                .orElseGet(() -> ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body(ApiResponse.error("Username already taken")));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listUsers() {
        List<Map<String, Object>> users = userService.findAll().stream()
                .map(this::userToMap)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    // ------------------------------------------------------------------ //

    private Map<String, Object> userToMap(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("displayName", user.getDisplayName());
        map.put("avatarUrl", user.getAvatarUrl());
        map.put("online", user.isOnline());
        map.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        map.put("lastSeenAt", user.getLastSeenAt() != null ? user.getLastSeenAt().toString() : null);
        return map;
    }
}
