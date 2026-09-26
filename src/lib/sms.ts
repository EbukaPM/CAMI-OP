import "server-only";

/**
 * Thin wrapper around Twilio. If TWILIO_* env vars aren't set (e.g. on a
 * temporary preview deploy with no telecom account yet), sends are
 * simulated and logged rather than failing — the PRD only requires that a
 * human confirms the send, not that a live SMS provider is wired up yet.
 */
export async function sendSms(to: string, body: string): Promise<{ ok: boolean; simulated: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[sms:simulated] to=${to} body="${body}"`);
    return { ok: true, simulated: true };
  }

  try {
    const twilio = (await import("twilio")).default(sid, token);
    await twilio.messages.create({ to, from, body });
    return { ok: true, simulated: false };
  } catch (err) {
    return { ok: false, simulated: false, error: err instanceof Error ? err.message : "Unknown SMS error" };
  }
}
