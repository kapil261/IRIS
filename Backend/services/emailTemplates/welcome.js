/** "Thanks for joining IRIS" onboarding email. Inline styles only — email clients ignore <style>. */

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]))

const FEATURES = [
  {
    icon: '💬',
    title: 'Chat',
    body: 'Ask anything about code, debugging, architecture or ideas — answers stream in real time with syntax-highlighted code.'
  },
  {
    icon: '📚',
    title: 'Docs',
    body: 'Upload PDFs or text files to your Knowledge Base and ask questions about them. Every answer cites the exact passages it used.'
  },
  {
    icon: '🎓',
    title: 'Mentor',
    body: 'Describe a project and IRIS plans a roadmap, then builds it with you one file at a time — with a Code Reviewer checking every file.'
  }
]

function welcomeEmail({ name, appUrl }) {
  const firstName = escapeHtml((name || 'there').split(' ')[0])
  const url = escapeHtml(appUrl)

  const featureRows = FEATURES.map((f) => `
          <tr>
            <td style="padding:12px 0;vertical-align:top;width:40px;font-size:22px;">${f.icon}</td>
            <td style="padding:12px 0;">
              <div style="font-weight:700;color:#f0f0f0;font-size:15px;margin-bottom:4px;">${f.title}</div>
              <div style="color:#b3b3b8;font-size:14px;line-height:1.55;">${f.body}</div>
            </td>
          </tr>`).join('')

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#131314;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#131314;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#1e1e1f;border:1px solid #2c2c2e;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <div style="display:inline-block;background:rgba(221,66,0,0.12);color:#dd4200;font-weight:800;letter-spacing:0.08em;padding:6px 12px;border-radius:999px;font-size:12px;">IRIS v2.0</div>
                <h1 style="color:#f0f0f0;font-size:24px;margin:18px 0 8px;">Welcome to IRIS, ${firstName}! 👋</h1>
                <p style="color:#b3b3b8;font-size:15px;line-height:1.6;margin:0;">
                  Thanks for joining. IRIS is your AI pair-programmer — here's what you can do with it:
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${featureRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;">
                <a href="${url}" style="display:inline-block;background:#dd4200;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;font-size:15px;">Open IRIS</a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px;">
                <p style="color:#7c7c82;font-size:13px;line-height:1.55;margin:0;">
                  Tip: in Chat mode, type <code style="background:#2c2c2e;color:#f0f0f0;padding:1px 6px;border-radius:4px;">/learn &lt;fact&gt;</code> to teach IRIS a new rule.<br/>
                  You're receiving this because an IRIS account was created with this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    `Welcome to IRIS, ${(name || 'there').split(' ')[0]}!`,
    '',
    'Thanks for joining. Here is what you can do:',
    ...FEATURES.map((f) => `- ${f.title}: ${f.body}`),
    '',
    `Open IRIS: ${appUrl}`
  ].join('\n')

  return { subject: 'Welcome to IRIS 🚀 — your AI pair-programmer', html, text }
}

module.exports = { welcomeEmail }
