import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

/**
 * Sends an email using the configured SMTP server.
 * @param to Recipient email address.
 * @param subject Subject of the email.
 * @param text Plain text body of the email.
 * @param html Optional HTML body of the email.
 */
export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"myProse" <no-reply@localhost>',
    to,
    subject,
    text,
    html,
  });
};