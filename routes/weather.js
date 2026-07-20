const express = require('express');
const { authRequired } = require('../middleware/auth');

function parseCfHeader(value) {
  if (!value) return null;
  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' '));
  } catch {
    return String(value);
  }
}

function locationFromCloudflare(req) {
  const lat = parseFloat(req.headers['cf-iplatitude']);
  const lon = parseFloat(req.headers['cf-iplongitude']);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    city: parseCfHeader(req.headers['cf-ipcity']) || null,
    approximate: true,
    source: 'cloudflare',
  };
}

async function locationFromIpApi(ip) {
  const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'success' || !Number.isFinite(data.lat) || !Number.isFinite(data.lon)) {
    return null;
  }
  return {
    lat: data.lat,
    lon: data.lon,
    city: data.city || null,
    approximate: true,
    source: 'ip-api',
  };
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

async function resolveApproximateLocation(req) {
  const fromCf = locationFromCloudflare(req);
  if (fromCf) return fromCf;

  const ip = clientIp(req);
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      lat: 46.948,
      lon: 7.4474,
      city: 'Berne',
      approximate: true,
      source: 'default',
    };
  }

  return locationFromIpApi(ip);
}

module.exports = function createWeatherRouter() {
  const router = express.Router();

  router.get('/approx-location', authRequired, async (req, res) => {
    try {
      const location = await resolveApproximateLocation(req);
      if (!location) {
        return res.status(503).json({ error: 'Position approximative indisponible' });
      }
      res.json(location);
    } catch (err) {
      console.error('[weather] approx-location:', err);
      res.status(503).json({ error: 'Position approximative indisponible' });
    }
  });

  return router;
};
