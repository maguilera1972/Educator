const msal = require('@azure/msal-node');

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

let msalClient = null;

function resetMsalClient() {
  msalClient = null;
}

function mailConfig() {
  return {
    enabled: process.env.MAIL_ENABLED !== '0' && process.env.MAIL_ENABLED !== 'false',
    tenantId: process.env.AZURE_TENANT_ID?.trim(),
    clientId: process.env.AZURE_CLIENT_ID?.trim(),
    clientSecret: process.env.AZURE_CLIENT_SECRET?.trim(),
    sendAs: process.env.MAIL_SEND_AS?.trim(),
    from: process.env.MAIL_FROM?.trim() || 'info@eureka-training.online',
    fromName: process.env.MAIL_FROM_NAME?.trim() || 'Eureka Training',
  };
}

function isMailConfigured() {
  const cfg = mailConfig();
  return !!(cfg.tenantId && cfg.clientId && cfg.clientSecret && cfg.sendAs && cfg.from);
}

function getMsalClient() {
  const cfg = mailConfig();
  if (!cfg.tenantId || !cfg.clientId || !cfg.clientSecret) {
    throw new Error('Configuration Microsoft 365 incomplète (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)');
  }

  if (!msalClient) {
    msalClient = new msal.ConfidentialClientApplication({
      auth: {
        clientId: cfg.clientId,
        authority: `https://login.microsoftonline.com/${cfg.tenantId}`,
        clientSecret: cfg.clientSecret,
      },
    });
  }

  return msalClient;
}

async function getGraphAccessToken() {
  const client = getMsalClient();
  const result = await client.acquireTokenByClientCredential({ scopes: [GRAPH_SCOPE] });
  if (!result?.accessToken) {
    throw new Error('Impossible d\'obtenir un jeton Microsoft Graph');
  }
  return result.accessToken;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMail({ to, subject, html, text }) {
  const cfg = mailConfig();

  if (!cfg.enabled) {
    console.warn('[mail] Envoi désactivé (MAIL_ENABLED=0)');
    return { sent: false, skipped: true, reason: 'disabled' };
  }

  if (!isMailConfigured()) {
    throw new Error('Configuration Microsoft 365 incomplète pour l\'envoi de mails');
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((entry) => (typeof entry === 'string' ? { address: entry.trim() } : entry))
    .filter((entry) => entry?.address);

  if (!recipients.length) {
    throw new Error('Aucun destinataire valide');
  }

  const token = await getGraphAccessToken();
  const payload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      from: {
        emailAddress: {
          address: cfg.from,
          name: cfg.fromName,
        },
      },
      toRecipients: recipients.map((entry) => ({
        emailAddress: {
          address: entry.address,
          name: entry.name || undefined,
        },
      })),
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(cfg.sendAs)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.error?.message || detail;
    } catch (_) {}
    throw new Error(`Microsoft Graph sendMail a échoué (${response.status}) : ${detail}`);
  }

  if (text) {
    console.log(`[mail] Envoyé à ${recipients.map((r) => r.address).join(', ')} — ${subject}`);
  }

  return { sent: true, to: recipients.map((r) => r.address) };
}

function getMailStatus() {
  const cfg = mailConfig();
  return {
    enabled: cfg.enabled,
    configured: isMailConfigured(),
    from: cfg.from,
    from_name: cfg.fromName,
    send_as: cfg.sendAs,
    provider: 'microsoft-graph',
  };
}

function formatMailError(err) {
  const raw = String(err?.errorMessage || err?.message || err || '');
  if (/AADSTS700016|unauthorized_client|was not found in the directory/i.test(raw)) {
    return 'Identifiants Azure invalides (Client ID / Tenant). Vérifiez la configuration e-mail, puis réessayez.';
  }
  if (/AADSTS7000215|invalid_client|Invalid client secret/i.test(raw)) {
    return 'Secret client Azure invalide ou expiré. Mettez à jour le secret dans la configuration e-mail.';
  }
  if (/AADSTS70011|invalid_scope/i.test(raw)) {
    return 'Permissions Microsoft Graph insuffisantes pour l\'application Azure.';
  }
  if (/MailboxNotEnabledForRESTAPI|ErrorAccessDenied|403/i.test(raw)) {
    return 'Accès refusé à la boîte d\'envoi Microsoft 365. Vérifiez MAIL_SEND_AS et les droits de l\'application.';
  }
  // Avoid leaking long Azure traces / secrets into the UI
  const short = raw.split('\n')[0].slice(0, 220);
  return short || 'Échec de l\'envoi e-mail via Microsoft 365';
}

module.exports = {
  mailConfig,
  isMailConfigured,
  sendMail,
  escapeHtml,
  getMailStatus,
  resetMsalClient,
  formatMailError,
};
