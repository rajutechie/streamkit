package com.rajutechie.streamkit.example.service;

import com.rajutechie.streamkit.example.model.User;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory user management service for the demo.
 *
 * In a production application this would be backed by a database (e.g. JPA repository)
 * and use BCrypt or Argon2 for password hashing.
 */
@Service
public class UserService {

    private final Map<String, User> usersById = new ConcurrentHashMap<>();
    private final Map<String, User> usersByUsername = new ConcurrentHashMap<>();

    public UserService() {
        // Seed some demo users so the app has data out of the box
        createUser("alice", "pass1234", "Alice Johnson");
        createUser("bob", "pass1234", "Bob Smith");
        createUser("charlie", "pass1234", "Charlie Davis");
    }

    /**
     * Create a new user. Returns null if the username is already taken.
     */
    public User createUser(String username, String password, String displayName) {
        if (usersByUsername.containsKey(username.toLowerCase())) {
            return null;
        }

        String id = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String hash = hashPassword(password);
        String name = (displayName != null && !displayName.isBlank())
                ? displayName
                : username;

        User user = new User(id, username.toLowerCase(), hash, name, "user");
        usersById.put(user.getId(), user);
        usersByUsername.put(user.getUsername(), user);
        return user;
    }

    /**
     * Authenticate a user by username and password.
     * Returns the user if credentials are valid, null otherwise.
     */
    public User authenticate(String username, String password) {
        User user = usersByUsername.get(username.toLowerCase());
        if (user == null) {
            return null;
        }
        String hash = hashPassword(password);
        if (!hash.equals(user.getPasswordHash())) {
            return null;
        }
        return user;
    }

    public User findById(String id) {
        return usersById.get(id);
    }

    public User findByUsername(String username) {
        return usersByUsername.get(username.toLowerCase());
    }

    public List<User> listUsers() {
        return new ArrayList<>(usersById.values());
    }

    /**
     * Simple SHA-256 hash for the demo. Use BCrypt/Argon2 in production.
     */
    private String hashPassword(String password) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}
