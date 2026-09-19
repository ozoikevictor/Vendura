import { config } from "../config.js";

type EmailInput = { to: string; subject: string; html: string; tag: string };

export async function sendEmail(input: EmailInput) {
  if (!config.RESEND_API_KEY) {
    if (config.NODE_ENV === "production") throw new Error("Email delivery is not configured");
    return { id: "development-email", delivered: false };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      tags: [{ name: "category", value: input.tag }]
    })
  });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status})`);
  return { ...(await response.json() as { id: string }), delivered: true };
}

export const verificationEmail = (name: string, code: string) => emailFrame(
  "Verify your Vendura email",
  `<p style="margin:0 0 18px">Hello ${escapeHtml(name)},</p><p style="margin:0 0 22px">Use this code to verify your Vendura account. It expires in 10 minutes.</p><div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#0d8a4b;background:#edf8f1;border:1px solid #b9dfc8;border-radius:8px;padding:18px;text-align:center">${code}</div><p style="margin:22px 0 0;color:#64736a;font-size:13px">If you did not create this account, you can ignore this email.</p>`
);

export const resetEmail = (name: string, resetUrl: string) => emailFrame(
  "Reset your Vendura password",
  `<p style="margin:0 0 18px">Hello ${escapeHtml(name)},</p><p style="margin:0 0 22px">We received a request to reset your Vendura password. This link expires in 30 minutes and can only be used once.</p><p style="margin:0 0 22px"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#0d8a4b;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:7px">Reset password</a></p><p style="margin:0;color:#64736a;font-size:13px">If you did not request this, your password has not changed.</p>`
);

function emailFrame(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f7f4;font-family:Arial,sans-serif;color:#142019"><div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #dfe8e2;border-radius:10px;overflow:hidden"><div style="padding:20px 26px;background:#0d8a4b;color:#fff;font-size:20px;font-weight:800">Vendura</div><div style="padding:28px 26px"><h1 style="font-size:22px;margin:0 0 20px">${title}</h1>${body}</div></div></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}
