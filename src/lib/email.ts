import "server-only";

/**
 * Thin wrapper around Resend, mirroring lib/sms.ts: if RESEND_API_KEY isn't
 * set, sends are simulated and logged instead of failing. This is the
 * no-phone-number alternative channel — a member with an email but no phone
 * (or vice versa) still gets reached.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; simulated: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log(`[email:simulated] to=${to} subject="${subject}" body="${body}"`);
    return { ok: true, simulated: true };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({ to, from, subject, text: body });
    return { ok: true, simulated: false };
  } catch (err) {
    return { ok: false, simulated: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
