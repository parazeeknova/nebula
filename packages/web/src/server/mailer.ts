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

/**
 * Send a welcome email to a new Nebula user after they create their account.
 */
export const sendWelcome = async (
  recipient: string,
  name: string
): Promise<void> => {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("name is empty");
  }
  const mail = getTransporter();
  await mail.sendMail({
    from: `Nebula <${config.smtpUser}>`,
    subject: "Welcome to Nebula!",
    text: `Hi ${cleanName},\n\nWelcome to Nebula — one shared AI workspace for your team.\n\nHere's what you can do:\n- @ any agent in a room and it works right there, live.\n- Rooms remember every thread, so your team's knowledge compounds.\n- Ask overlapping questions and Neb merges them into one answer.\n\nStart exploring, and if you have feedback, just use the "Send feedback" option in the sidebar.\n\n— The Nebula team`,
    to: recipient,
  });
};
