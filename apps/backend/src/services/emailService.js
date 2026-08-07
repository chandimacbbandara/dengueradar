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

/* ─── OTP Email ─────────────────────────────────────────────────── */
export const sendOtpEmail = async (to, otp, name = '') => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  const transporter = createTransporter();
  const displayName = name ? name.split(' ')[0] : 'there';
  const digits = otp.toString().split('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your DengueRadar account</title>
</head>
<body style="margin:0;padding:0;background:#f0fdfd;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfd;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(14,165,165,0.12);">

          <!-- Header banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1f3c 0%,#0EA5A5 100%);padding:40px 40px 32px;text-align:center;">
              <div style="font-size:38px;margin-bottom:10px;">🦟</div>
              <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Dengue<span style="color:#7ff5f5;">Radar</span>
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:6px;letter-spacing:0.12em;text-transform:uppercase;">
                Early Warning System · Sri Lanka
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <p style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 8px;">
                Hey ${displayName}! 👋
              </p>
              <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 32px;">
                Welcome to <strong style="color:#0EA5A5;">DengueRadar</strong>. To keep your account secure,
                please verify your email address using the one-time code below.
                This code is valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <div style="background:linear-gradient(135deg,#f0fdfd,#e0f7f7);border:2px solid #0EA5A5;border-radius:16px;padding:28px 32px;display:inline-block;">
                      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#0EA5A5;margin-bottom:16px;">
                        Your Verification Code
                      </div>
                      <div style="display:flex;gap:8px;justify-content:center;align-items:center;">
                        ${digits.map(d => `
                          <span style="
                            display:inline-block;
                            width:44px;height:56px;line-height:56px;
                            background:#ffffff;
                            border:2px solid #0EA5A5;
                            border-radius:10px;
                            font-size:28px;font-weight:900;
                            color:#0d1f3c;
                            text-align:center;
                            box-shadow:0 4px 12px rgba(14,165,165,0.15);
                          ">${d}</span>
                        `).join('')}
                      </div>
                      <div style="font-size:12px;color:#94A3B8;margin-top:14px;">
                        ⏰ Expires in 10 minutes
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Info cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="48%" style="background:#f8fafc;border-radius:12px;padding:16px;vertical-align:top;">
                    <div style="font-size:20px;margin-bottom:6px;">🛡️</div>
                    <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px;">Secure &amp; Private</div>
                    <div style="font-size:12px;color:#64748B;line-height:1.5;">Never share this code with anyone. DengueRadar staff will never ask for it.</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background:#f8fafc;border-radius:12px;padding:16px;vertical-align:top;">
                    <div style="font-size:20px;margin-bottom:6px;">📍</div>
                    <div style="font-size:13px;font-weight:700;color:#0F172A;margin-bottom:4px;">Zone-Based Alerts</div>
                    <div style="font-size:12px;color:#64748B;line-height:1.5;">Once verified, you'll receive real-time dengue risk updates for your MOH zone.</div>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin:0;">
                If you didn't create a DengueRadar account, you can safely ignore this email.
                No account will be created without verification.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0d1f3c;padding:24px 40px;text-align:center;">
              <div style="font-size:13px;font-weight:700;color:#0EA5A5;margin-bottom:6px;">
                🦟 DengueRadar
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,0.35);line-height:1.6;">
                Protecting communities across Sri Lanka.<br/>
                This is an automated message — please do not reply.
              </div>
            </td>
          </tr>

        </table>

        <!-- Sub-footer -->
        <p style="font-size:11px;color:#94A3B8;margin-top:20px;">
          © ${new Date().getFullYear()} DengueRadar · Sri Lanka Ministry of Health Early Warning System
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `${otp} is your DengueRadar verification code`,
    html,
  });
};

/** @deprecated — kept for backward compat, not used anymore */
export const sendVerificationEmail = sendOtpEmail;
