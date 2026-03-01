export const config = {
  /** HTTP server port */
  PORT: parseInt(process.env.PORT ?? '3016', 10),

  /** Redis connection URL */
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',

  /** Kafka broker addresses */
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),

  /** Primary database connection URL */
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/rajutechie-streamkit_notifications',

  // ── FCM ────────────────────────────────────────────────────────────────

  /** Firebase Cloud Messaging project ID */
  FCM_PROJECT_ID: process.env.FCM_PROJECT_ID ?? '',

  /** Firebase Admin SDK service account client email */
  FCM_CLIENT_EMAIL: process.env.FCM_CLIENT_EMAIL ?? '',

  /** Firebase Admin SDK service account private key (newlines escaped as \\n) */
  FCM_PRIVATE_KEY: process.env.FCM_PRIVATE_KEY ?? '',

  // ── APNS ───────────────────────────────────────────────────────────────

  /** Apple Push Notification Service key ID */
  APNS_KEY_ID: process.env.APNS_KEY_ID ?? '',

  /** Apple Developer Team ID */
  APNS_TEAM_ID: process.env.APNS_TEAM_ID ?? '',

  /** iOS app bundle identifier */
  APNS_BUNDLE_ID: process.env.APNS_BUNDLE_ID ?? '',

  /** Path to the APNS .p8 auth key file */
  APNS_KEY_PATH: process.env.APNS_KEY_PATH ?? '',

  // ── SMTP ───────────────────────────────────────────────────────────────

  /** SMTP host for email delivery */
  SMTP_HOST: process.env.SMTP_HOST ?? 'localhost',

  /** SMTP port (587 = STARTTLS, 465 = TLS, 25 = plain) */
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),

  /** SMTP authentication username */
  SMTP_USER: process.env.SMTP_USER ?? '',

  /** SMTP authentication password */
  SMTP_PASS: process.env.SMTP_PASS ?? '',

  /** Sender address for outbound emails */
  SMTP_FROM: process.env.SMTP_FROM ?? 'noreply@rajutechie-streamkit.dev',
} as const;
