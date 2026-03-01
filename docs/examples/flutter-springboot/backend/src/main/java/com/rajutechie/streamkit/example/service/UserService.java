package com.rajutechie.streamkit.example.service;

import com.rajutechie.streamkit.example.model.User;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory user management service for the demo.
 *
 * A production application would use a persistent store (database)
 * and proper password hashing (BCrypt).
 */
@Service
public class UserService {

    private final Map<String, User> usersById = new ConcurrentHashMap<>();
    private final Map<String, User> usersByUsername = new ConcurrentHashMap<>();

    public UserService() {
        // Seed some demo users so the app is useful out of the box.
        seedUser("alice", "pass", "Alice Johnson");
        seedUser("bob", "pass", "Bob Smith");
        seedUser("carol", "pass", "Carol Williams");
        seedUser("dave", "pass", "Dave Brown");
    }

    /**
     * Register a new user.
     *
     * @return the newly created user, or empty if the username is taken
     */
    public Optional<User> register(String username, String password, String displayName) {
        if (usersByUsername.containsKey(username.toLowerCase())) {
            return Optional.empty();
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .username(username.toLowerCase())
                .displayName(displayName)
                .password(password) // demo only -- hash in production
                .avatarUrl(null)
                .online(false)
                .createdAt(Instant.now())
                .lastSeenAt(Instant.now())
                .build();

        usersById.put(user.getId(), user);
        usersByUsername.put(user.getUsername(), user);
        return Optional.of(user);
    }

    /**
     * Authenticate a user by username and password.
     *
     * @return the user if credentials match, otherwise empty
     */
    public Optional<User> authenticate(String username, String password) {
        User user = usersByUsername.get(username.toLowerCase());
        if (user != null && user.getPassword().equals(password)) {
            user.setOnline(true);
            user.setLastSeenAt(Instant.now());
            return Optional.of(user);
        }
        return Optional.empty();
    }

    public Optional<User> findById(String id) {
        return Optional.ofNullable(usersById.get(id));
    }

    public Optional<User> findByUsername(String username) {
        return Optional.ofNullable(usersByUsername.get(username.toLowerCase()));
    }

    public List<User> findAll() {
        return List.copyOf(usersById.values());
    }

    public void setOnline(String userId, boolean online) {
        User user = usersById.get(userId);
        if (user != null) {
            user.setOnline(online);
            user.setLastSeenAt(Instant.now());
        }
    }

    // ------------------------------------------------------------------ //

    private void seedUser(String username, String password, String displayName) {
        register(username, password, displayName);
    }
}
