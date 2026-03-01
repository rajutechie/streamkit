import { Router } from 'express';
import { RajutechieStreamKitServer } from '@rajutechie-streamkit/server-sdk';
import type { ServerConfig } from '@rajutechie-streamkit/server-sdk';

/**
 * Creates a fully-featured Express Router that exposes StreamKit backend
 * operations as REST endpoints.  Mount it at any path in your app:
 *
 * ```ts
 * app.use('/streamkit', createRajutechieStreamKitRouter({ apiKey, apiSecret, apiUrl }));
 * ```
 */
export function createRajutechieStreamKitRouter(config: ServerConfig): Router {
  const router = Router();
  const server = new RajutechieStreamKitServer(config);

  // ── Auth ────────────────────────────────────────────────────────────────

  /** POST /token — Generate a signed user token */
  router.post('/token', (req, res) => {
    try {
      const { userId, role, expiresIn, grants } = req.body;
      if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
      const token = server.generateToken({ userId, role, expiresIn, grants });
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Users ───────────────────────────────────────────────────────────────

  /** POST /users — Create a user */
  router.post('/users', async (req, res) => {
    try {
      const user = await server.users.create(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /users/:userId — Get a user */
  router.get('/users/:userId', async (req, res) => {
    try {
      const user = await server.users.get(req.params.userId);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /users — List users */
  router.get('/users', async (req, res) => {
    try {
      const { limit, after, appId } = req.query as Record<string, string>;
      const users = await server.users.list({ limit: limit ? Number(limit) : undefined, after, appId });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** PATCH /users/:userId — Update a user */
  router.patch('/users/:userId', async (req, res) => {
    try {
      const user = await server.users.update(req.params.userId, req.body);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /users/:userId — Delete a user */
  router.delete('/users/:userId', async (req, res) => {
    try {
      await server.users.delete(req.params.userId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /users/:userId/devices — Register a push device token */
  router.post('/users/:userId/devices', async (req, res) => {
    try {
      const result = await server.users.registerDevice(req.params.userId, req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /users/:userId/devices/:deviceId — Remove a device token */
  router.delete('/users/:userId/devices/:deviceId', async (req, res) => {
    try {
      await server.users.removeDevice(req.params.userId, req.params.deviceId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Channels / Chat ─────────────────────────────────────────────────────

  /** POST /channels — Create a channel */
  router.post('/channels', async (req, res) => {
    try {
      const channel = await server.chat.createChannel(req.body);
      res.status(201).json(channel);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /channels/:channelId — Delete a channel */
  router.delete('/channels/:channelId', async (req, res) => {
    try {
      await server.chat.deleteChannel(req.params.channelId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /channels/:channelId/messages — Send a message (server-side) */
  router.post('/channels/:channelId/messages', async (req, res) => {
    try {
      const message = await server.chat.sendMessage(req.params.channelId, req.body);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Calls ───────────────────────────────────────────────────────────────

  /** POST /calls — Create/initiate a call */
  router.post('/calls', async (req, res) => {
    try {
      const call = await server.calls.create(req.body);
      res.status(201).json(call);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /calls — List calls */
  router.get('/calls', async (req, res) => {
    try {
      const { userId, status, limit } = req.query as Record<string, string>;
      const calls = await server.calls.list({ userId, status, limit: limit ? Number(limit) : undefined });
      res.json(calls);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /calls/:callId — Get a call */
  router.get('/calls/:callId', async (req, res) => {
    try {
      const call = await server.calls.get(req.params.callId);
      res.json(call);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /calls/:callId/end — End a call */
  router.post('/calls/:callId/end', async (req, res) => {
    try {
      await server.calls.end(req.params.callId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /calls/:callId/recording/start — Start recording */
  router.post('/calls/:callId/recording/start', async (req, res) => {
    try {
      await server.calls.startRecording(req.params.callId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /calls/:callId/recording/stop — Stop recording */
  router.post('/calls/:callId/recording/stop', async (req, res) => {
    try {
      await server.calls.stopRecording(req.params.callId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Meetings ────────────────────────────────────────────────────────────

  /** POST /meetings — Schedule a meeting */
  router.post('/meetings', async (req, res) => {
    try {
      const meeting = await server.meetings.schedule(req.body);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /meetings — List meetings */
  router.get('/meetings', async (req, res) => {
    try {
      const { hostId, status, limit } = req.query as Record<string, string>;
      const meetings = await server.meetings.list({ hostId, status, limit: limit ? Number(limit) : undefined });
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /meetings/:meetingId — Get a meeting */
  router.get('/meetings/:meetingId', async (req, res) => {
    try {
      const meeting = await server.meetings.get(req.params.meetingId);
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** PATCH /meetings/:meetingId — Update a meeting */
  router.patch('/meetings/:meetingId', async (req, res) => {
    try {
      const meeting = await server.meetings.update(req.params.meetingId, req.body);
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /meetings/:meetingId — Cancel a meeting */
  router.delete('/meetings/:meetingId', async (req, res) => {
    try {
      await server.meetings.cancel(req.params.meetingId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /meetings/:meetingId/end — End a live meeting */
  router.post('/meetings/:meetingId/end', async (req, res) => {
    try {
      await server.meetings.end(req.params.meetingId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /meetings/:meetingId/participants — Add a participant */
  router.post('/meetings/:meetingId/participants', async (req, res) => {
    try {
      const { userId, role } = req.body;
      await server.meetings.addParticipant(req.params.meetingId, userId, role);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /meetings/:meetingId/participants/:userId — Remove a participant */
  router.delete('/meetings/:meetingId/participants/:userId', async (req, res) => {
    try {
      await server.meetings.removeParticipant(req.params.meetingId, req.params.userId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /meetings/:meetingId/mute-all — Mute all participants */
  router.post('/meetings/:meetingId/mute-all', async (req, res) => {
    try {
      await server.meetings.muteAll(req.params.meetingId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Live Streams ────────────────────────────────────────────────────────

  /** POST /streams — Create a stream */
  router.post('/streams', async (req, res) => {
    try {
      const stream = await server.streams.create(req.body);
      res.status(201).json(stream);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /streams — List streams */
  router.get('/streams', async (req, res) => {
    try {
      const { status, limit } = req.query as Record<string, string>;
      const streams = await server.streams.list({ status, limit: limit ? Number(limit) : undefined });
      res.json(streams);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /streams/:streamId — Get a stream */
  router.get('/streams/:streamId', async (req, res) => {
    try {
      const stream = await server.streams.get(req.params.streamId);
      res.json(stream);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /streams/:streamId/start — Go live */
  router.post('/streams/:streamId/start', async (req, res) => {
    try {
      const result = await server.streams.start(req.params.streamId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /streams/:streamId/stop — End the stream */
  router.post('/streams/:streamId/stop', async (req, res) => {
    try {
      await server.streams.stop(req.params.streamId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /streams/:streamId — Delete a stream */
  router.delete('/streams/:streamId', async (req, res) => {
    try {
      await server.streams.delete(req.params.streamId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Moderation ──────────────────────────────────────────────────────────

  /** POST /moderation/bans — Ban a user */
  router.post('/moderation/bans', async (req, res) => {
    try {
      const ban = await server.moderation.banUser(req.body);
      res.status(201).json(ban);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /moderation/bans — List bans */
  router.get('/moderation/bans', async (req, res) => {
    try {
      const { userId, channelId } = req.query as Record<string, string>;
      const bans = await server.moderation.listBans({ userId, channelId });
      res.json(bans);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /moderation/bans/:banId — Unban */
  router.delete('/moderation/bans/:banId', async (req, res) => {
    try {
      await server.moderation.unbanUser(req.params.banId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /moderation/rules — Create a moderation rule */
  router.post('/moderation/rules', async (req, res) => {
    try {
      const rule = await server.moderation.createRule(req.body);
      res.status(201).json(rule);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /moderation/rules — List all rules */
  router.get('/moderation/rules', async (_req, res) => {
    try {
      const rules = await server.moderation.listRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** DELETE /moderation/rules/:ruleId — Delete a rule */
  router.delete('/moderation/rules/:ruleId', async (req, res) => {
    try {
      await server.moderation.deleteRule(req.params.ruleId);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /moderation/reports — List reports */
  router.get('/moderation/reports', async (req, res) => {
    try {
      const { status, targetType, limit } = req.query as Record<string, string>;
      const reports = await server.moderation.listReports({ status, targetType, limit: limit ? Number(limit) : undefined });
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** PATCH /moderation/reports/:reportId — Resolve a report */
  router.patch('/moderation/reports/:reportId', async (req, res) => {
    try {
      const { resolution } = req.body;
      await server.moderation.resolveReport(req.params.reportId, resolution);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ── Notifications ───────────────────────────────────────────────────────

  /** POST /notifications/send — Send a notification to a user */
  router.post('/notifications/send', async (req, res) => {
    try {
      const result = await server.notifications.send(req.body);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** POST /notifications/bulk — Send notifications in bulk */
  router.post('/notifications/bulk', async (req, res) => {
    try {
      const { notifications } = req.body;
      const result = await server.notifications.sendBulk(notifications);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** GET /notifications/preferences/:userId — Get preferences */
  router.get('/notifications/preferences/:userId', async (req, res) => {
    try {
      const prefs = await server.notifications.getPreferences(req.params.userId);
      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /** PATCH /notifications/preferences/:userId — Update preferences */
  router.patch('/notifications/preferences/:userId', async (req, res) => {
    try {
      await server.notifications.updatePreferences(req.params.userId, req.body);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
