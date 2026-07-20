const crypto = require('crypto');
const { resolveJwtSecret } = require('./jwt-secret');

const TICKET_TTL_SEC = 6 * 60 * 60; // 6 heures

function getSecret() {
  return resolveJwtSecret();
}

function signStreamTicket({ userId, courseId, materialId, expiresAt }) {
  const payload = `${userId}.${courseId}.${materialId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function createStreamTicket(userId, courseId, materialId, ttlSec = TICKET_TTL_SEC) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSec;
  return signStreamTicket({
    userId: Number(userId),
    courseId: Number(courseId),
    materialId: Number(materialId),
    expiresAt,
  });
}

function verifyStreamTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') return null;
  const parts = ticket.split('.');
  if (parts.length !== 5) return null;
  const [userId, courseId, materialId, expiresAt, sig] = parts;
  const payload = `${userId}.${courseId}.${materialId}.${expiresAt}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = parseInt(expiresAt, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  return {
    userId: parseInt(userId, 10),
    courseId: parseInt(courseId, 10),
    materialId: parseInt(materialId, 10),
    expiresAt: exp,
  };
}

module.exports = {
  createStreamTicket,
  verifyStreamTicket,
  TICKET_TTL_SEC,
};
