package com.rajutechie.streamkit.example.controller;

import com.rajutechie.streamkit.example.dto.ApiResponse;
import com.rajutechie.streamkit.example.dto.LoginRequest;
import com.rajutechie.streamkit.example.dto.RegisterRequest;
import com.rajutechie.streamkit.example.model.User;
import com.rajutechie.streamkit.example.service.TokenService;
import com.rajutechie.streamkit.example.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final TokenService tokenService;

    public AuthController(UserService userService, TokenService tokenService) {
        this.userService = userService;
        this.tokenService = tokenService;
    }

    /**
     * POST /api/auth/login
     * Authenticates a user and returns auth + RajutechieStreamKit tokens.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        User user = userService.authenticate(request.username(), request.password());
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username or password"));
        }

        String authToken = tokenService.generateAuthToken(user.getId(), user.getRole());
        String rajutechieStreamKitToken = tokenService.generateRajutechieStreamKitToken(user.getId(), user.getRole());

        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "user", toUserMap(user),
                "authToken", authToken,
                "rajutechieStreamKitToken", rajutechieStreamKitToken
        )));
    }

    /**
     * POST /api/auth/register
     * Creates a new user account and returns auth + RajutechieStreamKit tokens.
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        User user = userService.createUser(
                request.username(),
                request.password(),
                request.displayName()
        );

        if (user == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("Username already taken"));
        }

        String authToken = tokenService.generateAuthToken(user.getId(), user.getRole());
        String rajutechieStreamKitToken = tokenService.generateRajutechieStreamKitToken(user.getId(), user.getRole());

        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(Map.of(
                "user", toUserMap(user),
                "authToken", authToken,
                "rajutechieStreamKitToken", rajutechieStreamKitToken
        )));
    }

    /**
     * GET /api/auth/users
     * Lists all registered users (for the demo user picker).
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> listUsers() {
        List<Map<String, Object>> users = userService.listUsers().stream()
                .map(this::toUserMap)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    private Map<String, Object> toUserMap(User user) {
        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "displayName", user.getDisplayName(),
                "role", user.getRole(),
                "createdAt", user.getCreatedAt().toString()
        );
    }
}
