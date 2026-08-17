import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function run() {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'chandimacbbandara@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email.'
    });
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Email failed:", err);
  }
}

run();
