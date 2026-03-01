import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/index.js';

/**
 * Email delivery provider.
 *
 * Uses `nodemailer` with SMTP transport.  The transporter is created once
 * and kept alive so the connection pool is reused across calls.
 */
export class EmailProvider {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      // Port 465 uses implicit TLS; everything else expects STARTTLS or plain.
      secure: config.SMTP_PORT === 465,
      auth: config.SMTP_USER
        ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
        : undefined,
    });
  }

  /**
   * Send an email.
   *
   * @param to      - Recipient address.
   * @param subject - Email subject line.
   * @param html    - HTML body.
   * @param text    - Optional plain-text fallback body.
   * @returns The SMTP message ID assigned by the server.
   * @throws When the SMTP server rejects the message.
   */
  async send(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ success: boolean; messageId: string }> {
    const info = await this.transporter.sendMail({
      from: config.SMTP_FROM,
      to,
      subject,
      html,
      ...(text && { text }),
    });

    return { success: true, messageId: info.messageId as string };
  }

  /** Verify SMTP connectivity (useful in health-checks). */
  async verify(): Promise<void> {
    await this.transporter.verify();
  }
}

export const emailProvider = new EmailProvider();
