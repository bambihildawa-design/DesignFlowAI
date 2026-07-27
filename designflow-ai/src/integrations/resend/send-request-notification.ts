import "server-only";

/**
 * Sends the "new request submitted" email. Guarded so local/dev
 * environments without RESEND_API_KEY set don't crash — they just log and
 * skip, which matters because this fires from inside a plugin request
 * that the requester is waiting on.
 */
export async function sendRequestNotificationEmail(params: {
  to: string[];
  projectName: string;
  requesterName: string;
  figmaLink: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[resend] RESEND_API_KEY not set — skipping email notification.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "DesignFlow AI <notifications@resend.dev>",
      to: params.to,
      subject: `New carousel request: ${params.projectName}`,
      html: `<p><strong>${params.requesterName}</strong> submitted a new carousel request: <strong>${params.projectName}</strong>.</p><p><a href="${params.figmaLink}">Open in Figma</a></p>`,
    }),
  });

  if (!res.ok) {
    console.error("[resend] Failed to send notification email:", await res.text());
  }
}
