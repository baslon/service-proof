import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Mirrors COMPANY.contactEmail in src/lib/company.js — api/ functions don't
// share code with the frontend bundle, so the address is duplicated here.
const CONTACT_EMAIL = 'contact@baslondigital.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email sending is not configured yet' })
  }

  const { name, email, company, message } = req.body || {}
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' })
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Provaserve Contact Form <onboarding@resend.dev>',
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `New contact form message from ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, company ? `Company: ${company}` : null, '', message]
        .filter(Boolean)
        .join('\n'),
    })

    if (error) {
      return res.status(502).json({ error: error.message || 'Could not send message' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}
