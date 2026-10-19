function renderMailConfigStatus(settings) {
  const badge = document.getElementById('mail-config-status');
  if (!badge) return;
  if (!settings) {
    badge.textContent = 'Indisponible';
    badge.className = 'role-badge role-pending';
    return;
  }
  if (!settings.enabled) {
    badge.textContent = 'Disabled';
    badge.className = 'role-badge role-pending';
    return;
  }
  if (settings.configured) {
    badge.textContent = 'Operational';
    badge.className = 'role-badge role-instructor';
    return;
  }
  badge.textContent = 'Incomplet';
  badge.className = 'role-badge role-pending';
}

function fillMailConfigForm(settings) {
  if (!settings) return;
  document.getElementById('mail-enabled').checked = !!settings.enabled;
  document.getElementById('mail-tenant-id').value = settings.tenant_id || '';
  document.getElementById('mail-client-id').value = settings.client_id || '';
  document.getElementById('mail-send-as').value = settings.send_as || '';
  document.getElementById('mail-from').value = settings.from || '';
  document.getElementById('mail-from-name').value = settings.from_name || '';
  document.getElementById('mail-app-name').value = settings.app_name || '';
  document.getElementById('mail-client-secret').value = '';
  const hint = document.getElementById('mail-secret-hint');
  if (hint) {
    hint.textContent = settings.client_secret_set
      ? `Secret saved: ${settings.client_secret_hint}`
      : 'No secret saved.';
  }
  const testTo = document.getElementById('mail-test-to');
  if (testTo && !testTo.value && window.currentAdminUser?.email) {
    testTo.value = window.currentAdminUser.email;
  }
  renderMailConfigStatus(settings);
}

function setMailStatus(elId, message, type = 'ok') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = `status ${type === 'error' ? 'error' : 'ok'}`;
  el.hidden = !message;
}

function bindMailConfigEvents() {
  if (window.mailConfigBound) return;
  window.mailConfigBound = true;

  document.getElementById('mail-config-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMailStatus('mail-save-status', '');
    setMailStatus('mail-test-status', '');
    try {
      const data = await API.request('/api/admin/mail/settings', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: document.getElementById('mail-enabled').checked,
          tenant_id: document.getElementById('mail-tenant-id').value.trim(),
          client_id: document.getElementById('mail-client-id').value.trim(),
          client_secret: document.getElementById('mail-client-secret').value,
          send_as: document.getElementById('mail-send-as').value.trim(),
          from: document.getElementById('mail-from').value.trim(),
          from_name: document.getElementById('mail-from-name').value.trim(),
          app_name: document.getElementById('mail-app-name').value.trim(),
        }),
      });
      fillMailConfigForm(data.settings);
      setMailStatus('mail-save-status', data.message || 'Configuration saved.');
    } catch (err) {
      setMailStatus('mail-save-status', err.message, 'error');
    }
  });

  document.getElementById('mail-test-btn')?.addEventListener('click', async () => {
    setMailStatus('mail-test-status', '');
    const to = document.getElementById('mail-test-to')?.value.trim();
    if (!to) {
      setMailStatus('mail-test-status', 'Indiquez une adresse de destination.', 'error');
      return;
    }
    const btn = document.getElementById('mail-test-btn');
    btn.disabled = true;
    try {
      const data = await API.request('/api/admin/mail/test', {
        method: 'POST',
        body: JSON.stringify({ to }),
      });
      setMailStatus('mail-test-status', data.message || `Test email sent to ${to}.`);
    } catch (err) {
      setMailStatus('mail-test-status', err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadMailConfig() {
  try {
    const data = await API.request('/api/admin/mail/settings');
    fillMailConfigForm(data.settings);
    bindMailConfigEvents();
  } catch (err) {
    renderMailConfigStatus(null);
    setMailStatus('mail-save-status', `Impossible de charger la configuration e-mail : ${err.message}`, 'error');
  }
}
