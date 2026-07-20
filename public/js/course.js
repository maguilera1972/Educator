if (!requireAuth()) throw new Error();

const user = API.getUser();
updateNav();
const courseId = new URLSearchParams(window.location.search).get('id');
let courseData = null;
let modalAction = null;

const MATERIAL_TYPES = ['slides', 'videos', 'docs', 'labs'];
function materialLabels() {
  if (typeof t !== 'function') {
    return { slides: 'Slides', videos: 'Vidéos', docs: 'Documents', labs: 'Labs' };
  }
  return {
    slides: t('material.slides'),
    videos: t('material.videos'),
    docs: t('material.docs'),
    labs: t('material.labs'),
  };
}
function materialCountLabels() {
  if (typeof t !== 'function') {
    return {
      slides: ['slide', 'slides'],
      videos: ['vidéo', 'vidéos'],
      docs: ['document', 'documents'],
      labs: ['lab', 'labs'],
    };
  }
  return {
    slides: [t('material.slide'), t('material.slidesPlural')],
    videos: [t('material.video'), t('material.videosPlural')],
    docs: [t('material.doc'), t('material.docsPlural')],
    labs: [t('material.lab'), t('material.labsPlural')],
  };
}
const MATERIAL_LABELS = new Proxy({}, {
  get(_target, prop) {
    return materialLabels()[prop];
  },
});
const MATERIAL_ICONS = {
  slides: '📊',
  videos: '🎬',
  docs: '📄',
  labs: '🧪',
};
const SECTIONED_TYPES = MATERIAL_TYPES;
const MATERIAL_COUNT_LABELS = new Proxy({}, {
  get(_target, prop) {
    return materialCountLabels()[prop] || ['élément', 'éléments'];
  },
});

const MODULE_OWNER_ACTIONS = new Set([
  'edit-module',
  'delete-module',
  'add-lesson',
  'delete-lesson',
  'add-quiz',
  'delete-quiz',
]);

function canUserManageModules(canManageFromApi) {
  if (!user || !canManageFromApi) return false;
  if (user.role === 'learner' && !user.is_instructor) return false;
  return user.role === 'admin' || isActiveInstructor(user);
}

function setAddModuleButtonEnabled(enabled) {
  const btn = document.getElementById('add-module-btn');
  if (!btn) return;
  btn.hidden = !enabled;
  btn.disabled = !enabled;
  btn.onclick = null;
}
const EMPTY_SECTION_LABELS = {
  slides: 'Aucun slide dans cette section',
  videos: 'Aucune vidéo dans cette section',
  docs: 'Aucun document dans cette section',
  labs: 'Aucun lab dans cette section',
};
const EMPTY_TYPE_LABELS = {
  slides: 'Aucun slide',
  videos: 'Aucune vidéo',
  docs: 'Aucun document',
  labs: 'Aucun lab',
};
const SECTION_EDIT_TYPES = SECTIONED_TYPES;
let activeMaterialTab = sessionStorage.getItem('lms_material_tab') || 'videos';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sectionFormFields(section = {}) {
  return `
    <div class="field"><label>Titre du module / sujet</label><input name="title" value="${escapeHtml(section.title || '')}" required placeholder="Ex. Module 1 — Introduction"></div>
    <div class="field"><label>Description</label><textarea name="description" rows="3" placeholder="Objectifs, sujets abordés, prérequis…">${escapeHtml(section.description || '')}</textarea></div>
  `;
}

function showSectionEditModal(type, section) {
  showModal(`Modifier la section — ${MATERIAL_LABELS[type]}`, sectionFormFields(section), async (fd) => {
    await API.request(`/api/courses/${courseId}/material-sections/${section.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: fd.get('title'),
        description: fd.get('description'),
      }),
    });
  });
}

function showSectionManageModal(type, sections) {
  if (!sections.length) {
    showModal(`Sections — ${MATERIAL_LABELS[type]}`, `
      <p class="muted">Aucune section créée. Utilisez « + Section » pour en ajouter une.</p>
    `, null, true);
    return;
  }
  const listHtml = sections.map((section) => `
    <li class="section-manage-item">
      <div class="section-manage-info">
        <strong>${escapeHtml(section.title)}</strong>
        ${section.description ? `<p class="muted">${escapeHtml(section.description)}</p>` : ''}
      </div>
      <div class="inline-actions">
        <button type="button" class="btn-secondary btn-xs" data-action="edit-section-from-manage" data-type="${type}" data-id="${section.id}">Modifier</button>
        <button type="button" class="btn-danger btn-xs" data-action="delete-section-from-manage" data-id="${section.id}">Supprimer</button>
      </div>
    </li>
  `).join('');

  showModal(`Sections — ${MATERIAL_LABELS[type]}`, `
    <ul class="item-list section-manage-list">${listHtml}</ul>
  `, null, true);

  document.querySelectorAll('[data-action="edit-section-from-manage"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sectionType = btn.dataset.type;
      const section = sections.find((s) => s.id === parseInt(btn.dataset.id, 10));
      if (!section) return;
      modal.hidden = true;
      showSectionEditModal(sectionType, section);
    });
  });

  document.querySelectorAll('[data-action="delete-section-from-manage"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cette section ? Les éléments seront déplacés vers « Sans catégorie ».')) return;
      await API.request(`/api/courses/${courseId}/material-sections/${btn.dataset.id}`, { method: 'DELETE' });
      modal.hidden = true;
      loadCourse();
    });
  });
}

if (!courseId) window.location.href = '/courses.html';

const modal = document.getElementById('modal');
const modalActions = document.getElementById('modal-actions');

document.getElementById('modal-cancel').addEventListener('click', () => {
  modal.hidden = true;
  modalActions.hidden = false;
});

function showModal(title, fields, onSubmit, hideActions = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-form').innerHTML = fields;
  document.getElementById('modal-error').hidden = true;
  modalAction = onSubmit;
  modalActions.hidden = hideActions;
  modal.hidden = false;
}

document.getElementById('modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalAction) return;
  const errEl = document.getElementById('modal-error');
  errEl.hidden = true;
  try {
    await modalAction(new FormData(e.target));
    modal.hidden = true;
    modalActions.hidden = false;
    if (modalAction) loadCourse();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

async function loadCourse() {
  try {
    courseData = await API.request(`/api/courses/${courseId}`);
    const { modules, materials, enrolled, can_manage: canManage } = courseData;
    const rawCourse = courseData.course;
    const course = typeof I18n !== 'undefined' && I18n.localizeCourse
      ? I18n.localizeCourse(rawCourse)
      : rawCourse;
    courseData.course = course;
    const canManageModules = canUserManageModules(canManage);
    const isOwner = canManageModules;
    const canView = isOwner || enrolled || user.role !== 'learner';

    document.getElementById('loading').hidden = true;
    document.getElementById('content').hidden = false;

    document.getElementById('course-title').textContent = course.title;
    document.getElementById('course-desc').textContent = course.description;
    const subjectBadge = course.subject_label
      ? `<span class="subject-badge">${course.subject_label}</span> · `
      : '';
    document.getElementById('course-meta').innerHTML =
      subjectBadge + courseInstructorsLineHtml(course);
    bindAvatarFallbacks(document.getElementById('course-meta'));

    const actions = document.getElementById('course-actions');
    if (isOwner) {
      actions.innerHTML = `
        <button class="btn-secondary btn-sm" id="edit-course-btn">${typeof t === 'function' ? t('common.edit') : 'Modifier'}</button>
        <button class="btn-danger btn-sm" id="delete-course-btn">${typeof t === 'function' ? t('common.delete') : 'Supprimer'}</button>
      `;
      document.getElementById('edit-course-btn').onclick = async () => {
        const { subjects } = await API.request('/api/courses/subjects');
        const subjectOptions = subjects.map((s) => {
          const label = typeof I18n !== 'undefined' ? I18n.subjectLabel(s.id, s.label) : s.label;
          return `<option value="${s.id}"${s.id === rawCourse.subject ? ' selected' : ''}>${label}</option>`;
        }).join('');
        showModal(typeof t === 'function' ? t('common.edit') : 'Modifier le cours', `
          <div class="field"><label>${typeof t === 'function' ? t('courses.subject') : 'Sujet'}</label><select name="subject" required>${subjectOptions}</select></div>
          <div class="field"><label>${typeof t === 'function' ? t('courses.courseTitle') : 'Titre'}</label><input name="title" value="${escapeHtml(rawCourse.title)}" required></div>
          <div class="field"><label>${typeof t === 'function' ? t('courses.description') : 'Description'}</label><textarea name="description" rows="3">${escapeHtml(rawCourse.description || '')}</textarea></div>
        `, async (fd) => {
          await API.request(`/api/courses/${courseId}`, {
            method: 'PUT',
            body: JSON.stringify({
              subject: fd.get('subject'),
              title: fd.get('title'),
              description: fd.get('description'),
            }),
          });
        });
      };
      document.getElementById('delete-course-btn').onclick = async () => {
        if (!confirm(
          'Supprimer cette formation ?\n\n'
          + 'Les accès des apprenants à cette formation seront retirés.\n'
          + 'Les comptes apprenants ne seront pas supprimés.'
        )) return;
        const result = await API.request(`/api/courses/${courseId}`, { method: 'DELETE' });
        if (result.message) alert(result.message);
        window.location.href = '/courses.html?manage=1';
      };
      setAddModuleButtonEnabled(canManageModules);
    } else if (enrolled) {
      actions.innerHTML = `
        <span class="role-badge role-learner" title="Vous conservez l'accès au contenu après la session">Accès permanent</span>
      `;
      setAddModuleButtonEnabled(false);
    } else {
      actions.innerHTML = '';
      setAddModuleButtonEnabled(false);
    }

    const banner = document.getElementById('enroll-banner');
    const bannerText = document.getElementById('enroll-banner-text');
    if (!canView && user.role === 'learner') {
      banner.hidden = false;
      document.getElementById('materials-section').hidden = true;
      document.getElementById('modules-section').hidden = true;
      document.getElementById('evaluation-section').hidden = true;
      if (isPendingLearner(user)) {
        bannerText.textContent =
          'Votre compte est en attente de validation par un administrateur. Vous recevrez l\'accès à vos formations une fois validé.';
      } else {
        bannerText.textContent =
          'Vous n\'avez pas accès à cette formation. Seul l\'administrateur peut vous l\'assigner.';
      }
    } else {
      banner.hidden = true;
      document.getElementById('materials-section').hidden = false;
      document.getElementById('modules-section').hidden = false;
      renderEvaluationSection(course);
    }

    renderMaterials(materials, isOwner, canView, courseData.material_sections || {});
    renderModules(modules, canManageModules, canView);
  } catch (err) {
    document.getElementById('loading').textContent = err.message;
  }
}

function renderEvaluationSection(course) {
  const section = document.getElementById('evaluation-section');
  const link = document.getElementById('evaluation-form-link');
  if (!section || !link) return;

  const url = course?.evaluation_url || 'https://forms.cloud.microsoft/e/RFjBKzfwQQ';
  link.href = url;
  section.hidden = false;
}

function itemCountLabel(type, count) {
  const [singular, plural] = MATERIAL_COUNT_LABELS[type] || ['élément', 'éléments'];
  return `${count} ${count === 1 ? singular : plural}`;
}

function viewedBadgeHtml(item) {
  if (item.viewed) {
    return '<span class="material-viewed-badge is-viewed" title="Déjà consulté">✓ Vu</span>';
  }
  return `<span class="material-viewed-badge" data-viewed-badge="${item.id}"></span>`;
}

function materialLinkHtml(item, type) {
  return renderMaterialItem(item, type);
}

function materialFileItemHtml(item, type) {
  const size = item.file_size_label ? `<small class="muted">${item.file_size_label}</small>` : '';
  const desc = item.description ? `<p class="muted material-desc">${item.description}</p>` : '';
  let content = `<strong>${item.title}</strong>${size ? ` ${size}` : ''}`;

  if (item.has_file || item.download_url) {
    const href = API.materialFileLink(courseId, item.id);
    content = `<a href="${href}" target="_blank" rel="noopener" class="material-view-link" data-material-id="${item.id}">${item.title}</a>${size ? ` ${size}` : ''}`;
  } else if (item.url) {
    content = `<a href="${item.url}" target="_blank" rel="noopener" class="material-view-link" data-material-id="${item.id}">${item.title}</a>`;
  }

  return `
    <div class="material-entry" data-material-id="${item.id}">
      <div class="material-entry-title">
        ${viewedBadgeHtml(item)}
        ${content}
      </div>
      ${desc}
    </div>
  `;
}

function renderMaterialItem(item, type, isOwner = false) {
  if (type === 'videos') return videoItemHtml(item);
  if (type === 'slides') return slideItemHtml(item, isOwner);
  if (type === 'docs') return docItemHtml(item);
  return materialFileItemHtml(item, type);
}

function docItemHtml(item) {
  const size = item.file_size_label ? `<small class="muted">${item.file_size_label}</small>` : '';
  const desc = item.description ? `<p class="muted material-desc">${escapeHtml(item.description)}</p>` : '';
  const viewedBadge = viewedBadgeHtml(item);

  if (item.has_file) {
    const downloadUrl = API.materialFileLink(courseId, item.id);
    const isPdf = slideFileKind(item) === 'pdf';
    const downloadLabel = typeof t === 'function' ? t('material.download') : 'Télécharger';
    const viewLabel = typeof t === 'function' ? t('material.view') : 'Consulter';
    let actions = `<a href="${downloadUrl}" target="_blank" rel="noopener" class="btn-secondary btn-xs doc-download-link" data-material-id="${item.id}">${downloadLabel}</a>`;

    if (isPdf) {
      const fallbackSrc = API.materialStreamLink(courseId, item.id);
      actions = `
        <a href="${fallbackSrc}" target="_blank" rel="noopener" class="btn-secondary btn-xs material-stream-open doc-view-link" data-material-id="${item.id}" data-stream-src="1" data-fallback-src="${fallbackSrc}">${viewLabel}</a>
        ${actions}
      `;
    }

    return `
      <div class="doc-entry material-entry" data-material-id="${item.id}">
        <div class="material-entry-title doc-entry-title">
          ${viewedBadge}
          <strong>${escapeHtml(item.title)}</strong>
          ${size}
          <span class="material-entry-actions">${actions}</span>
        </div>
        ${desc}
      </div>
    `;
  }

  if (item.url) {
    return `
      <div class="doc-entry material-entry" data-material-id="${item.id}">
        <div class="material-entry-title">
          ${viewedBadge}
          <a href="${item.url}" target="_blank" rel="noopener" class="material-view-link" data-material-id="${item.id}">${escapeHtml(item.title)}</a>
        </div>
        ${desc}
      </div>
    `;
  }

  return `<span>${escapeHtml(item.title)}</span>`;
}

function slideFileKind(item) {
  const mime = (item.mime_type || '').toLowerCase();
  const name = (item.original_filename || item.title || '').toLowerCase();
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

function slideViewerHtml(item, src, kind, isOwner) {
  if (kind === 'pdf') {
    return `
      <div class="slide-player-wrap">
        <iframe
          class="protected-slide protected-slide-pdf"
          src="${src}#toolbar=0&navpanes=0"
          title="${escapeHtml(item.title)}"
          data-material-id="${item.id}"
        ></iframe>
      </div>
    `;
  }

  if (kind === 'image') {
    return `
      <div class="slide-player-wrap">
        <img
          class="protected-slide protected-slide-image"
          src="${src}"
          alt="${escapeHtml(item.title)}"
          data-material-id="${item.id}"
        >
      </div>
    `;
  }

  return `
    <div class="slide-viewer-fallback">
      <a href="${src}" target="_blank" rel="noopener" class="btn-secondary btn-sm material-stream-open" data-material-id="${item.id}" data-stream="${src}">
        Consulter en ligne
      </a>
      ${!isOwner ? '<p class="muted">Téléchargement désactivé pour les participants.</p>' : ''}
    </div>
  `;
}

function slideItemHtml(item, isOwner) {
  const size = item.file_size_label ? `<small class="muted">${item.file_size_label}</small>` : '';
  const desc = item.description ? `<p class="muted slide-desc">${item.description}</p>` : '';
  const viewedBadge = viewedBadgeHtml(item);

  if (item.has_file || item.stream_url) {
    const fallbackSrc = API.materialStreamLink(courseId, item.id);
    const kind = slideFileKind(item);
    const viewer = slideViewerHtml(item, '', kind, isOwner)
      .replace(
        /src="[^"]*"/,
        `src="" data-stream-src="1" data-fallback-src="${fallbackSrc}" data-material-id="${item.id}"`
      )
      .replace(
        /data-stream="[^"]*"/,
        `data-stream-src="1" data-fallback-src="${fallbackSrc}" data-material-id="${item.id}"`
      );
    const ownerDownload = isOwner
      ? `<a href="${API.materialFileLink(courseId, item.id)}" target="_blank" rel="noopener" class="btn-secondary btn-xs slide-download-link">${typeof t === 'function' ? t('material.download') : 'Télécharger'}</a>`
      : '';

    return `
      <div class="slide-entry" data-material-id="${item.id}">
        <div class="slide-entry-title">
          ${viewedBadge}
          <strong>${escapeHtml(item.title)}</strong>
          ${size}
          ${ownerDownload}
        </div>
        ${desc}
        ${viewer}
      </div>
    `;
  }

  if (item.url) {
    return `
      <div class="slide-entry" data-material-id="${item.id}">
        <div class="slide-entry-title">
          ${viewedBadge}
          <strong>${escapeHtml(item.title)}</strong>
        </div>
        ${desc}
        <a href="${item.url}" target="_blank" rel="noopener" class="btn-secondary btn-sm material-view-link" data-material-id="${item.id}">Ouvrir la ressource externe</a>
      </div>
    `;
  }

  return `<span>${escapeHtml(item.title)}</span>`;
}

function videoItemHtml(item) {
  const size = item.file_size_label ? `<small class="muted">${item.file_size_label}</small>` : '';
  const desc = item.description ? `<p class="muted video-desc">${item.description}</p>` : '';
  const viewedBadge = viewedBadgeHtml(item);

  if (item.has_file || item.stream_url) {
    const fallbackSrc = API.materialStreamLink(courseId, item.id);
    return `
      <div class="video-entry" data-material-id="${item.id}">
        <div class="video-entry-title">
          ${viewedBadge}
          <strong>${item.title}</strong>
          ${size}
        </div>
        ${desc}
        <div class="video-player-wrap">
          <video
            class="protected-video"
            data-material-id="${item.id}"
            data-stream-src="1"
            data-fallback-src="${fallbackSrc}"
            controls
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsinline
            preload="none"
          ></video>
        </div>
      </div>
    `;
  }

  if (item.url) {
    return `
      <div class="video-entry" data-material-id="${item.id}">
        <div class="video-entry-title">
          ${viewedBadge}
          <strong>${item.title}</strong>
        </div>
        ${desc}
        <a href="${item.url}" target="_blank" rel="noopener" class="btn-secondary btn-sm">Ouvrir la vidéo externe</a>
      </div>
    `;
  }

  return `<span>${item.title}</span>`;
}

function groupMaterialsBySection(items, sections, showEmpty) {
  const groups = sections.map((section) => ({
    section,
    items: items.filter((item) => item.section_id === section.id),
  }));

  const unsectioned = {
    section: { id: null, title: 'Sans catégorie' },
    items: items.filter((item) => !item.section_id),
  };

  const result = showEmpty
    ? groups
    : groups.filter((g) => g.items.length > 0);

  if (unsectioned.items.length > 0 || (showEmpty && !sections.length)) {
    result.push(unsectioned);
  }

  return result;
}

function sectionOptionsHtml(sections, selectedId = '') {
  const opts = sections.map((s) =>
    `<option value="${s.id}"${String(s.id) === String(selectedId) ? ' selected' : ''}>${s.title}</option>`
  ).join('');
  return `<option value="">Sans catégorie</option>${opts}`;
}

function sectionFieldHtml(type, sections, selectedId = '') {
  if (!SECTIONED_TYPES.includes(type)) return '';

  if (!sections.length) {
    return `
      <div class="field">
        <label>Section</label>
        <select name="section_id">
          <option value="" selected>Sans catégorie</option>
        </select>
        <p class="muted section-field-hint">Aucune section pour l'instant — utilisez « + Section » pour en créer une, puis assignez ce fichier ici.</p>
      </div>
    `;
  }

  return `
    <div class="field">
      <label>Section</label>
      <select name="section_id">${sectionOptionsHtml(sections, selectedId)}</select>
      <p class="muted section-field-hint">Assignez ce fichier à un module ou laissez « Sans catégorie ».</p>
    </div>
  `;
}

function renderMaterialSections(type, items, sections, isOwner) {
  const groups = groupMaterialsBySection(items, sections, isOwner);

  if (!groups.length && !isOwner) {
    return `<p class="muted">${EMPTY_TYPE_LABELS[type]}</p>`;
  }

  if (!groups.length && isOwner) {
    return `
      <p class="muted">Créez une section pour organiser vos ${MATERIAL_LABELS[type].toLowerCase()} par module ou sujet.</p>
      <ul class="material-section-list"></ul>
    `;
  }

  return `
    <ul class="material-section-list">
      ${groups.map((group, index) => {
        const viewedCount = group.items.filter((item) => item.viewed).length;
        const progress = group.items.length
          ? `<span class="material-section-progress">${typeof t === 'function'
            ? t('material.consulted', { n: viewedCount, total: group.items.length, s: viewedCount !== 1 ? 's' : '' })
            : `${viewedCount}/${group.items.length} consulté${viewedCount !== 1 ? 's' : ''}`}</span>`
          : '';
        const sectionDesc = group.section.description
          ? `<span class="material-section-desc">${escapeHtml(group.section.description)}</span>`
          : '';
        const canEditSection = isOwner && group.section.id;
        const sectionActions = canEditSection ? `
          <span class="material-section-actions">
            <button type="button" class="btn-secondary btn-xs" data-action="edit-material-section" data-type="${type}" data-id="${group.section.id}">Modifier</button>
            <button type="button" class="btn-danger btn-xs" data-action="delete-material-section" data-type="${type}" data-id="${group.section.id}">×</button>
          </span>
        ` : '';

        return `
          <li class="material-section-group" data-section-id="${group.section.id ?? ''}">
            <details class="material-section-details"${index === 0 ? ' open' : ''}>
              <summary class="material-section-header">
                <span class="material-section-heading">
                  <span class="material-section-title">${escapeHtml(group.section.title)}</span>
                  ${sectionDesc}
                </span>
                <span class="material-section-meta">
                  ${itemCountLabel(type, group.items.length)}
                  ${!isOwner ? progress : ''}
                </span>
                ${sectionActions}
              </summary>
              <ul class="item-list material-group-list${type === 'videos' ? ' video-list' : ''}">
                ${group.items.length
                  ? group.items.map((item) => `
                    <li class="material-row-item${type === 'videos' ? ' video-list-item' : ''}">
                      <div class="material-item">
                        ${renderMaterialItem(item, type, isOwner)}
                      </div>
                      ${isOwner ? `
                        <div class="inline-actions material-row-actions">
                          ${!item.section_id ? `<span class="unassigned-badge" title="${typeof t === 'function' ? t('material.unassigned') : 'Non assigné'}">${typeof t === 'function' ? t('material.unassigned') : 'Non assigné'}</span>` : ''}
                          <button type="button" class="btn-secondary btn-xs" data-action="edit-material" data-id="${item.id}">${typeof t === 'function' ? t('common.edit') : 'Modifier'}</button>
                          <button type="button" class="btn-danger btn-xs" data-action="delete-material" data-id="${item.id}">×</button>
                        </div>
                      ` : ''}
                    </li>
                  `).join('')
                  : `<li class="muted">${EMPTY_SECTION_LABELS[type]}</li>`}
              </ul>
            </details>
          </li>
        `;
      }).join('')}
    </ul>
  `;
}

function markMaterialViewedUi(materialId, entryEl) {
  const badge = entryEl?.querySelector('[data-viewed-badge], .material-viewed-badge:not(.is-viewed)');
  if (badge) {
    badge.classList.add('is-viewed');
    badge.textContent = '✓ Vu';
    badge.title = 'Déjà consulté';
    badge.removeAttribute('data-viewed-badge');
  }

  const sectionGroup = entryEl?.closest('.material-section-group');
  if (sectionGroup) updateSectionProgress(sectionGroup);
}

async function markMaterialViewed(materialId, type) {
  await API.markMaterialViewed(courseId, materialId);
  for (const t of MATERIAL_TYPES) {
    const item = (courseData.materials[t] || []).find((m) => String(m.id) === String(materialId));
    if (item) item.viewed = true;
  }
}

async function uploadFilesSequential(type, files, sectionId, progressEl) {
  return API.uploadMaterialsSequential(courseId, {
    type,
    sectionId: sectionId || '',
    files,
    onProgress: (current, total, name) => {
      if (!progressEl) return;
      progressEl.className = 'status';
      progressEl.textContent = `Importation ${current}/${total} — ${name}`;
      progressEl.hidden = false;
    },
  });
}

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v', '.mpeg', '.mpg', '.wmv', '.ogv',
]);

function fileExtension(name) {
  const match = String(name || '').toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : '';
}

function isVideoImportFile(file) {
  if (!file || !file.size) return false;
  if (file.type && file.type.startsWith('video/')) return true;
  return VIDEO_EXTENSIONS.has(fileExtension(file.name));
}

/** Section = dossier sélectionné (racine) ou 1er sous-dossier ; le reste du sous-arbre y reste. */
function sectionNameFromRelativePath(relativePath) {
  const parts = String(relativePath || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean);
  if (parts.length >= 3) return parts[1];
  if (parts.length >= 1) return parts[0];
  return 'Sans catégorie';
}

function groupFilesByFolderSections(files, filterFn) {
  const groups = new Map();
  for (const file of files) {
    if (filterFn && !filterFn(file)) continue;
    const sectionTitle = sectionNameFromRelativePath(file.webkitRelativePath || file.name);
    if (!groups.has(sectionTitle)) groups.set(sectionTitle, []);
    groups.get(sectionTitle).push(file);
  }
  return groups;
}

function folderImportPreviewHtml(groups) {
  if (!groups.size) {
    return '<p class="muted">Aucune vidéo détectée dans le dossier sélectionné.</p>';
  }
  const lines = [...groups.entries()].map(([title, files]) =>
    `<li><strong>${escapeHtml(title)}</strong> — ${files.length} vidéo${files.length > 1 ? 's' : ''}</li>`
  ).join('');
  const total = [...groups.values()].reduce((n, list) => n + list.length, 0);
  return `
    <p class="muted">${total} vidéo${total > 1 ? 's' : ''} · ${groups.size} section${groups.size > 1 ? 's' : ''} (créées automatiquement si besoin)</p>
    <ul class="folder-import-preview">${lines}</ul>
  `;
}

async function ensureMaterialSectionId(type, title, cache) {
  const normalized = String(title || '').trim();
  if (!normalized) throw new Error('Nom de section invalide');
  const key = normalized.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const existing = (courseData.material_sections?.[type] || []).find(
    (section) => String(section.title || '').trim().toLowerCase() === key
  );
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const res = await API.request(`/api/courses/${courseId}/material-sections`, {
    method: 'POST',
    body: JSON.stringify({
      title: normalized,
      description: '',
      type,
    }),
  });

  if (!courseData.material_sections) courseData.material_sections = {};
  if (!courseData.material_sections[type]) courseData.material_sections[type] = [];
  courseData.material_sections[type].push(res.section);
  cache.set(key, res.section.id);
  return res.section.id;
}

async function uploadFolderVideos(type, fileList, progressEl) {
  const groups = groupFilesByFolderSections([...fileList], isVideoImportFile);
  if (!groups.size) {
    throw new Error('Aucune vidéo trouvée dans le dossier sélectionné');
  }

  const sectionCache = new Map();
  const queue = [];
  for (const [sectionTitle, files] of groups) {
    const sectionId = await ensureMaterialSectionId(type, sectionTitle, sectionCache);
    for (const file of files) {
      queue.push({ file, sectionId, sectionTitle });
    }
  }

  const uploaded = [];
  for (let i = 0; i < queue.length; i++) {
    const { file, sectionId, sectionTitle } = queue[i];
    if (progressEl) {
      progressEl.className = 'status';
      progressEl.textContent = `Importation ${i + 1}/${queue.length} — ${sectionTitle} / ${file.name}`;
      progressEl.hidden = false;
    }

    const res = file.size > API.CHUNK_UPLOAD_BYTES
      ? await API.uploadFileChunked(courseId, {
        type,
        sectionId,
        file,
        onChunkProgress: (chunk, totalChunks) => {
          if (!progressEl) return;
          progressEl.textContent =
            `Importation ${i + 1}/${queue.length} — ${sectionTitle} / ${file.name} (${chunk}/${totalChunks})`;
        },
      })
      : await API.uploadFileDirect(courseId, { type, sectionId, file });

    uploaded.push(res.material);
  }

  return { materials: uploaded, count: uploaded.length, sections: groups.size };
}

function bindFolderImportModal(type) {
  const form = document.getElementById('modal-form');
  if (!form) return;

  const modeRadios = form.querySelectorAll('input[name="import_mode"]');
  const filesPanel = form.querySelector('[data-import-panel="files"]');
  const folderPanel = form.querySelector('[data-import-panel="folder"]');
  const filesInput = form.querySelector('input[name="files"]');
  const folderInput = form.querySelector('input[name="folder_files"]');
  const previewEl = form.querySelector('[data-folder-preview]');
  const sectionField = form.querySelector('[data-section-field]');

  function setMode(mode) {
    const isFolder = mode === 'folder';
    if (filesPanel) filesPanel.hidden = isFolder;
    if (folderPanel) folderPanel.hidden = !isFolder;
    if (sectionField) sectionField.hidden = isFolder;
    if (filesInput) {
      filesInput.required = !isFolder;
      if (isFolder) filesInput.value = '';
    }
    if (folderInput) {
      folderInput.required = isFolder;
      if (!isFolder) {
        folderInput.value = '';
        if (previewEl) previewEl.innerHTML = '';
      }
    }
  }

  modeRadios.forEach((radio) => {
    radio.addEventListener('change', () => setMode(radio.value));
  });

  if (folderInput && previewEl) {
    folderInput.addEventListener('change', () => {
      const groups = groupFilesByFolderSections([...folderInput.files || []], isVideoImportFile);
      previewEl.innerHTML = folderImportPreviewHtml(groups);
    });
  }

  const checked = form.querySelector('input[name="import_mode"]:checked');
  setMode(checked?.value || 'files');
}

async function resolveStreamSources(root = document) {
  const nodes = [...root.querySelectorAll('[data-stream-src]')];
  await Promise.all(nodes.map(async (el) => {
    const materialId = el.dataset.materialId;
    if (!materialId) return;
    try {
      const url = await API.materialStreamUrl(courseId, materialId);
      if (el.tagName === 'A') {
        el.href = url;
      } else {
        el.src = url;
      }
      el.removeAttribute('data-stream-src');
    } catch (_) {
      const fallback = el.dataset.fallbackSrc;
      if (fallback) {
        if (el.tagName === 'A') el.href = fallback;
        else el.src = fallback;
      }
    }
  }));
}

function bindSlideViewers(isOwner) {
  document.querySelectorAll('.protected-slide, .material-stream-open').forEach((el) => {
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    if (el.tagName === 'IMG') {
      el.addEventListener('dragstart', (e) => e.preventDefault());
    }

    const materialId = el.dataset.materialId;
    if (!materialId || isOwner) return;

    const markOnView = () => {
      const entry = el.closest('.slide-entry, .doc-entry');
      if (entry) markMaterialViewedUi(materialId, entry);
      API.markMaterialViewed(courseId, materialId).catch(() => {});
    };

    if (el.classList.contains('material-stream-open')) {
      el.addEventListener('click', () => markOnView());
    } else {
      el.addEventListener('load', markOnView, { once: true });
    }
  });
}

function bindVideoPlayers(isOwner) {
  const marked = new Set();

  document.querySelectorAll('.protected-video').forEach((video) => {
    video.setAttribute('controlsList', 'nodownload noplaybackrate');
    video.addEventListener('contextmenu', (e) => e.preventDefault());
    video.addEventListener('dragstart', (e) => e.preventDefault());

    const materialId = video.dataset.materialId;
    if (!materialId || isOwner) return;

    const markViewed = async () => {
      if (marked.has(materialId)) return;
      marked.add(materialId);

      const entry = video.closest('.video-entry');
      markMaterialViewedUi(materialId, entry);

      try {
        await markMaterialViewed(materialId, 'videos');
      } catch {
        marked.delete(materialId);
      }
    };

    video.addEventListener('ended', markViewed);
    video.addEventListener('timeupdate', () => {
      if (video.duration > 0 && video.currentTime / video.duration >= 0.9) {
        markViewed();
      }
    });
  });
}

function bindMaterialViewLinks(isOwner) {
  if (isOwner) return;

  const marked = new Set();

  document.querySelectorAll('.material-view-link, .doc-download-link').forEach((link) => {
    link.addEventListener('click', async () => {
      const materialId = link.dataset.materialId;
      if (!materialId || marked.has(materialId)) return;
      marked.add(materialId);

      const entry = link.closest('.material-entry, .doc-entry');
      markMaterialViewedUi(materialId, entry);

      try {
        await markMaterialViewed(materialId);
      } catch {
        marked.delete(materialId);
      }
    });
  });
}

function updateSectionProgress(sectionGroup) {
  const items = sectionGroup.querySelectorAll('[data-material-id]');
  const viewed = sectionGroup.querySelectorAll('.material-viewed-badge.is-viewed').length;
  const progressEl = sectionGroup.querySelector('.material-section-progress');
  if (progressEl && items.length) {
    progressEl.textContent = typeof t === 'function'
      ? t('material.consulted', { n: viewed, total: items.length, s: viewed !== 1 ? 's' : '' })
      : `${viewed}/${items.length} consulté${viewed !== 1 ? 's' : ''}`;
  }
}

function bindMaterialTabs(structure) {
  const tabs = document.querySelectorAll('[data-material-tab]');
  const panels = document.querySelectorAll('[data-material-panel]');

  const pickDefaultTab = () => {
    if (structure[activeMaterialTab]?.length) return activeMaterialTab;
    const withContent = MATERIAL_TYPES.find((t) => (structure[t] || []).length);
    return withContent || activeMaterialTab;
  };

  activeMaterialTab = pickDefaultTab();
  sessionStorage.setItem('lms_material_tab', activeMaterialTab);

  const activate = (type) => {
    activeMaterialTab = type;
    sessionStorage.setItem('lms_material_tab', type);
    tabs.forEach((tab) => tab.classList.toggle('is-active', tab.dataset.materialTab === type));
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.materialPanel === type));
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activate(tab.dataset.materialTab));
  });

  activate(activeMaterialTab);
}

function renderMaterials(materials, isOwner, canView, materialSectionsByType = {}) {
  const grid = document.getElementById('materials-grid');
  const structure = materials || Object.fromEntries(MATERIAL_TYPES.map((t) => [t, []]));
  const evaluationUrl = courseData?.course?.evaluation_url
    || 'https://forms.cloud.microsoft/e/RFjBKzfwQQ';

  const tabBar = MATERIAL_TYPES.map((type) => {
    const count = (structure[type] || []).length;
    return `
      <button type="button" class="materials-tab" data-material-tab="${type}">
        <span class="materials-tab-icon">${MATERIAL_ICONS[type]}</span>
        <span class="materials-tab-label">${MATERIAL_LABELS[type]}</span>
        ${count ? `<span class="materials-tab-count">${count}</span>` : ''}
      </button>
    `;
  }).join('') + `
    <a
      class="materials-tab materials-tab--evaluation"
      href="${escapeHtml(evaluationUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      title="Ouvrir le formulaire d'évaluation dans un nouvel onglet"
    >
      <span class="materials-tab-icon" aria-hidden="true">📝</span>
      <span class="materials-tab-label">Évaluation</span>
      <span class="materials-tab-external" aria-hidden="true">↗</span>
    </a>
  `;

  const panels = MATERIAL_TYPES.map((type) => {
    const items = structure[type] || [];
    const sections = materialSectionsByType[type] || [];
    const isSectioned = SECTIONED_TYPES.includes(type);
    return `
      <article class="materials-panel card material-type-panel" data-material-panel="${type}" data-type="${type}">
        <div class="material-header">
          <h4><span class="material-icon">${MATERIAL_ICONS[type]}</span> ${MATERIAL_LABELS[type]}</h4>
          ${isOwner ? `
            <div class="material-actions">
              ${isSectioned ? `<button type="button" class="btn-secondary btn-xs" data-action="add-material-section" data-type="${type}">${typeof t === 'function' ? t('material.addSection') : '+ Section'}</button>` : ''}
              ${isSectioned ? `<button type="button" class="btn-secondary btn-xs" data-action="manage-material-sections" data-type="${type}">${typeof t === 'function' ? t('material.manageSections') : 'Gérer les sections'}</button>` : ''}
              <button type="button" class="btn-secondary btn-xs" data-action="add-material" data-type="${type}">${typeof t === 'function' ? t('material.add') : '+ Ajouter'}</button>
              <button type="button" class="btn-secondary btn-xs" data-action="batch-upload" data-type="${type}">${typeof t === 'function' ? t('material.import') : 'Importer'}</button>
              <input type="file" multiple hidden data-batch-input="${type}"${type === 'videos' ? ' accept="video/*"' : ''}>
            </div>
          ` : ''}
        </div>
        ${canView
          ? (isSectioned
            ? renderMaterialSections(type, items, sections, isOwner)
            : `<p class="muted">${EMPTY_TYPE_LABELS[type]}</p>`)
          : '<p class="muted">Accessible après inscription.</p>'}
      </article>
    `;
  }).join('');

  grid.innerHTML = `
    <div class="materials-browser">
      <nav class="materials-tab-bar" aria-label="Types de matériel">${tabBar}</nav>
      <div class="materials-panels">${panels}</div>
    </div>
  `;

  bindMaterialTabs(structure);
  bindMaterialEvents(isOwner, materialSectionsByType);
  resolveStreamSources().finally(() => {
    bindVideoPlayers(isOwner);
    bindSlideViewers(isOwner);
    bindMaterialViewLinks(isOwner);
  });
}

function bindMaterialEvents(isOwner, materialSectionsByType = {}) {
  if (!isOwner) return;

  document.querySelectorAll('[data-action="add-material-section"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      showModal(`Nouvelle section — ${MATERIAL_LABELS[type]}`, sectionFormFields(), async (fd) => {
        await API.request(`/api/courses/${courseId}/material-sections`, {
          method: 'POST',
          body: JSON.stringify({
            title: fd.get('title'),
            description: fd.get('description'),
            type,
          }),
        });
      });
    });
  });

  document.querySelectorAll('[data-action="manage-material-sections"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const sections = materialSectionsByType[type] || [];
      showSectionManageModal(type, sections);
    });
  });

  document.querySelectorAll('[data-action="edit-material-section"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const type = btn.dataset.type;
      const section = (courseData.material_sections?.[type] || []).find(
        (s) => s.id === parseInt(btn.dataset.id, 10)
      );
      if (!section) return;
      showSectionEditModal(type, section);
    });
  });

  document.querySelectorAll('[data-action="delete-material-section"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Supprimer cette section ? Les éléments seront déplacés vers « Sans catégorie ».')) return;
      await API.request(`/api/courses/${courseId}/material-sections/${btn.dataset.id}`, { method: 'DELETE' });
      loadCourse();
    });
  });

  document.querySelectorAll('[data-action="add-material"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const sections = materialSectionsByType[type] || [];
      const form = document.getElementById('modal-form');
      form.setAttribute('enctype', 'multipart/form-data');

      showModal(`Ajouter — ${MATERIAL_LABELS[type]}`, `
        <div class="field"><label>Titre</label><input name="title" placeholder="Optionnel si fichier fourni"></div>
        <div class="field"><label>Description</label><input name="description"></div>
        ${sectionFieldHtml(type, sections)}
        <div class="field"><label>Fichier</label><input name="file" type="file"${type === 'videos' ? ' accept="video/*"' : ''}></div>
        <div class="field"><label>URL externe (optionnel)</label><input name="url" type="url" placeholder="https://..."></div>
        <p class="muted upload-hint">Aucune limite de taille ni de nombre de fichiers.</p>
      `, async (fd) => {
        const file = fd.get('file');
        const hasFile = file && typeof file.size === 'number' && file.size > 0;
        if (hasFile && file.size > API.CHUNK_UPLOAD_BYTES) {
          await API.uploadFileChunked(courseId, {
            type,
            sectionId: fd.get('section_id') || '',
            file,
          });
        } else {
          fd.append('type', type);
          await API.uploadMaterials(courseId, fd);
        }
      });
    });
  });

  document.querySelectorAll('[data-action="batch-upload"]').forEach((btn) => {
    const type = btn.dataset.type;
    const sections = materialSectionsByType[type] || [];
    const input = document.querySelector(`[data-batch-input="${type}"]`);

    btn.addEventListener('click', () => {
      if (SECTIONED_TYPES.includes(type)) {
        const form = document.getElementById('modal-form');
        form.setAttribute('enctype', 'multipart/form-data');
        const acceptAttr = type === 'videos'
          ? ' accept="video/*"'
          : type === 'slides'
            ? ' accept=".pdf,.ppt,.pptx,image/*,application/pdf"'
            : '';
        const folderMode = type === 'videos';

        showModal(`Importer — ${MATERIAL_LABELS[type]}`, `
          ${folderMode ? `
            <div class="field">
              <label>Mode d'import</label>
              <div class="import-mode-options">
                <label class="radio-inline"><input type="radio" name="import_mode" value="files" checked> Fichiers</label>
                <label class="radio-inline"><input type="radio" name="import_mode" value="folder"> Dossier (sections auto)</label>
              </div>
            </div>
          ` : ''}
          <div data-section-field>
            ${sectionFieldHtml(type, sections)}
          </div>
          <div class="field" data-import-panel="files">
            <label>Fichiers</label>
            <input name="files" type="file" multiple${acceptAttr} required>
            <p class="muted upload-hint">Les fichiers sont importés un par un pour plus de fiabilité.</p>
          </div>
          ${folderMode ? `
            <div class="field" data-import-panel="folder" hidden>
              <label>Dossier</label>
              <input name="folder_files" type="file" webkitdirectory directory multiple accept="video/*">
              <p class="muted upload-hint">
                Sélectionnez le dossier parent : chaque sous-dossier devient une section ;
                les vidéos à la racine vont dans une section portant le nom du dossier choisi.
                Les sous-dossiers imbriqués restent dans la section du 1er niveau.
              </p>
              <div data-folder-preview></div>
            </div>
          ` : ''}
        `, async (fd) => {
          const progressEl = document.getElementById('modal-error');
          const mode = fd.get('import_mode') || 'files';

          if (folderMode && mode === 'folder') {
            const folderFiles = fd.getAll('folder_files').filter((file) => file && file.size > 0);
            if (!folderFiles.length) throw new Error('Sélectionnez un dossier contenant des vidéos');
            await uploadFolderVideos(type, folderFiles, progressEl);
            return;
          }

          const files = fd.getAll('files').filter((file) => file && file.size > 0);
          if (!files.length) throw new Error('Sélectionnez au moins un fichier');
          await uploadFilesSequential(type, files, fd.get('section_id') || '', progressEl);
        });

        if (folderMode) bindFolderImportModal(type);
      } else {
        input.click();
      }
    });

    input.addEventListener('change', async () => {
      if (!input.files.length) return;
      try {
        await uploadFilesSequential(type, [...input.files], '', null);
        input.value = '';
        loadCourse();
      } catch (err) {
        alert(err.message);
        input.value = '';
      }
    });
  });

  document.querySelectorAll('[data-action="edit-material"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      let item = null;
      let itemType = null;
      for (const type of MATERIAL_TYPES) {
        item = (courseData.materials[type] || []).find((m) => m.id === id);
        if (item) {
          itemType = type;
          break;
        }
      }
      if (!item) return;

      const sections = courseData.material_sections?.[itemType] || [];
      const form = document.getElementById('modal-form');
      form.setAttribute('enctype', 'multipart/form-data');

      showModal('Modifier l\'élément', `
        <div class="field"><label>Titre</label><input name="title" required></div>
        <div class="field"><label>Description</label><input name="description"></div>
        ${sectionFieldHtml(itemType, sections, item.section_id || '')}
        <div class="field"><label>URL externe</label><input name="url" type="url"></div>
        <div class="field"><label>Remplacer le fichier</label><input name="file" type="file"></div>
        ${item.has_file ? `<p class="muted">Fichier actuel : ${item.original_filename || item.title}</p>` : ''}
      `, async (fd) => {
        const body = {
          title: fd.get('title'),
          description: fd.get('description'),
          url: fd.get('url'),
        };
        if (SECTIONED_TYPES.includes(itemType)) {
          body.section_id = fd.get('section_id') || null;
        }
        await API.request(`/api/courses/${courseId}/materials/${id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        const fileInput = form.querySelector('[name="file"]');
        if (fileInput?.files?.length) {
          const fileFd = new FormData();
          fileFd.append('file', fileInput.files[0]);
          await API.request(`/api/courses/${courseId}/materials/${id}/file`, {
            method: 'PUT',
            body: fileFd,
          });
        }
      });

      form.querySelector('[name="title"]').value = item.title;
      form.querySelector('[name="description"]').value = item.description || '';
      form.querySelector('[name="url"]').value = item.url || '';
    });
  });

  document.querySelectorAll('[data-action="delete-material"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cet élément ?')) return;
      await API.request(`/api/courses/${courseId}/materials/${btn.dataset.id}`, { method: 'DELETE' });
      loadCourse();
    });
  });
}

function renderModules(modules, canManageModules, canView) {
  const list = document.getElementById('modules-list');
  if (!modules.length) {
    list.innerHTML = `<p class="muted">${typeof t === 'function' ? t('course.noModules') : 'Aucun module pour le moment.'}</p>`;
    bindModuleEvents(canManageModules);
    return;
  }

  list.innerHTML = modules.map((mod) => `
    <article class="card module-card">
      <div class="module-header">
        <h4>${mod.title}</h4>
        ${canManageModules ? `
          <div class="inline-actions">
            <button class="btn-secondary btn-xs" data-action="edit-module" data-id="${mod.id}" data-title="${mod.title}">Modifier</button>
            <button class="btn-danger btn-xs" data-action="delete-module" data-id="${mod.id}">Supprimer</button>
          </div>
        ` : ''}
      </div>
      ${canView ? `
        <div class="module-content">
          <div class="subsection">
            <div class="subsection-header">
              <strong>Leçons</strong>
              ${canManageModules ? `<button class="btn-secondary btn-xs" data-action="add-lesson" data-module="${mod.id}">+ Leçon</button>` : ''}
            </div>
            <ul class="item-list">
              ${mod.lessons.length
                ? mod.lessons.map((l) => `
                  <li>
                    <a href="#" data-action="view-lesson" data-module="${mod.id}" data-id="${l.id}">${l.title}</a>
                    ${canManageModules ? `<button class="btn-danger btn-xs" data-action="delete-lesson" data-module="${mod.id}" data-id="${l.id}">×</button>` : ''}
                  </li>
                `).join('')
                : '<li class="muted">Aucune leçon</li>'}
            </ul>
          </div>
          <div class="subsection">
            <div class="subsection-header">
              <strong>Quiz</strong>
              ${canManageModules ? `<button class="btn-secondary btn-xs" data-action="add-quiz" data-module="${mod.id}">+ Quiz</button>` : ''}
            </div>
            <ul class="item-list">
              ${mod.quizzes.length
                ? mod.quizzes.map((q) => `
                  <li>
                    <a href="#" data-action="view-quiz" data-module="${mod.id}" data-id="${q.id}">${q.title}</a>
                    ${canManageModules ? `<button class="btn-danger btn-xs" data-action="delete-quiz" data-module="${mod.id}" data-id="${q.id}">×</button>` : ''}
                  </li>
                `).join('')
                : '<li class="muted">Aucun quiz</li>'}
            </ul>
          </div>
        </div>
      ` : '<p class="muted">Contenu accessible après inscription.</p>'}
    </article>
  `).join('');

  bindModuleEvents(canManageModules);
}

function bindModuleEvents(canManageModules) {
  setAddModuleButtonEnabled(canManageModules);
  if (canManageModules) {
    document.getElementById('add-module-btn').onclick = () => {
      if (!canUserManageModules(courseData?.can_manage)) return;
      showModal('Nouveau module', `
        <div class="field"><label>Titre</label><input name="title" required></div>
      `, async (fd) => {
        await API.request(`/api/courses/${courseId}/modules`, {
          method: 'POST',
          body: JSON.stringify({ title: fd.get('title') }),
        });
      });
    };
  }

  document.querySelectorAll('#modules-list [data-action]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      e.preventDefault();
      const action = el.dataset.action;
      if (MODULE_OWNER_ACTIONS.has(action) && !canManageModules) return;
      const moduleId = el.dataset.module;
      const id = el.dataset.id;

      if (action === 'edit-module') {
        showModal('Modifier le module', `
          <div class="field"><label>Titre</label><input name="title" value="${el.dataset.title}" required></div>
        `, async (fd) => {
          await API.request(`/api/courses/${courseId}/modules/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ title: fd.get('title') }),
          });
        });
      }

      if (action === 'delete-module') {
        if (!confirm('Supprimer ce module ?')) return;
        await API.request(`/api/courses/${courseId}/modules/${id}`, { method: 'DELETE' });
        loadCourse();
      }

      if (action === 'add-lesson') {
        showModal('Nouvelle leçon', `
          <div class="field"><label>Titre</label><input name="title" required></div>
          <div class="field"><label>Contenu</label><textarea name="content" rows="6"></textarea></div>
        `, async (fd) => {
          await API.request(`/api/courses/${courseId}/modules/${moduleId}/lessons`, {
            method: 'POST',
            body: JSON.stringify({ title: fd.get('title'), content: fd.get('content') }),
          });
        });
      }

      if (action === 'view-lesson') {
        const { lesson } = await API.request(
          `/api/courses/${courseId}/modules/${moduleId}/lessons/${id}`
        );
        showModal(lesson.title, `
          <div class="lesson-content">${lesson.content.replace(/\n/g, '<br>') || '<em class="muted">Contenu vide</em>'}</div>
        `, null, true);
      }

      if (action === 'delete-lesson') {
        if (!confirm('Supprimer cette leçon ?')) return;
        await API.request(`/api/courses/${courseId}/modules/${moduleId}/lessons/${id}`, { method: 'DELETE' });
        loadCourse();
      }

      if (action === 'add-quiz') {
        showModal('Nouveau quiz', `
          <div class="field"><label>Titre</label><input name="title" required></div>
          <div class="field"><label>Question</label><input name="question" required></div>
          <div class="field"><label>Option 1</label><input name="opt0" required></div>
          <div class="field"><label>Option 2</label><input name="opt1" required></div>
          <div class="field"><label>Option 3</label><input name="opt2"></div>
          <div class="field"><label>Bonne réponse (1, 2 ou 3)</label><input name="correct" type="number" min="1" max="3" value="1" required></div>
        `, async (fd) => {
          const options = [fd.get('opt0'), fd.get('opt1'), fd.get('opt2')].filter(Boolean);
          await API.request(`/api/courses/${courseId}/modules/${moduleId}/quizzes`, {
            method: 'POST',
            body: JSON.stringify({
              title: fd.get('title'),
              questions: [{
                question: fd.get('question'),
                options,
                correct_answer: parseInt(fd.get('correct'), 10) - 1,
              }],
            }),
          });
        });
      }

      if (action === 'view-quiz') {
        const { quiz } = await API.request(
          `/api/courses/${courseId}/modules/${moduleId}/quizzes/${id}`
        );
        const questionsHtml = quiz.questions.map((q, qi) => `
          <fieldset class="quiz-question">
            <legend>${q.question}</legend>
            ${q.options.map((opt, oi) => `
              <label class="radio-label">
                <input type="radio" name="q${qi}" value="${oi}"> ${opt}
              </label>
            `).join('')}
          </fieldset>
        `).join('');

        showModal(quiz.title, `
          <div id="quiz-body">${questionsHtml}</div>
          <button type="button" class="btn-primary" id="submit-quiz">Soumettre</button>
          <p id="quiz-result" class="status" hidden></p>
        `, null, true);

        document.getElementById('submit-quiz').onclick = async () => {
          const answers = quiz.questions.map((_, qi) => {
            const selected = document.querySelector(`input[name="q${qi}"]:checked`);
            return selected ? parseInt(selected.value, 10) : -1;
          });
          const result = await API.request(
            `/api/courses/${courseId}/modules/${moduleId}/quizzes/${id}/submit`,
            { method: 'POST', body: JSON.stringify({ answers }) }
          );
          const resEl = document.getElementById('quiz-result');
          resEl.textContent = `Score : ${result.score}/${result.total} (${result.percentage}%)`;
          resEl.className = 'status ok';
          resEl.hidden = false;
        };
      }

      if (action === 'delete-quiz') {
        if (!confirm('Supprimer ce quiz ?')) return;
        await API.request(`/api/courses/${courseId}/modules/${moduleId}/quizzes/${id}`, { method: 'DELETE' });
        loadCourse();
      }
    });
  });
}

setAddModuleButtonEnabled(false);
document.addEventListener('lms:localechange', () => {
  if (courseData) loadCourse();
});
loadCourse();
