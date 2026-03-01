import { WebSocket } from 'ws';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface Peer {
  id: string;
  userId: string;
  displayName: string;
  ws: WebSocket;
  joinedAt: string;
  producerIds: string[];
  consumerIds: string[];
  transportIds: string[];
}

export interface Room {
  id: string;
  type: 'call' | 'meeting' | 'stream';
  participants: Map<string, Peer>;
  routerId?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  RoomManager                                                       */
/* ------------------------------------------------------------------ */

export class RoomManager {
  private rooms = new Map<string, Room>();

  /**
   * Create a new room.  If the room already exists, return the existing one.
   */
  createRoom(roomId: string, roomType: Room['type']): Room {
    const existing = this.rooms.get(roomId);
    if (existing) {
      console.log(`[RoomManager] Room ${roomId} already exists (type=${existing.type})`);
      return existing;
    }

    const room: Room = {
      id: roomId,
      type: roomType,
      participants: new Map(),
      createdAt: new Date().toISOString(),
    };

    this.rooms.set(roomId, room);
    console.log(`[RoomManager] Created room ${roomId} (type=${roomType})`);
    return room;
  }

  /**
   * Add a peer to a room and notify existing participants.
   */
  joinRoom(roomId: string, peerId: string, userId: string, displayName: string, ws: WebSocket): Peer | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`[RoomManager] Cannot join non-existent room ${roomId}`);
      return null;
    }

    // Check if peer is already in the room
    if (room.participants.has(peerId)) {
      console.log(`[RoomManager] Peer ${peerId} already in room ${roomId}`);
      return room.participants.get(peerId)!;
    }

    const peer: Peer = {
      id: peerId,
      userId,
      displayName,
      ws,
      joinedAt: new Date().toISOString(),
      producerIds: [],
      consumerIds: [],
      transportIds: [],
    };

    room.participants.set(peerId, peer);

    // Notify existing participants about the new peer
    this.broadcastToRoom(roomId, peerId, {
      type: 'peer_joined',
      peerId,
      userId,
      displayName,
      timestamp: peer.joinedAt,
    });

    console.log(`[RoomManager] Peer ${peerId} (user=${userId}) joined room ${roomId} (${room.participants.size} participants)`);
    return peer;
  }

  /**
   * Remove a peer from a room.  If the room becomes empty, clean it up.
   */
  leaveRoom(roomId: string, peerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.participants.get(peerId);
    if (!peer) return;

    room.participants.delete(peerId);

    // Notify remaining participants
    this.broadcastToRoom(roomId, peerId, {
      type: 'peer_left',
      peerId,
      userId: peer.userId,
      displayName: peer.displayName,
      timestamp: new Date().toISOString(),
    });

    console.log(`[RoomManager] Peer ${peerId} left room ${roomId} (${room.participants.size} remaining)`);

    // Cleanup empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Room ${roomId} is empty, removed`);
    }
  }

  /**
   * Remove a peer from ALL rooms they belong to.
   */
  removeFromAllRooms(peerId: string): void {
    for (const [roomId] of this.rooms) {
      this.leaveRoom(roomId, peerId);
    }
  }

  /**
   * Get a room by ID.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get participants of a room as an array.
   */
  getRoomParticipants(roomId: string): Peer[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.participants.values());
  }

  /**
   * Broadcast a JSON message to all peers in a room, optionally excluding one.
   */
  broadcastToRoom(roomId: string, excludePeerId: string | null, message: Record<string, unknown>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(message);

    for (const [peerId, peer] of room.participants) {
      if (peerId === excludePeerId) continue;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(data);
      }
    }
  }

  /**
   * Get the peer associated with a specific room.
   */
  getPeer(roomId: string, peerId: string): Peer | undefined {
    return this.rooms.get(roomId)?.participants.get(peerId);
  }

  /**
   * Set the router ID for a room (used after mediasoup router creation).
   */
  setRouterId(roomId: string, routerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.routerId = routerId;
    }
  }

  /**
   * Get total number of active rooms.
   */
  get roomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get total number of connected peers across all rooms.
   */
  get totalPeers(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.participants.size;
    }
    return count;
  }
}

export const roomManager = new RoomManager();
