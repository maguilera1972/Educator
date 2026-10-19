/**
 * ALSO Portal identity lookup (LMS → Portal internal API).
 * See internal/portal-lms-lookup-api.md (project store).
 */

const DEFAULT_PORTAL_BASE = 'http://172.16.11.8';

function portalBaseUrl() {
  const raw = (process.env.PORTAL_LOOKUP_URL || process.env.PORTAL_INTERNAL_URL || DEFAULT_PORTAL_BASE)
    .trim()
    .replace(/\/$/, '');
  return raw || DEFAULT_PORTAL_BASE;
}

function lookupSecret() {
  return String(process.env.PORTAL_LMS_LOOKUP_SECRET || '').trim();
}

/**
 * @param {string} email
 * @returns {Promise<{ ok: true, data: object } | { ok: false, error: string, status?: number }>}
 */
async function lookupPortalUserByEmail(email) {
  const secret = lookupSecret();
  if (!secret || secret.length < 16) {
    return { ok: false, error: 'Portal lookup is not configured (PORTAL_LMS_LOOKUP_SECRET)', status: 503 };
  }

  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, error: 'Invalid email', status: 400 };
  }

  const url = `${portalBaseUrl()}/api/internal/users/by-email?email=${encodeURIComponent(normalized)}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: 'application/json',
      },
    });
  } catch (err) {
    return {
      ok: false,
      error: `Portal lookup unreachable: ${err.message || 'network error'}`,
      status: 503,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch (_) {
    return { ok: false, error: 'Portal lookup returned invalid JSON', status: 502 };
  }

  if (response.status === 401) {
    return { ok: false, error: 'Portal lookup unauthorized', status: 503 };
  }
  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || `Portal lookup failed (${response.status})`,
      status: 502,
    };
  }

  return { ok: true, data };
}

function portalDisplayName(portal) {
  const first = String(portal.firstName || '').trim();
  const last = String(portal.lastName || '').trim();
  const combined = [first, last].filter(Boolean).join(' ');
  return combined || portal.email;
}

/** Company/org field for LMS learners — prefer function, then country. */
function portalCompanyField(portal) {
  const fn = String(portal.functionRole || '').trim();
  if (fn) return fn.slice(0, 120);
  const country = String(portal.country || '').trim();
  if (country) return country.slice(0, 120);
  return 'ALSO';
}

module.exports = {
  lookupPortalUserByEmail,
  portalDisplayName,
  portalCompanyField,
  portalBaseUrl,
};
