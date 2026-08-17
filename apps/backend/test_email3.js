import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
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
      subject: 'Test Email 3 (service gmail)',
      text: 'This is a test email using service: gmail.'
    });
    console.log("Email sent successfully!");
  } catch (err) {
    console.error("Email failed:", err);
  }
}

run();
