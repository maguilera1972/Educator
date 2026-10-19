const APP_CONFIG = {
  name: 'ALSO LMS',
  tagline: 'Collaborative training platform',
  footer: 'ALSO Group training',
  siteUrl: 'https://alsolms.eureka-training.online',
  logoEmblemUrl: '/images/logo.png',
  faviconUrl: '/images/favicon.png',
};

function applyBranding() {
  const { name, tagline, footer, logoEmblemUrl, faviconUrl } = APP_CONFIG;

  document.querySelectorAll('[data-app-logo-emblem]').forEach((el) => {
    if (logoEmblemUrl) el.src = logoEmblemUrl;
  });

  document.querySelectorAll('[data-app-name]').forEach((el) => {
    el.textContent = name;
  });

  let favicon = document.querySelector('link[data-app-favicon]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.setAttribute('data-app-favicon', '');
    document.head.appendChild(favicon);
  }
  if (faviconUrl) {
    favicon.href = faviconUrl;
    favicon.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  }

  const pageTitle = document.body?.dataset?.pageTitle;
  if (pageTitle) {
    document.title = `${pageTitle} — ${name}`;
  } else if (document.body?.dataset?.fullTitle === 'true') {
    document.title = `${name} — ${tagline}`;
  }

  document.querySelectorAll('[data-app-footer]').forEach((el) => {
    if (el.hasAttribute('data-i18n')) return;
    el.textContent = `${name} — ${footer}`;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyBranding);
} else {
  applyBranding();
}
