import nodemailer from "nodemailer";

function getMailEnv() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("Missing Gmail SMTP env vars. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  return { user, pass };
}

export function createTransporter() {
  const { user, pass } = getMailEnv();
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
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
  const transporter = createTransporter();
  return await transporter.sendMail({
    from: `"SM FITNESS" <${user}>`,
    to,
    subject,
    html,
  });
}

