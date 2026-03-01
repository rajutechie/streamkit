export const config = {
  /** HTTP / WebSocket server port */
  PORT: parseInt(process.env.PORT ?? '3030', 10),

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Secret used to verify JWT tokens on WebSocket connections */
  JWT_SECRET: process.env.JWT_SECRET ?? 'rajutechie-streamkit-dev-secret',

  /** mediasoup worker settings */
  mediasoup: {
    /** Log level for mediasoup workers */
    logLevel: (process.env.MEDIASOUP_LOG_LEVEL ?? 'warn') as 'debug' | 'warn' | 'error' | 'none',

    /** Minimum RTC port for UDP/TCP media traffic */
    rtcMinPort: parseInt(process.env.RTC_MIN_PORT ?? '40000', 10),

    /** Maximum RTC port for UDP/TCP media traffic */
    rtcMaxPort: parseInt(process.env.RTC_MAX_PORT ?? '49999', 10),
  },

  /** WebRTC transport configuration */
  webRtcTransport: {
    /** IP addresses the transport should listen on */
    listenIps: [
      {
        ip: process.env.LISTEN_IP ?? '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP ?? '127.0.0.1',
      },
    ],
    /** Announced IP for NAT traversal */
    announcedIp: process.env.ANNOUNCED_IP ?? '127.0.0.1',
  },

  /** STUN server for ICE candidate gathering */
  STUN_SERVER_URL: process.env.STUN_SERVER_URL ?? 'stun:stun.l.google.com:19302',
} as const;
