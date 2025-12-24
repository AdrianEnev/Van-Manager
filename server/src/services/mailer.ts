import nodemailer from 'nodemailer';
import { loadApiEnv } from '../env';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
    if (_transporter) return _transporter;
    const env = loadApiEnv();
    _transporter = nodemailer.createTransport({
        host: env.SES_SMTP_HOST,
        port: env.SES_SMTP_PORT ?? 587,
        secure: false, // TLS with STARTTLS on port 587
        auth: env.SES_SMTP_USER && env.SES_SMTP_PASS ? { user: env.SES_SMTP_USER, pass: env.SES_SMTP_PASS } : undefined,
    });
    return _transporter;
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string; fromName?: string }) {
    const env = loadApiEnv();
    const fromEmail = env.EMAIL_FROM;
    if (!fromEmail) throw new Error('EMAIL_FROM not configured');
    const fromName = opts.fromName || env.EMAIL_FROM_NAME || undefined;
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
    const transporter = getTransporter();
    return transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
    });
}

export async function sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
    const { to, name, resetUrl } = params;
    const subject = 'Reset your password';
    const text = `Hi ${name},\n\nClick the link below to reset your password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
    const html = `
    <p>Hi ${name},</p>
    <p>Click the button below to reset your password:</p>
    <p><a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
    <p>Or copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
    return sendMail({ to, subject, text, html });
}

export async function sendContactEmail(params: { name: string; email: string; phone?: string; message: string }) {
    const env = loadApiEnv();
    const supportEmail = env.EMAIL_SUPPORT;
    if (!supportEmail) throw new Error('EMAIL_SUPPORT not configured');

    const { name, email, phone, message } = params;
    const subject = `Contact Form Submission from ${name}`;
    const text = `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\nMessage:\n${message}`;
    const html = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${message}</p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px;">This message was sent via the contact form on your website.</p>
  `;
    return sendMail({ to: supportEmail, subject, text, html });
}
