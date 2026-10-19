let newsletterIntroEditor = null;

function setNewsletterStatus(message, type = 'ok') {
  const el = document.getElementById('newsletter-status');
  if (!el) return;
  el.textContent = message || '';
  el.className = `status ${type === 'error' ? 'error' : 'ok'}`;
  el.hidden = !message;
}

function syncNewsletterIntroHidden() {
  const hidden = document.getElementById('newsletter-intro');
  if (!hidden) return '';
  const html = newsletterIntroEditor?.getHtml?.() || '';
  hidden.value = html;
  return html.trim();
}

function getNewsletterPayload() {
  const subject = document.getElementById('newsletter-subject')?.value.trim() || '';
  const intro = syncNewsletterIntroHidden();
  const courseIds = [...document.querySelectorAll('#newsletter-course-list input[name="course_ids"]:checked')]
    .map((el) => parseInt(el.value, 10))
    .filter(Boolean);
  return { subject, intro, course_ids: courseIds };
}

function renderNewsletterCourseList(coursesList) {
  const box = document.getElementById('newsletter-course-list');
  if (!box) return;

  if (!coursesList?.length) {
    box.innerHTML = '<p class="muted">No catalog courses available. Create courses first.</p>';
    return;
  }

  if (typeof courseChecklistHtml === 'function') {
    box.innerHTML = courseChecklistHtml(coursesList);
    return;
  }

  box.innerHTML = coursesList.map((c) => `
    <label class="checkbox-row">
      <input type="checkbox" name="course_ids" value="${c.id}">
      <span>${c.title} <small class="muted">(${c.subject_label || c.subject})</small></span>
    </label>
  `).join('');
}

async function refreshNewsletterRecipientCount() {
  const badge = document.getElementById('newsletter-recipient-count');
  if (!badge) return;
  try {
    const data = await API.request('/api/admin/newsletter/recipients');
    const n = data.count || 0;
    badge.textContent = `${n} apprenant${n > 1 ? 's' : ''}`;
    badge.className = 'role-badge role-learner';
  } catch (_) {
    badge.textContent = 'Destinataires indisponibles';
    badge.className = 'role-badge role-pending';
  }
}

function showNewsletterPreview(preview) {
  const wrap = document.getElementById('newsletter-preview');
  const subjectEl = document.getElementById('newsletter-preview-subject');
  const frame = document.getElementById('newsletter-preview-frame');
  if (!wrap || !frame) return;

  subjectEl.textContent = `Objet : ${preview.subject || ''} · ${preview.course_count || 0} formation(s) · ${preview.recipient_count || 0} destinataire(s)`;
  frame.srcdoc = preview.html || '<p>Preview unavailable</p>';
  wrap.hidden = false;
}

function initNewsletterIntroEditor() {
  if (newsletterIntroEditor) return newsletterIntroEditor;
  if (typeof initRichTextEditor !== 'function') return null;

  const editorEl = document.getElementById('newsletter-intro-editor');
  const toolbarEl = document.getElementById('newsletter-intro-toolbar');
  if (!editorEl || !toolbarEl) return null;

  newsletterIntroEditor = initRichTextEditor(editorEl, toolbarEl, {
    enableImageResize: true,
    defaultImageWidth: 320,
    onUploadImage: uploadNewsletterImage,
  });
  editorEl.addEventListener('input', syncNewsletterIntroHidden);
  editorEl.addEventListener('blur', syncNewsletterIntroHidden);
  syncNewsletterIntroHidden();
  return newsletterIntroEditor;
}

async function uploadNewsletterImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const result = await API.request('/api/admin/newsletter/images', {
    method: 'POST',
    body: fd,
  });
  return result.url;
}

function bindNewsletterEvents() {
  if (window.newsletterBound) return;
  window.newsletterBound = true;

  initNewsletterIntroEditor();

  document.getElementById('newsletter-preview-close')?.addEventListener('click', () => {
    const wrap = document.getElementById('newsletter-preview');
    if (wrap) wrap.hidden = true;
  });

  document.getElementById('newsletter-preview-btn')?.addEventListener('click', async () => {
    setNewsletterStatus('');
    try {
      const payload = getNewsletterPayload();
      if (!payload.subject) throw new Error('Enter a subject for the newsletter');
      const data = await API.request('/api/admin/newsletter/preview', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showNewsletterPreview(data.preview);
      setNewsletterStatus('Preview generated.');
    } catch (err) {
      setNewsletterStatus(err.message, 'error');
    }
  });

  document.getElementById('newsletter-test-btn')?.addEventListener('click', async () => {
    setNewsletterStatus('');
    const btn = document.getElementById('newsletter-test-btn');
    try {
      const payload = getNewsletterPayload();
      if (!payload.subject) throw new Error('Enter a subject for the newsletter');
      const to = document.getElementById('newsletter-test-to')?.value.trim()
        || window.currentAdminUser?.email
        || '';
      if (!to) throw new Error('Indiquez une adresse de test');

      if (btn) btn.disabled = true;
      const data = await API.request('/api/admin/newsletter/test', {
        method: 'POST',
        body: JSON.stringify({ ...payload, to }),
      });
      if (data.preview) showNewsletterPreview(data.preview);
      setNewsletterStatus(data.message || `Test sent to ${to}.`);
    } catch (err) {
      setNewsletterStatus(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById('newsletter-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    setNewsletterStatus('');
    const btn = document.getElementById('newsletter-send-btn');
    try {
      const payload = getNewsletterPayload();
      if (!payload.subject) throw new Error('Enter a subject for the newsletter');
      if (!payload.course_ids.length) throw new Error('Select at least one course');

      const countBadge = document.getElementById('newsletter-recipient-count')?.textContent || 'tous les apprenants';
      if (!confirm(`Send this newsletter to ${countBadge}?`)) return;

      if (btn) btn.disabled = true;
      setNewsletterStatus('Envoi en cours…');
      const data = await API.request('/api/admin/newsletter/send', {
        method: 'POST',
        body: JSON.stringify({ ...payload, confirm: true }),
      });
      setNewsletterStatus(data.message || 'Newsletter sent.');
    } catch (err) {
      setNewsletterStatus(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

async function loadNewsletterSection() {
  const testTo = document.getElementById('newsletter-test-to');
  if (testTo && !testTo.value && window.currentAdminUser?.email) {
    testTo.value = window.currentAdminUser.email;
  }

  const courses = (typeof assignableCourses !== 'undefined' && assignableCourses?.length)
    ? assignableCourses
    : (typeof courses !== 'undefined' ? courses : []);

  renderNewsletterCourseList(courses);
  await refreshNewsletterRecipientCount();
  bindNewsletterEvents();
  initNewsletterIntroEditor();
}

window.loadNewsletterSection = loadNewsletterSection;
