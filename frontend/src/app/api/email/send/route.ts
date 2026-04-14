import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/email/send
 * Mock email send endpoint.
 * In production: integrate with Google Gmail API, Microsoft Graph, or Nodemailer (SMTP).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  const { from, to, subject, body: emailBody } = body as {
    from: string;
    to: string;
    subject: string;
    body: string;
  };

  if (!to || !from) {
    return NextResponse.json({ error: 'Missing required fields: from, to' }, { status: 400 });
  }

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600));

  // In production, this is where you'd call:
  //   Gmail:   gmail.users.messages.send(...)
  //   Outlook: graph.api('/me/sendMail').post(...)
  //   SMTP:    transporter.sendMail({ from, to, subject, text: emailBody })
  console.log(`[EMAIL] ${from} → ${to} | Subject: ${subject} | Length: ${emailBody?.length ?? 0} chars`);

  return NextResponse.json({
    success: true,
    messageId: `msg_${crypto.randomUUID()}`,
    sentAt: new Date().toISOString(),
    from,
    to,
    subject,
  });
}
