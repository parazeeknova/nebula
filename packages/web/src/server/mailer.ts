import { createTransport } from "nodemailer";
import type { Transporter } from "nodemailer";

import { config } from "./config";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!config.smtpUser || !config.smtpPass) {
    throw new Error("SMTP_USER / SMTP_PASS are not configured");
  }
  if (!transporter) {
    transporter = createTransport({
      auth: {
        pass: config.smtpPass,
        user: config.smtpUser,
      },
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
    });
  }
  return transporter;
};

/**
 * Send a plain-text feedback email to the given recipient using the
 * configured Gmail SMTP account. Text only — no attachments.
 */
export const sendFeedback = async (
  recipient: string,
  text: string
): Promise<void> => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("feedback text is empty");
  }
  const mail = getTransporter();
  await mail.sendMail({
    from: `Nebula Feedback <${config.smtpUser}>`,
    subject: "Nebula feedback",
    text: trimmed.slice(0, 5000),
    to: recipient,
  });
};
