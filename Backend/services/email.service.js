/**
 * Transactional email (Gmail via nodemailer).
 *
 * Auth, in order of preference:
 *   1. OAuth2  — GOOGLE_USER + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN
 *   2. App password — GOOGLE_USER + GOOGLE_APP_PASSWORD (Google account → Security → App passwords)
 *
 * Email is strictly best-effort: a missing/broken configuration is logged once at startup and
 * sending becomes a no-op, so signups never fail because of email.
 * Set EMAIL_ENABLED=false to turn it off entirely (the integration tests do this).
 */
const nodemailer = require('nodemailer')
const { welcomeEmail } = require('./emailTemplates/welcome')

// Never email reserved/test domains (RFC 2606) — e.g. accounts created by tests or demos.
const NON_DELIVERABLE_DOMAIN = /@(example\.(com|org|net)|[^@]+\.(test|example|invalid|localhost))$/i

let transporter = null
let status = { ready: false, reason: 'not initialised' }

function emailEnabled() {
  return process.env.EMAIL_ENABLED !== 'false'
}

function buildTransporter() {
  const user = process.env.GOOGLE_USER
  if (!user) return null

  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
      }
    })
  }
  if (process.env.GOOGLE_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: process.env.GOOGLE_APP_PASSWORD }
    })
  }
  return null
}

/** Build the transporter and check the credentials once (called from server.js). */
async function initEmail() {
  if (!emailEnabled()) {
    status = { ready: false, reason: 'disabled (EMAIL_ENABLED=false)' }
    return status
  }
  transporter = buildTransporter()
  if (!transporter) {
    status = { ready: false, reason: 'not configured (set GOOGLE_USER plus OAuth2 credentials or GOOGLE_APP_PASSWORD)' }
    console.warn(`[email] Email ${status.reason}`)
    return status
  }
  try {
    await transporter.verify()
    status = { ready: true, reason: null }
    console.log(`[email] Ready — sending as ${process.env.GOOGLE_USER}`)
  } catch (err) {
    status = { ready: false, reason: err.message }
    const hint = /invalid_grant/i.test(err.message)
      ? ' The GOOGLE_REFRESH_TOKEN is expired/revoked or was issued for a different client id — generate a new one.'
      : ''
    console.warn(`[email] Gmail verification failed: ${err.message}.${hint} Emails will be skipped.`)
  }
  return status
}

/** Send one email. Never throws; returns { success, skipped?, error? }. */
async function sendEmail({ to, subject, html, text = '' }) {
  if (!emailEnabled()) return { success: false, skipped: 'disabled' }
  if (!status.ready || !transporter) return { success: false, skipped: status.reason }
  if (!to || NON_DELIVERABLE_DOMAIN.test(to)) return { success: false, skipped: 'non-deliverable address' }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'IRIS'}" <${process.env.GOOGLE_USER}>`,
      to,
      subject,
      html,
      text
    })
    console.log(`[email] Sent "${subject}" to ${to} (${info.messageId})`)
    return { success: true }
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message)
    return { success: false, error: err.message }
  }
}

/** Fire-and-forget welcome email for a newly created account. */
function sendWelcomeEmail(user) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const { subject, html, text } = welcomeEmail({ name: user.name, appUrl })
  sendEmail({ to: user.email, subject, html, text }).catch(() => {})
}

module.exports = {
  initEmail,
  sendEmail,
  sendWelcomeEmail,
  getEmailStatus: () => status
}
