const WEATHER_CACHE_KEY = 'lms_weather_cache';
const WEATHER_PREF_KEY = 'lms_weather_pref';
const WEATHER_CACHE_MS = 30 * 60 * 1000;

const WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57,
  61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
];

const WMO_ICONS = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '❄️',
  80: '🌦️',
  81: '🌧️',
  82: '🌧️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
};

function wt(key, vars, fallback) {
  if (typeof t === 'function') return t(key, vars, fallback);
  return fallback ?? key;
}

function weatherLabel(code) {
  const key = `weather.wmo.${code}`;
  if (typeof I18n !== 'undefined' && I18n.hasKey?.(key)) {
    return wt(key);
  }
  if (WMO_CODES.includes(Number(code))) {
    return wt(key, wt('weather.wmo.default', 'Conditions variables'));
  }
  return wt('weather.wmo.default', 'Conditions variables');
}

function weatherIcon(code) {
  if (WMO_ICONS[code]) return WMO_ICONS[code];
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function weatherLocalityLanguage() {
  const locale = typeof I18n !== 'undefined' ? I18n.getLocale() : 'fr';
  const map = { fr: 'fr', en: 'en', it: 'it', es: 'es', de: 'de' };
  return map[locale] || 'en';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readWeatherCache() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeWeatherCache(payload) {
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
    ...payload,
    cached_at: Date.now(),
  }));
}

function readWeatherPref() {
  try {
    const raw = localStorage.getItem(WEATHER_PREF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeWeatherPref(pref) {
  try {
    localStorage.setItem(WEATHER_PREF_KEY, JSON.stringify({
      ...pref,
      updated_at: Date.now(),
    }));
  } catch (_) {}
}

function isFreshCache(cache) {
  return cache && Date.now() - (cache.cached_at || 0) < WEATHER_CACHE_MS;
}

function hasStoredLocation(cache) {
  return cache && Number.isFinite(cache.lat) && Number.isFinite(cache.lon);
}

function renderWeatherPrompt() {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;
  root.innerHTML = `
    <div class="sidebar-weather-body sidebar-weather-body--prompt">
      <p class="sidebar-weather-title">${escapeHtml(wt('weather.title', 'Météo locale'))}</p>
      <p class="sidebar-weather-text">${escapeHtml(wt('weather.promptText', 'Autorisez votre position pour afficher la météo actuelle.'))}</p>
      <div class="sidebar-weather-actions">
        <button type="button" class="sidebar-weather-btn" id="sidebar-weather-enable">${escapeHtml(wt('weather.enableGps', 'Autoriser ma position'))}</button>
        <button type="button" class="sidebar-weather-btn sidebar-weather-btn--secondary" id="sidebar-weather-approx">${escapeHtml(wt('weather.approx', 'Position approximative'))}</button>
      </div>
    </div>
  `;
  document.getElementById('sidebar-weather-enable')?.addEventListener('click', () => {
    requestPreciseLocationAndWeather(true);
  });
  document.getElementById('sidebar-weather-approx')?.addEventListener('click', () => {
    requestApproximateLocationAndWeather(true);
  });
}

function renderWeatherLoading(message) {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;
  const text = message || wt('weather.loading', 'Localisation et chargement en cours…');
  root.innerHTML = `
    <div class="sidebar-weather-body sidebar-weather-body--loading">
      <p class="sidebar-weather-title">${escapeHtml(wt('weather.title', 'Météo locale'))}</p>
      <p class="sidebar-weather-text">${escapeHtml(text)}</p>
    </div>
  `;
}

function renderWeatherError(message, options = {}) {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;
  const { showApproximate = true, showRetry = true } = options;
  root.innerHTML = `
    <div class="sidebar-weather-body sidebar-weather-body--error">
      <p class="sidebar-weather-title">${escapeHtml(wt('weather.title', 'Météo locale'))}</p>
      <p class="sidebar-weather-text">${escapeHtml(message)}</p>
      <div class="sidebar-weather-actions">
        ${showRetry ? `<button type="button" class="sidebar-weather-btn" id="sidebar-weather-retry">${escapeHtml(wt('weather.retry', 'Réessayer'))}</button>` : ''}
        ${showApproximate ? `<button type="button" class="sidebar-weather-btn sidebar-weather-btn--secondary" id="sidebar-weather-approx">${escapeHtml(wt('weather.approx', 'Position approximative'))}</button>` : ''}
      </div>
    </div>
  `;
  document.getElementById('sidebar-weather-retry')?.addEventListener('click', () => {
    const pref = readWeatherPref();
    if (pref?.mode === 'approx') requestApproximateLocationAndWeather(true);
    else requestPreciseLocationAndWeather(true);
  });
  document.getElementById('sidebar-weather-approx')?.addEventListener('click', () => {
    requestApproximateLocationAndWeather(true);
  });
}

function renderWeatherData(data) {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;

  const icon = weatherIcon(data.weather_code);
  const label = weatherLabel(data.weather_code);
  const temp = Math.round(data.temperature);
  const feels = Math.round(data.apparent_temperature);
  const humidity = data.humidity;
  const wind = Math.round(data.wind_speed);
  const approxHint = data.approximate ? wt('weather.approxHint', ' · approx.') : '';

  root.innerHTML = `
    <div class="sidebar-weather-body" aria-live="polite">
      <div class="sidebar-weather-main">
        <div class="sidebar-weather-location">
          <span class="sidebar-weather-icon" aria-hidden="true">${icon}</span>
          <div>
            <p class="sidebar-weather-city">${escapeHtml(data.city)}${escapeHtml(approxHint)}</p>
            <p class="sidebar-weather-condition">${escapeHtml(label)}</p>
          </div>
        </div>
        <p class="sidebar-weather-temp">${temp}°</p>
      </div>
      <div class="sidebar-weather-meta">
        <span>${escapeHtml(wt('weather.feelsLike', { n: feels }, `Ressenti ${feels}°`))}</span>
        <span>${escapeHtml(wt('weather.humidity', { n: humidity }, `Humidité ${humidity}%`))}</span>
        <span>${escapeHtml(wt('weather.wind', { n: wind }, `Vent ${wind} km/h`))}</span>
      </div>
      <button type="button" class="sidebar-weather-refresh" id="sidebar-weather-refresh" title="${escapeHtml(wt('weather.refreshTitle', 'Actualiser la météo'))}">↻</button>
    </div>
  `;

  document.getElementById('sidebar-weather-refresh')?.addEventListener('click', () => {
    refreshWeatherFromPreference(true);
  });
}

async function fetchPlaceName(lat, lon) {
  const lang = weatherLocalityLanguage();
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${encodeURIComponent(lang)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(wt('weather.placeNotFound', 'Lieu introuvable'));
  const data = await res.json();
  return data.city || data.locality || data.principalSubdivision || wt('weather.currentPosition', 'Position actuelle');
}

async function fetchWeatherForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature',
    timezone: 'auto',
    wind_speed_unit: 'kmh',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(wt('weather.unavailable', 'Météo indisponible'));
  const data = await res.json();
  const current = data.current;
  if (!current) throw new Error(wt('weather.incomplete', 'Données météo incomplètes'));
  return current;
}

async function loadWeatherForCoords(lat, lon, options = {}) {
  const { city: presetCity = null, approximate = false, refreshPlaceName = false } = options;
  const shouldRefreshName = refreshPlaceName || !presetCity;
  const [city, forecast] = await Promise.all([
    shouldRefreshName ? fetchPlaceName(lat, lon) : Promise.resolve(presetCity),
    fetchWeatherForecast(lat, lon),
  ]);

  const payload = {
    lat,
    lon,
    city,
    temperature: forecast.temperature_2m,
    apparent_temperature: forecast.apparent_temperature,
    humidity: forecast.relative_humidity_2m,
    wind_speed: forecast.wind_speed_10m,
    weather_code: forecast.weather_code,
    approximate,
  };

  writeWeatherCache(payload);
  writeWeatherPref({
    mode: approximate ? 'approx' : 'precise',
    lat,
    lon,
    city,
    approximate,
  });
  renderWeatherData(payload);
  return payload;
}

function getGeolocationErrorMessage(error) {
  if (!error) return wt('weather.geoUnavailable', "Impossible d'obtenir votre position.");
  if (error.code === 1) {
    return wt('weather.geoDenied', 'Accès GPS refusé ou indisponible. Utilisez la position approximative ou autorisez la localisation dans les paramètres du navigateur.');
  }
  if (error.code === 2) {
    return wt('weather.geoMissing', 'Position indisponible. Réessayez ou utilisez la position approximative.');
  }
  if (error.code === 3) {
    return wt('weather.geoTimeout', 'Délai dépassé pour obtenir votre position.');
  }
  return error.message || wt('weather.geoUnavailable', "Impossible d'obtenir votre position.");
}

function isSecureContext() {
  return window.isSecureContext !== false;
}

function requestPreciseLocationAndWeather(forceRefresh = false) {
  if (!document.getElementById('sidebar-weather')) return;

  const cache = readWeatherCache();
  if (!forceRefresh && isFreshCache(cache)) {
    renderWeatherData(cache);
    return;
  }

  if (!forceRefresh && hasStoredLocation(cache)) {
    renderWeatherLoading(wt('weather.refreshing', 'Actualisation de la météo…'));
    loadWeatherForCoords(cache.lat, cache.lon, {
      city: cache.city,
      approximate: !!cache.approximate,
    }).catch(() => requestPreciseLocationAndWeather(true));
    return;
  }

  const pref = readWeatherPref();
  if (!forceRefresh && pref && Number.isFinite(pref.lat) && Number.isFinite(pref.lon)) {
    renderWeatherLoading(wt('weather.refreshing', 'Actualisation de la météo…'));
    loadWeatherForCoords(pref.lat, pref.lon, {
      city: pref.city,
      approximate: !!pref.approximate,
    }).catch(() => requestPreciseLocationAndWeather(true));
    return;
  }

  if (!isSecureContext()) {
    requestApproximateLocationAndWeather(forceRefresh);
    return;
  }

  if (!navigator.geolocation) {
    requestApproximateLocationAndWeather(forceRefresh);
    return;
  }

  renderWeatherLoading();

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loadWeatherForCoords(pos.coords.latitude, pos.coords.longitude, { approximate: false })
        .catch((err) => {
          if (!forceRefresh && isFreshCache(cache)) {
            renderWeatherData(cache);
            return;
          }
          renderWeatherError(err.message || wt('weather.loadError', 'Impossible de charger la météo.'));
        });
    },
    (err) => {
      if (!forceRefresh && isFreshCache(cache)) {
        renderWeatherData(cache);
        return;
      }
      if (hasStoredLocation(cache)) {
        loadWeatherForCoords(cache.lat, cache.lon, {
          city: cache.city,
          approximate: true,
        }).catch(() => renderWeatherError(getGeolocationErrorMessage(err)));
        return;
      }
      if (err.code === 1 || err.code === 2) {
        requestApproximateLocationAndWeather(true);
        return;
      }
      renderWeatherError(getGeolocationErrorMessage(err));
    },
    {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: forceRefresh ? 0 : 600000,
    }
  );
}

async function requestApproximateLocationAndWeather(forceRefresh = false) {
  if (!document.getElementById('sidebar-weather')) return;

  const cache = readWeatherCache();
  if (!forceRefresh && isFreshCache(cache)) {
    renderWeatherData(cache);
    return;
  }

  renderWeatherLoading(wt('weather.estimating', 'Estimation de votre position…'));

  try {
    if (typeof API === 'undefined' || !API.getToken()) {
      throw new Error(wt('weather.loginRequired', 'Connectez-vous pour afficher la météo.'));
    }
    const location = await API.request('/api/weather/approx-location');
    await loadWeatherForCoords(location.lat, location.lon, {
      city: location.city,
      approximate: true,
      refreshPlaceName: true,
    });
  } catch (err) {
    if (hasStoredLocation(cache)) {
      try {
        await loadWeatherForCoords(cache.lat, cache.lon, {
          city: cache.city,
          approximate: true,
        });
        return;
      } catch (_) {}
    }
    renderWeatherError(
      err.message || wt('weather.approxUnavailable', 'Position approximative indisponible pour le moment.'),
      { showApproximate: false }
    );
  }
}

function refreshWeatherFromPreference(forceRefresh = false) {
  const pref = readWeatherPref();
  const cache = readWeatherCache();

  if (!forceRefresh && isFreshCache(cache)) {
    renderWeatherData(cache);
    return;
  }

  if (pref?.mode === 'approx') {
    requestApproximateLocationAndWeather(forceRefresh);
    return;
  }

  if (hasStoredLocation(cache) || (pref && Number.isFinite(pref.lat))) {
    const lat = cache?.lat ?? pref.lat;
    const lon = cache?.lon ?? pref.lon;
    const city = cache?.city ?? pref.city;
    const approximate = !!(cache?.approximate ?? pref.approximate);
    renderWeatherLoading(wt('weather.refreshing', 'Actualisation de la météo…'));
    loadWeatherForCoords(lat, lon, { city, approximate })
      .catch(() => {
        if (pref?.mode === 'precise') requestPreciseLocationAndWeather(true);
        else requestApproximateLocationAndWeather(true);
      });
    return;
  }

  if (pref?.mode === 'precise') {
    requestPreciseLocationAndWeather(true);
    return;
  }

  renderWeatherPrompt();
}

function refreshWeatherForLocaleChange() {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;

  const cache = readWeatherCache();
  if (isFreshCache(cache) || hasStoredLocation(cache)) {
    // Re-render labels immediately, then refresh place name in the selected language
    renderWeatherData(cache);
    if (hasStoredLocation(cache)) {
      loadWeatherForCoords(cache.lat, cache.lon, {
        approximate: !!cache.approximate,
        refreshPlaceName: true,
      }).catch(() => {
        if (isFreshCache(cache) || hasStoredLocation(cache)) renderWeatherData(cache);
      });
    }
    return;
  }

  const pref = readWeatherPref();
  if (pref?.mode) {
    refreshWeatherFromPreference(false);
    return;
  }

  renderWeatherPrompt();
}

let weatherRefreshTimer = null;
let weatherLocaleBound = false;

function initSidebarWeather() {
  const root = document.getElementById('sidebar-weather');
  if (!root) return;

  // Allow re-init after sidebar remount (new DOM node)
  if (root.dataset.bound === '1') {
    refreshWeatherForLocaleChange();
    return;
  }
  root.dataset.bound = '1';

  const cache = readWeatherCache();
  const pref = readWeatherPref();

  if (isFreshCache(cache)) {
    renderWeatherData(cache);
  } else if (hasStoredLocation(cache) || pref?.mode) {
    refreshWeatherFromPreference(false);
  } else {
    renderWeatherPrompt();
  }

  if (weatherRefreshTimer) clearInterval(weatherRefreshTimer);
  weatherRefreshTimer = setInterval(() => {
    if (!document.getElementById('sidebar-weather')) return;
    const currentCache = readWeatherCache();
    if (isFreshCache(currentCache)) return;
    refreshWeatherFromPreference(false);
  }, WEATHER_CACHE_MS);

  if (!weatherLocaleBound) {
    weatherLocaleBound = true;
    document.addEventListener('lms:localechange', () => {
      refreshWeatherForLocaleChange();
    });
  }
}

window.initSidebarWeather = initSidebarWeather;
