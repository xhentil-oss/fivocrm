import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, teamName, inviteLink, senderName } = req.body;

  if (!to || !teamName || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Konfiguro SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.fivoo.net',        // p.sh. smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true', // true për port 465
    auth: {
      user: process.env.SMTP_USER || 'crm@fivoo.net',      // email juaj
      pass: process.env.SMTP_PASS || 'Vercel@2024@',      // password ose app password
    },
  });

  try {
    await transporter.sendMail({
      from: `"${senderName || 'FivoCRM'}" <${process.env.SMTP_USER}>`,
      to,
      subject: `Ftesë për tu bashkuar me ekipin "${teamName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Ke marrë një ftesë!</h2>
          <p>Je ftuar të bashkohesh me ekipin <strong>${teamName}</strong> në FivoCRM.</p>
          <a href="${inviteLink}" 
             style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Prano Ftesën
          </a>
          <p style="color: #666; font-size: 14px;">Ose kopjo këtë link: ${inviteLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">Nëse nuk e ke kërkuar këtë ftesë, injoroje këtë email.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
