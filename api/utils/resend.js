import "dotenv/config";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to, subject, html) => {
  try {
    const data = await resend.emails.send({
      from: 'Zeechat <no-reply@zoyoli.com>',
      to: to,
      subject: subject,
      html: html,
    });

    return data;
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
};