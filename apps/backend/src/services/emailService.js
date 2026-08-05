import nodemailer from 'nodemailer';

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (to, token) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Email verification token for ${to}: ${token}`);
    return;
  }
  const transporter = createTransporter();
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Verify your DengueRadar account',
    html: `
      <h2>Welcome to DengueRadar</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${link}" style="background:#0EA5A5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};
