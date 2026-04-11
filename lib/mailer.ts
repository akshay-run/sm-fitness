import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

function getMailEnv() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing Gmail SMTP env vars. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  return { user, pass };
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!cachedTransporter) {
    const { user, pass } = getMailEnv();
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

export function createTransporter() {
  return getTransporter();
}

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { user } = getMailEnv();
  const transporter = getTransporter();
  return await transporter.sendMail({
    from: `"SM FITNESS" <${user}>`,
    to,
    subject,
    html,
  });
}
