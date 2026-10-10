import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { imageSize } from 'image-size';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { appUrl, siteConfig } from '@/config/site';
import { CODE_LIFETIME_MINUTES } from './tokens';

/** What an email says. `sendEmail` lays it out in the app's dark theme. */
export type EmailMessage = {
  to: string;
  subject: string;
  /** The line inboxes show after the subject. */
  preview: string;
  /** Small orchid label above the title. */
  eyebrow: string;
  title: string;
  paragraphs: string[];
  /** A 6-digit code, shown as six boxes like the code boxes in the app. */
  code?: string;
  action?: { label: string; url: string };
  note?: string;
};

/**
 * Sends through Gmail when `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set, otherwise through
 * Resend when `RESEND_API_KEY` is set. With neither, development prints the email to the
 * server console so codes and links can be used by hand.
 */
export async function sendEmail(message: EmailMessage) {
  const text = renderText(message);
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''); // Google shows it in groups of 4
  const resendKey = process.env.RESEND_API_KEY;

  if (!(gmailUser && gmailPassword) && !resendKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[email] No email service is set up; "${message.subject}" was not sent.`);
    } else {
      console.info(`[email] To: ${message.to}\n[email] Subject: ${message.subject}\n${text}`);
    }
    return;
  }

  const logos = await loadLogos();
  const html = renderHtml(message, logos);

  if (gmailUser && gmailPassword) {
    // Gmail's SMTP server with an App Password (Google Account → Security → App passwords).
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPassword } });
    try {
      await transport.sendMail({
        from: { name: siteConfig.name, address: gmailUser },
        to: message.to,
        subject: message.subject,
        text,
        html,
        attachments: logos?.map((logo) => ({ filename: logo.file, content: logo.content, contentType: 'image/png', cid: logo.id })),
      });
    } catch (error) {
      throw new Error(`Gmail failed to send "${message.subject}": ${(error as Error).message}`);
    }
    return;
  }

  const { error } = await new Resend(resendKey).emails.send({
    from: process.env.EMAIL_FROM || `${siteConfig.name} <onboarding@resend.dev>`,
    to: message.to,
    subject: message.subject,
    text,
    html,
    attachments: logos?.map((logo) => ({
      filename: logo.file,
      content: logo.content,
      contentType: 'image/png',
      inlineContentId: logo.id,
    })),
  });
  if (error) throw new Error(`Resend failed to send "${message.subject}": ${error.message}`);
}

// ---- Messages ------------------------------------------------------------------------------

export function signUpCodeEmail(to: string, code: string): EmailMessage {
  return {
    to,
    subject: `${code} is your ${siteConfig.name} code`,
    preview: `Enter ${code} to finish signing up.`,
    eyebrow: 'Verify your email',
    title: 'Finish signing up',
    paragraphs: [`Enter this code on ${siteConfig.name} to confirm your email and create your account.`],
    code,
    note: `The code works for ${CODE_LIFETIME_MINUTES} minutes. If you didn't try to sign up, ignore this email. No account is made without the code.`,
  };
}

export function passwordResetCodeEmail(to: string, code: string): EmailMessage {
  return {
    to,
    subject: `${code} is your ${siteConfig.name} password reset code`,
    preview: `Enter ${code} to choose a new password.`,
    eyebrow: 'Password reset',
    title: 'Reset your password',
    paragraphs: [`Someone asked to reset the password for your ${siteConfig.name} account. Enter this code to choose a new one.`],
    code,
    note: `The code works for ${CODE_LIFETIME_MINUTES} minutes. If this wasn't you, ignore this email. Your password stays the same.`,
  };
}

/** For accounts made before sign-up codes, which can still confirm their email from Settings. */
export function verificationEmail(to: string, token: string): EmailMessage {
  return {
    to,
    subject: `Verify your email for ${siteConfig.name}`,
    preview: 'Confirm this is your email address.',
    eyebrow: 'Verify your email',
    title: 'Confirm your email',
    paragraphs: [`Tap the button to confirm this is the email address for your ${siteConfig.name} account.`],
    action: { label: 'Verify email', url: appUrl(`/verify-email?token=${token}`) },
    note: "The link works for 24 hours. If you didn't ask for this, ignore this email.",
  };
}

// ---- Layout --------------------------------------------------------------------------------

// The app's Neon Orchid colors (globals.css). Email clients can't read CSS variables, so they're repeated here.
const COLOR = {
  base: '#000000',
  surface: '#121212',
  elevated: '#1f1f1f',
  highlight: '#2a2a2a',
  text: '#ffffff',
  subdued: '#b3b3b3',
  muted: '#7a7a7a',
  primary: '#d16bff',
  onPrimary: '#000000',
};
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

// The logo travels inside each email (referenced as cid:…), so it shows even in development and
// follows changes to the files in src/assets/brand.
const LOGOS = [
  { id: 'adonic-mark', file: 'logo.png', height: 30 },
  { id: 'adonic-name', file: 'logo-name.png', height: 36 },
];
type Logo = (typeof LOGOS)[number] & { content: Buffer; width: number };

export async function loadLogos(): Promise<Logo[] | null> {
  try {
    return await Promise.all(
      LOGOS.map(async (logo) => {
        const content = await readFile(path.join(process.cwd(), 'src', 'assets', 'brand', logo.file));
        const size = imageSize(content);
        return { ...logo, content, width: Math.round((size.width * logo.height) / size.height) };
      }),
    );
  } catch {
    return null; // e.g. a host that doesn't ship src/: the email shows the name as text instead
  }
}

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

/** The email's HTML. Exported so the design can be previewed; `sendEmail` is what sends it. */
export function renderHtml(message: EmailMessage, logos: Logo[] | null) {
  const brand = logos
    ? logos
        .map(
          (logo, index) =>
            `<img src="cid:${logo.id}" width="${logo.width}" height="${logo.height}" alt="${index === 1 ? escape(siteConfig.name) : ''}" style="display:inline-block;vertical-align:middle;border:0;outline:none;${index ? 'margin-left:8px;' : ''}">`,
        )
        .join('')
    : `<span style="font:800 26px/1 ${FONT};letter-spacing:-0.02em;color:${COLOR.text};">${escape(siteConfig.name)}</span>`;

  const paragraphs = message.paragraphs
    .map((paragraph) => `<p style="margin:14px 0 0;font:400 15px/1.6 ${FONT};color:${COLOR.subdued};">${escape(paragraph)}</p>`)
    .join('');

  // Each digit in its own dark box. They're inline, so copying the code still gives "123456".
  const code = message.code
    ? `<div style="margin:30px 0 6px;text-align:center;white-space:nowrap;">${[...message.code]
        .map(
          (digit) =>
            `<span style="display:inline-block;width:40px;margin:0 3px;padding:13px 0;background:${COLOR.elevated};border:1px solid #3a3a3a;border-radius:8px;font:700 26px/1 ${MONO};color:${COLOR.text};text-align:center;">${digit}</span>`,
        )
        .join('')}</div>`
    : '';

  const action = message.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 6px;"><tr><td bgcolor="${COLOR.primary}" style="border-radius:999px;background:${COLOR.primary};"><a href="${escape(message.action.url)}" style="display:inline-block;padding:15px 34px;font:700 15px/1 ${FONT};color:${COLOR.onPrimary};text-decoration:none;border-radius:999px;">${escape(message.action.label)}</a></td></tr></table>`
    : '';

  const note = message.note
    ? `<p style="margin:22px 0 0;padding-top:22px;border-top:1px solid ${COLOR.highlight};font:400 13px/1.6 ${FONT};color:${COLOR.muted};">${escape(message.note)}</p>`
    : '';

  return `<!doctype html>
<html lang="en" style="background:${COLOR.base};">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escape(message.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&display=swap" rel="stylesheet">
<style>@media (max-width:520px){.card{padding:32px 22px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${COLOR.base};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${COLOR.base};">${escape(message.preview)}${'&#8199;&#847;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLOR.base}" style="background:${COLOR.base};">
<tr><td align="center" style="padding:40px 16px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td style="padding:0 4px 24px;">${brand}</td></tr>
<tr><td class="card" bgcolor="${COLOR.surface}" style="background:${COLOR.surface};border-radius:16px;padding:40px 36px;">
<p style="margin:0 0 12px;font:700 12px/1 ${FONT};letter-spacing:0.12em;text-transform:uppercase;color:${COLOR.primary};">${escape(message.eyebrow)}</p>
<h1 style="margin:0;font:800 28px/1.2 ${FONT};letter-spacing:-0.02em;color:${COLOR.text};">${escape(message.title)}</h1>
${paragraphs}${code}${action}${note}
</td></tr>
<tr><td style="padding:24px 4px 0;font:400 12px/1.6 ${FONT};color:${COLOR.muted};">${escape(siteConfig.description)}<br>© ${new Date().getFullYear()} ${escape(siteConfig.name)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(message: EmailMessage) {
  return [
    message.title,
    ...message.paragraphs,
    message.code && `Your code: ${message.code}`,
    message.action && `${message.action.label}: ${message.action.url}`,
    message.note,
    `— ${siteConfig.name}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
