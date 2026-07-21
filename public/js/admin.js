if (!requireAuth()) throw new Error();

const modal = document.getElementById('modal');
let modalAction = null;
let users = [];
let courses = [];
let assignableCourses = [];
let pendingInstructorRequests = [];
let pendingLearnerRequests = [];
let adminCapabilities = {
  can_assign_admin: false,
  is_primary_admin: false,
  assignable_roles: ['learner', 'instructor'],
};
let currentAdminUser = null;
let mailConfigBound = false;

function getAdminPanels() {
  const tr = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);
  return {
    overview: {
      title: tr('admin.panel.overview', "Vue d'ensemble de la plateforme"),
      headerAction: 'user',
    },
    mail: {
      title: tr('admin.panel.mail', 'Configuration Microsoft 365 / envoi e-mail'),
      headerAction: null,
    },
    newsletter: {
      title: tr('admin.panel.newsletter', 'Composition et envoi de la newsletter formations'),
      headerAction: null,
    },
    'learners-pending': {
      title: tr('admin.panel.learners', 'Validation des inscriptions apprenants'),
      headerAction: null,
    },
    'instructors-pending': {
      title: tr('admin.panel.instructors', 'Validation des demandes formateur'),
      headerAction: null,
    },
    users: {
      title: tr('admin.panel.users', 'Gestion des comptes et des rôles'),
      headerAction: 'user',
    },
    courses: {
      title: tr('admin.panel.courses', 'Catalogue, sessions et fréquentation'),
      headerAction: 'course',
    },
  };
}

const ADMIN_PANELS = new Proxy({}, {
  get(_t, prop) {
    return getAdminPanels()[prop];
  },
  has(_t, prop) {
    return prop in getAdminPanels();
  },
  ownKeys() {
    return Object.keys(getAdminPanels());
  },
  getOwnPropertyDescriptor(_t, prop) {
    if (prop in getAdminPanels()) {
      return { configurable: true, enumerable: true, value: getAdminPanels()[prop] };
    }
    return undefined;
  },
});

function getAdminPanelId() {
  const hash = (window.location.hash || '#overview').replace(/^#/, '');
  return ADMIN_PANELS[hash] ? hash : 'overview';
}

function setAdminNavBadge(key, count) {
  const badge = document.querySelector(`[data-admin-badge="${key}"]`);
  if (!badge) return;
  const n = Number(count) || 0;
  badge.textContent = String(n);
  badge.hidden = n <= 0;
}

function showAdminPanel(panelId, { updateHash = true } = {}) {
  const id = ADMIN_PANELS[panelId] ? panelId : 'overview';
  const meta = ADMIN_PANELS[id];

  document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
    const active = panel.dataset.adminPanel === id;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });

  document.querySelectorAll('[data-admin-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.adminNav === id);
  });

  const mobileSelect = document.getElementById('admin-mobile-nav');
  if (mobileSelect && mobileSelect.value !== id) {
    mobileSelect.value = id;
  }

  const subtitle = document.getElementById('admin-panel-subtitle');
  if (subtitle) subtitle.textContent = meta.title;

  const headerActions = document.getElementById('admin-header-actions');
  if (headerActions) {
    headerActions.hidden = meta.headerAction !== 'user';
  }

  if (updateHash) {
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, '', nextHash);
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initAdminMobileNav() {
  const subnav = document.querySelector('.admin-subnav');
  if (!subnav || document.getElementById('admin-mobile-nav')) return;

  const wrap = document.createElement('div');
  wrap.className = 'admin-mobile-nav-wrap';
  wrap.innerHTML = `
    <label class="admin-mobile-nav-label" for="admin-mobile-nav">${typeof t === 'function' ? t('admin.menu') : 'Menu'}</label>
    <select id="admin-mobile-nav" class="admin-mobile-nav" aria-label="${typeof t === 'function' ? t('admin.menu') : 'Menu administration'}"></select>
  `;

  const select = wrap.querySelector('select');
  const groups = [...subnav.querySelectorAll('.admin-subnav-group')];
  groups.forEach((group) => {
    const label = group.querySelector('.admin-subnav-group-label')?.textContent?.trim() || '';
    const links = [...group.querySelectorAll('[data-admin-nav]')];
    if (!links.length) return;
    const optgroup = document.createElement('optgroup');
    optgroup.label = label || '—';
    links.forEach((link) => {
      const opt = document.createElement('option');
      opt.value = link.dataset.adminNav;
      const text = link.querySelector('span:not(.admin-subnav-badge)')?.textContent?.trim()
        || link.textContent.trim();
      opt.textContent = text;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });

  select.value = getAdminPanelId();
  select.addEventListener('change', () => {
    showAdminPanel(select.value);
  });

  subnav.parentNode.insertBefore(wrap, subnav);
}

function initAdminNavigation() {
  initAdminMobileNav();

  document.querySelectorAll('[data-admin-nav]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const panelId = link.dataset.adminNav;
      if (!ADMIN_PANELS[panelId]) return;
      event.preventDefault();
      showAdminPanel(panelId);
    });
  });

  window.addEventListener('hashchange', () => {
    showAdminPanel(getAdminPanelId(), { updateHash: false });
  });

  showAdminPanel(getAdminPanelId(), { updateHash: true });
}

function companyFieldHtml(value = '', { required = false } = {}) {
  return `
    <div class="field" data-company-field>
      <label>Entreprise${required ? '' : ' <span class="muted">(apprenants)</span>'}</label>
      <input name="company" type="text" maxlength="120" value="${String(value || '').replace(/"/g, '&quot;')}" placeholder="Nom de l'entreprise" ${required ? 'required' : ''}>
      <p class="muted field-hint">Obligatoire pour les apprenants.</p>
    </div>
  `;
}

function bindCompanyRoleToggle(form, initialRole = 'learner') {
  if (!form) return;
  const roleSelectEl = form.querySelector('select[name="role"]');
  const companyInput = form.querySelector('input[name="company"]');
  if (!roleSelectEl || !companyInput) return;

  const sync = () => {
    const isLearner = roleSelectEl.value === 'learner';
    companyInput.required = isLearner;
  };
  roleSelectEl.addEventListener('change', sync);
  roleSelectEl.value = initialRole;
  sync();
}

function openCreateUserModal() {
  showModal('Nouvel utilisateur', `
    <div class="field"><label>Nom</label><input name="name" required></div>
    <div class="field"><label>Email</label><input name="email" type="email" required></div>
    <div class="field"><label>Mot de passe</label><input name="password" type="password" minlength="6" required></div>
    ${roleSelect('role', 'learner')}
    ${companyFieldHtml('', { required: true })}
  `, async (fd) => {
    await API.request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role'),
        company: fd.get('company'),
      }),
    });
  }, (form) => {
    bindCompanyRoleToggle(form, 'learner');
  });
}

document.getElementById('modal-cancel').addEventListener('click', () => {
  modal.hidden = true;
});

function showModal(title, fields, onSubmit, afterRender) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-form').innerHTML = fields;
  document.getElementById('modal-error').hidden = true;
  modalAction = onSubmit;
  modal.hidden = false;
  const actions = document.getElementById('modal-actions');
  if (actions) actions.hidden = !onSubmit;
  const form = document.getElementById('modal-form');
  if (typeof afterRender === 'function') {
    afterRender(form);
  } else if (typeof bindSchedulePickers === 'function') {
    bindSchedulePickers(form);
  }
}

document.getElementById('modal-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!modalAction) return;
  const errEl = document.getElementById('modal-error');
  errEl.hidden = true;
  try {
    await modalAction(new FormData(e.target), e.target);
    modal.hidden = true;
    loadAdmin();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
});

function roleSelect(name, value = 'learner', roles = null) {
  const options = roles || adminCapabilities.assignable_roles || ['learner', 'instructor'];
  const labels = {
    learner: 'Apprenant',
    instructor: 'Formateur',
    admin: 'Administrateur',
  };

  return `
    <div class="field">
      <label>Rôle</label>
      <select name="${name}">
        ${options.map((role) => `
          <option value="${role}"${value === role ? ' selected' : ''}>${labels[role] || role}</option>
        `).join('')}
      </select>
      ${!adminCapabilities.can_assign_admin ? '<p class="muted field-hint">Seul l\'administrateur principal peut créer un administrateur.</p>' : ''}
    </div>
  `;
}

function statusBadge(user) {
  if (!user.approved) {
    if (user.role === 'instructor') {
      return '<span class="role-badge role-pending">Formateur en attente</span>';
    }
    if (user.role === 'learner') {
      return '<span class="role-badge role-pending">Apprenant en attente</span>';
    }
  }
  if (user.role === 'instructor') {
    return '<span class="role-badge role-instructor">Validé</span>';
  }
  if (user.role === 'learner') {
    return '<span class="role-badge role-learner">Validé</span>';
  }
  return '<span class="muted">—</span>';
}

function canAssignTeaching(user) {
  if (!user) return false;
  if (user.role === 'admin') return !!user.is_instructor;
  return user.role === 'instructor' && !!user.approved;
}

function teachingAssignmentItemHtml(user, assignment) {
  const courseId = assignment.course_id;
  return `
    <li class="enrollment-item enrollment-item--stacked">
      <div class="enrollment-item-main">
        <span>
          ${assignment.title} <small class="muted">(${assignment.subject_label}) · ${assignment.duration_days || 1} j</small><br>
          <small class="muted">${formatSessionDatesLabel(assignment.session_dates)}</small>
        </span>
        <div class="inline-actions">
          <button type="button" class="btn-secondary btn-xs" data-edit-teaching-schedule data-course="${courseId}">Choisir les jours</button>
          <button type="button" class="btn-danger btn-xs" data-unassign="${user.id}" data-course="${courseId}">Retirer</button>
        </div>
      </div>
      <div class="schedule-picker-panel schedule-picker-panel--inline" data-teaching-schedule-panel="${courseId}" hidden>
        ${schedulePickerHtml(courseId, assignment.duration_days || 1, assignment.title, assignment.session_dates || [])}
        <div class="schedule-picker-actions">
          <button type="button" class="btn-primary btn-xs" data-save-teaching-schedule data-course="${courseId}">Enregistrer les jours</button>
        </div>
      </div>
    </li>
  `;
}

function bindTeachingScheduleEditors(form, user, assignments) {
  form.querySelectorAll('[data-edit-teaching-schedule]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const courseId = btn.dataset.course;
      const panel = form.querySelector(`[data-teaching-schedule-panel="${courseId}"]`);
      if (!panel) return;

      const willOpen = panel.hidden;
      form.querySelectorAll('[data-teaching-schedule-panel]').forEach((p) => {
        p.hidden = true;
      });

      if (willOpen) {
        panel.hidden = false;
        const picker = panel.querySelector('[data-schedule-picker]');
        if (picker && typeof mountSchedulePickerFresh === 'function') {
          mountSchedulePickerFresh(picker);
        } else if (picker) {
          bindSchedulePickers(panel);
        }
      }
    });
  });

  form.querySelectorAll('[data-save-teaching-schedule]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = parseInt(btn.dataset.course, 10);
      const assignment = assignments.find((a) => a.course_id === courseId);
      const courseMeta = assignableCourses.find((c) => c.id === courseId) || assignment;
      const coursesById = coursesMapFromList([{
        id: courseId,
        title: courseMeta?.title || assignment?.title,
        duration_days: courseMeta?.duration_days || assignment?.duration_days || 1,
      }]);

      try {
        validateSchedulesInForm(form, [courseId], coursesById);
        const sessionDates = collectScheduleFromForm(form, courseId);
        await API.request(`/api/admin/users/${user.id}/instructor-assignments/${courseId}`, {
          method: 'PUT',
          body: JSON.stringify({ session_dates: sessionDates }),
        });
        modal.hidden = true;
        loadAdmin();
      } catch (err) {
        const errEl = document.getElementById('modal-error');
        errEl.textContent = err.message;
        errEl.hidden = false;
      }
    });
  });
}

function showAdminError(message, withLoginLink = false) {
  const errEl = document.getElementById('admin-error');
  if (withLoginLink) {
    errEl.innerHTML = `${message} — <a href="/login.html">Se reconnecter</a>`;
  } else {
    errEl.textContent = message;
  }
  errEl.hidden = false;
}

function clearAdminError() {
  const errEl = document.getElementById('admin-error');
  errEl.hidden = true;
  errEl.textContent = '';
}

function unwrapResult(result, fallback) {
  if (result.status === 'fulfilled') return result.value;
  return fallback;
}

async function loadAdmin() {
  clearAdminError();
  const loadingEl = document.getElementById('admin-loading');
  if (loadingEl) loadingEl.hidden = false;

  try {
    const me = await API.request('/api/auth/me');
    const currentUser = me.user;
    currentAdminUser = currentUser;
    window.currentAdminUser = currentUser;
    API.setUser(currentUser);
    if (me.token) API.setToken(me.token);
    updateNav();

    if (currentUser.role !== 'admin') {
      window.location.href = '/dashboard.html';
      return;
    }

    const [statsRes, usersRes, coursesRes, assignableRes, requestsRes, learnerRequestsRes, capsRes] = await Promise.allSettled([
      API.request('/api/admin/stats'),
      API.request('/api/admin/users'),
      API.request('/api/admin/courses'),
      API.request('/api/admin/courses/assignable'),
      API.request('/api/admin/instructor-requests'),
      API.request('/api/admin/learner-requests'),
      API.request('/api/admin/capabilities'),
    ]);

    const errors = [statsRes, usersRes, coursesRes, assignableRes, requestsRes, learnerRequestsRes, capsRes]
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Erreur inconnue');

    const stats = unwrapResult(statsRes, { stats: null }).stats;
    const userList = unwrapResult(usersRes, { users: [] }).users || [];
    courses = unwrapResult(coursesRes, { courses: [] }).courses || [];
    assignableCourses = unwrapResult(assignableRes, { courses: [] }).courses || [];
    const requests = unwrapResult(requestsRes, { requests: [] }).requests || [];
    const learnerRequests = unwrapResult(learnerRequestsRes, { requests: [] }).requests || [];
    const capabilities = unwrapResult(capsRes, { capabilities: adminCapabilities }).capabilities;

    if (capabilities) {
      adminCapabilities = capabilities;
    }

    users = userList;
    pendingInstructorRequests = requests;
    pendingLearnerRequests = learnerRequests;

    const rolesHint = document.getElementById('roles-hint');
    if (rolesHint) {
      rolesHint.textContent = adminCapabilities.can_assign_admin
        ? 'Les formateurs et apprenants en attente peuvent être validés depuis le tableau (bouton « Valider et assigner ») ou depuis les sections dédiées du menu. Vous pouvez attribuer les rôles Apprenant, Formateur et Administrateur.'
        : 'Les formateurs et apprenants en attente peuvent être validés depuis le tableau (bouton « Valider et assigner ») ou depuis les sections dédiées du menu. Seul l\'administrateur principal peut créer un administrateur.';
    }

    if (stats) {
      document.getElementById('stats-grid').innerHTML = `
        <article class="card stat-card"><strong>${stats.users}</strong><span>Utilisateurs</span></article>
        <article class="card stat-card"><strong>${stats.pending_instructors}</strong><span>Formateurs en attente</span></article>
        <article class="card stat-card"><strong>${stats.pending_learners ?? 0}</strong><span>Apprenants en attente</span></article>
        <article class="card stat-card"><strong>${stats.courses}</strong><span>Cours</span></article>
        <article class="card stat-card"><strong>${stats.enrollments}</strong><span>Inscriptions</span></article>
      `;
    }

    setAdminNavBadge('learners-pending', learnerRequests.length);
    setAdminNavBadge('instructors-pending', requests.length);

    const learnerPendingBox = document.getElementById('learner-pending-requests');
    const learnerPendingEmpty = document.getElementById('learner-pending-empty');

    if (learnerRequests.length) {
      learnerPendingBox.innerHTML = learnerRequests.map((r) => `
        <article class="card pending-card">
          ${userProfileCellHtml(r, `
            ${avatarImgHtml(r, 'sm')}
            <div>
              <strong>${r.name}</strong>
              <p class="muted">${r.email}${r.company ? ` · ${r.company}` : ''} · inscrit le ${new Date(r.created_at).toLocaleDateString('fr-CH')}</p>
            </div>
          `)}
          <div class="inline-actions">
            <button class="btn-primary btn-sm" data-approve-learner="${r.id}">Valider et assigner</button>
            <button class="btn-danger btn-sm" data-reject-learner="${r.id}">Refuser</button>
          </div>
        </article>
      `).join('');
      if (learnerPendingEmpty) learnerPendingEmpty.hidden = true;
    } else {
      learnerPendingBox.innerHTML = '';
      if (learnerPendingEmpty) learnerPendingEmpty.hidden = false;
    }

    const pendingBox = document.getElementById('pending-requests');
    const instructorPendingEmpty = document.getElementById('instructor-pending-empty');

    if (requests.length) {
      pendingBox.innerHTML = requests.map((r) => `
        <article class="card pending-card">
          ${userProfileCellHtml(r, `
            ${avatarImgHtml(r, 'sm')}
            <div>
              <strong>${r.name}</strong>
              <p class="muted">${r.email}${r.company ? ` · ${r.company}` : ''} · inscrit le ${new Date(r.created_at).toLocaleDateString('fr-CH')}</p>
            </div>
          `)}
          <div class="inline-actions">
            <button class="btn-primary btn-sm" data-approve-instructor="${r.id}">Valider et assigner</button>
            <button class="btn-danger btn-sm" data-reject="${r.id}">Refuser</button>
          </div>
        </article>
      `).join('');
      if (instructorPendingEmpty) instructorPendingEmpty.hidden = true;
    } else {
      pendingBox.innerHTML = '';
      if (instructorPendingEmpty) instructorPendingEmpty.hidden = false;
    }

    const tbody = document.getElementById('users-body');
    const meUser = API.getUser();

    tbody.innerHTML = users.length
      ? users.map((u) => `
      <tr${u.id === meUser?.id ? ' class="row-current-user"' : ''}>
        <td class="col-name">
          ${userProfileCellHtml(u, `
            ${avatarImgHtml(u, 'sm')}
            <span>${u.name}${u.id === meUser?.id ? ' <span class="muted">(vous)</span>' : ''}</span>
          `)}
        </td>
        <td class="col-email">${u.email}</td>
        <td class="col-company">${u.company ? u.company : '<span class="muted">—</span>'}</td>
        <td class="col-role"><span class="role-badge role-${u.role}">${ROLE_LABELS[u.role] || u.role}</span></td>
        <td class="col-status">${statusBadge(u)}</td>
        <td class="col-count">${u.course_count ?? 0}</td>
        <td class="col-count">${u.enrollment_count ?? 0}</td>
        <td class="col-actions table-actions">
          <button class="btn-primary btn-xs" data-edit-user="${u.id}">Modifier</button>
          ${u.role === 'instructor' && !u.approved ? `<button class="btn-secondary btn-xs" data-approve-instructor="${u.id}">Valider</button>` : ''}
          ${u.role === 'learner' && !u.approved ? `<button class="btn-secondary btn-xs" data-approve-learner="${u.id}">Valider</button>` : ''}
          ${u.role === 'learner' && u.approved ? `<button class="btn-secondary btn-xs" data-assign-courses="${u.id}">Cours</button>` : ''}
          ${u.role === 'learner' && u.approved ? `<button class="btn-secondary btn-xs" data-user-access="${u.id}">Accès</button>` : ''}
          ${canAssignTeaching(u) ? `<button class="btn-secondary btn-xs" data-assign-teaching="${u.id}">Enseignement</button>` : ''}
          ${u.role === 'instructor' && !u.approved ? `<button class="btn-danger btn-xs" data-reject="${u.id}">Refuser</button>` : ''}
          ${u.role === 'learner' && !u.approved ? `<button class="btn-danger btn-xs" data-reject-learner="${u.id}">Refuser</button>` : ''}
          ${u.id !== meUser?.id ? `<button class="btn-danger btn-xs" data-delete-user="${u.id}">Supprimer</button>` : ''}
        </td>
      </tr>
    `).join('')
      : '<tr><td colspan="8" class="muted">Aucun utilisateur trouvé</td></tr>';

    document.getElementById('admin-courses').innerHTML = courses.length
      ? courses.map((c) => `
        <article class="card course-card">
          ${c.subject_label ? `<span class="subject-badge">${c.subject_label}</span>` : ''}
          <h4>${c.title}</h4>
          <p class="muted">${c.description || 'Aucune description'}</p>
          <p class="meta">${c.instructor_name} · ${c.enrollment_count} inscrit(s)</p>
          <div class="card-actions">
            <a href="/course.html?id=${c.id}" class="btn-secondary btn-sm">Voir</a>
            <button class="btn-secondary btn-sm" data-manage-sessions="${c.id}">Sessions</button>
            <button class="btn-secondary btn-sm" data-course-access="${c.id}">Fréquentation</button>
            <button class="btn-danger btn-sm" data-delete-course="${c.id}">Supprimer</button>
          </div>
        </article>
      `).join('')
      : '<p class="muted">Aucun cours.</p>';

    bindAdminEvents();
    bindAvatarFallbacks(document);
    updateNav();
    if (typeof loadMailConfig === 'function') {
      await loadMailConfig();
    }
    if (typeof loadNewsletterSection === 'function') {
      await loadNewsletterSection();
    }

    if (errors.length) {
      const authError = errors.some((e) => /401|403|non autorisé|authentification/i.test(e));
      showAdminError(
        `Certaines données n'ont pas pu être chargées : ${errors.join(' · ')}`,
        authError
      );
    }
  } catch (err) {
    const authError = /401|403|non autorisé|authentification|token/i.test(err.message || '');
    showAdminError(
      err.message || 'Impossible de charger les données administrateur.',
      authError
    );
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

function courseChecklistHtml(coursesList, selectedIds = []) {
  if (!coursesList.length) {
    return '<p class="muted">Aucune formation du catalogue disponible. Créez d\'abord une formation via « Nouvelle formation ».</p>';
  }

  const bySubject = new Map();
  for (const course of coursesList) {
    const key = course.subject_label || course.subject || 'Autre';
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key).push(course);
  }

  return `
    <div class="course-checklist">
      ${[...bySubject.entries()].map(([subjectLabel, items]) => `
        <div class="course-checklist-group">
          <p class="course-checklist-group-title">${subjectLabel}</p>
          ${items
    .sort((a, b) => (a.exam_code || a.title).localeCompare(b.exam_code || b.title))
    .map((c) => `
            <label class="checkbox-row">
              <input type="checkbox" name="course_ids" value="${c.id}"${selectedIds.includes(c.id) ? ' checked' : ''}>
              <span class="checkbox-row-label">
                ${c.exam_code ? `<strong class="exam-badge exam-badge--inline">${c.exam_code}</strong> ` : ''}
                <span>${c.title}</span>
                <small class="muted"> · ${c.duration_days || 1} j</small>
                ${c.subsection_label ? `<small class="muted"> · ${c.subsection_label}</small>` : ''}
              </span>
            </label>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function bindAdminEvents() {
  const addUserBtn = document.getElementById('add-user-btn');
  const addUserBtnPanel = document.getElementById('add-user-btn-panel');
  if (addUserBtn) addUserBtn.onclick = openCreateUserModal;
  if (addUserBtnPanel) addUserBtnPanel.onclick = openCreateUserModal;

  document.querySelectorAll('[data-approve-learner]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const learnerId = parseInt(btn.dataset.approveLearner, 10);
      const learner = users.find((u) => u.id === learnerId)
        || pendingLearnerRequests.find((u) => u.id === learnerId);
      if (!learner) return;

      showModal(`Valider — ${learner.name}`, `
        <p class="muted">Sélectionnez les formations et choisissez les jours de session pour chaque cours (consécutifs ou répartis).</p>
        <div class="field">
          <label>Formations assignées</label>
          ${courseChecklistHtml(assignableCourses)}
        </div>
      `, async (fd, form) => {
        const courseIds = fd.getAll('course_ids').map((id) => parseInt(id, 10));
        if (!courseIds.length) throw new Error('Sélectionnez au moins une formation');
        const coursesById = coursesMapFromList(assignableCourses);
        validateSchedulesInForm(form, courseIds, coursesById);
        const schedules = collectSchedulesFromForm(form, courseIds);
        await API.request(`/api/admin/learner-requests/${learner.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ course_ids: courseIds, schedules }),
        });
      }, (form) => {
        bindCourseChecklistSchedules(form, coursesMapFromList(assignableCourses));
      });
    });
  });

  document.querySelectorAll('[data-reject-learner]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Refuser cette inscription ? Le compte sera supprimé.')) return;
      await API.request(`/api/admin/learner-requests/${btn.dataset.rejectLearner}/reject`, { method: 'POST' });
      loadAdmin();
    });
  });

  document.querySelectorAll('[data-approve-instructor]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const instructorId = parseInt(btn.dataset.approveInstructor, 10);
      const instructor = users.find((u) => u.id === instructorId)
        || pendingInstructorRequests.find((u) => u.id === instructorId);
      if (!instructor) return;

      showModal(`Valider formateur — ${instructor.name}`, `
        <p class="muted">Sélectionnez les formations et choisissez les jours de session pour chaque cours (consécutifs ou répartis).</p>
        <div class="field">
          <label>Formations à enseigner</label>
          ${courseChecklistHtml(assignableCourses)}
        </div>
      `, async (fd, form) => {
        const courseIds = fd.getAll('course_ids').map((id) => parseInt(id, 10));
        if (!courseIds.length) throw new Error('Sélectionnez au moins une formation');
        const coursesById = coursesMapFromList(assignableCourses);
        validateSchedulesInForm(form, courseIds, coursesById);
        const schedules = collectSchedulesFromForm(form, courseIds);
        await API.request(`/api/admin/instructor-requests/${instructor.id}/approve`, {
          method: 'POST',
          body: JSON.stringify({ course_ids: courseIds, schedules }),
        });
      }, (form) => {
        bindCourseChecklistSchedules(form, coursesMapFromList(assignableCourses));
      });
    });
  });

  document.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Refuser cette demande ? Le compte redeviendra apprenant.')) return;
      await API.request(`/api/admin/instructor-requests/${btn.dataset.reject}/reject`, { method: 'POST' });
      loadAdmin();
    });
  });

  document.getElementById('add-course-btn').onclick = async () => {
    const { subjects: subjectList } = await fetch('/api/subjects').then((r) => r.json());
    showModal('Nouvelle formation', `
      <div class="field"><label>Titre</label><input name="title" required></div>
      <div class="field"><label>Description</label><textarea name="description" rows="3"></textarea></div>
      <div class="field">
        <label>Durée (jours)</label>
        <input name="duration_days" type="number" min="1" max="60" value="1" required>
        <p class="muted field-hint">Nombre de jours de formation à planifier lors de l'assignation.</p>
      </div>
      <div class="field">
        <label>Sujet</label>
        <select name="subject" required>
          ${(subjectList || []).map((s) =>
    `<option value="${s.id}">${s.label}</option>`
  ).join('')}
        </select>
      </div>
      <div class="field">
        <label>Lien d'évaluation</label>
        <input name="evaluation_url" type="url" value="https://forms.cloud.microsoft/e/RFjBKzfwQQ">
        <p class="muted field-hint">Formulaire Microsoft Forms ouvert dans un nouvel onglet depuis la page de la formation.</p>
      </div>
    `, async (fd) => {
      await API.request('/api/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: fd.get('title'),
          description: fd.get('description'),
          subject: fd.get('subject'),
          duration_days: parseInt(fd.get('duration_days'), 10) || 1,
          evaluation_url: fd.get('evaluation_url') || undefined,
        }),
      });
    });
  };

  document.querySelectorAll('[data-assign-teaching]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const user = users.find((u) => u.id === parseInt(btn.dataset.assignTeaching, 10));
      if (!user) return;

      const { assignments } = await API.request(`/api/admin/users/${user.id}/instructor-assignments`);
      const assignedIds = assignments.map((a) => a.course_id);
      const availableCourses = assignableCourses.filter((c) => !assignedIds.includes(c.id));

      showModal(`Enseignement — ${user.name}`, `
        <p class="muted">Planifiez les jours de chaque formation (1 à la durée officielle — utile pour un remplacement partiel).</p>
        ${assignments.length ? `
          <div class="field">
            <label>Formations assignées</label>
            <ul class="enrollment-list">
              ${assignments.map((a) => teachingAssignmentItemHtml(user, a)).join('')}
            </ul>
          </div>
        ` : '<p class="muted">Aucune formation assignée pour le moment.</p>'}
        ${availableCourses.length ? `
        <div class="field">
          <label>Ajouter une formation</label>
          <select name="course_id">
            <option value="">— Choisir —</option>
            ${availableCourses.map((c) => `<option value="${c.id}">${c.title} (${c.duration_days || 1} j · ${c.subject_label || c.subject})</option>`).join('')}
          </select>
          <p class="muted field-hint">Après sélection, choisissez les jours de formation dans le calendrier ci-dessous.</p>
        </div>
        ` : ''}
      `, async (fd, form) => {
        const courseId = parseInt(fd.get('course_id'), 10);
        if (!courseId) return;
        const coursesById = coursesMapFromList(assignableCourses);
        validateSchedulesInForm(form, [courseId], coursesById);
        const sessionDates = collectScheduleFromForm(form, courseId);
        await API.request(`/api/admin/users/${user.id}/instructor-assignments`, {
          method: 'POST',
          body: JSON.stringify({ course_id: courseId, session_dates: sessionDates }),
        });
      }, (form) => {
        bindTeachingScheduleEditors(form, user, assignments);
        bindCourseSelectSchedule(form, 'course_id', coursesMapFromList(assignableCourses), {
          fetchScheduleContext: async (courseId) => {
            const data = await API.request(
              `/api/admin/courses/${courseId}/teaching-session-dates?exclude_user_id=${user.id}`
            );
            if (!data.replacement_mode) return {};
            return {
              allowedDates: data.dates.map((d) => d.date),
              replacementMode: true,
              replacementRequested: data.replacement_requested || [],
            };
          },
        });
      });

      document.querySelectorAll('[data-unassign]').forEach((unassignBtn) => {
        unassignBtn.addEventListener('click', async () => {
          if (!confirm('Retirer cette formation au formateur ?')) return;
          await API.request(
            `/api/admin/users/${unassignBtn.dataset.unassign}/instructor-assignments/${unassignBtn.dataset.course}`,
            { method: 'DELETE' }
          );
          modal.hidden = true;
          loadAdmin();
        });
      });
    });
  });

  document.querySelectorAll('[data-assign-courses]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const user = users.find((u) => u.id === parseInt(btn.dataset.assignCourses, 10));
      if (!user) return;

      const { enrollments } = await API.request(`/api/admin/users/${user.id}/enrollments`);

      showModal(`Formations — ${user.name}`, `
        <p class="muted">L'accès au contenu reste permanent après la fin de chaque session.</p>
        ${enrollments.length ? `
          <div class="field">
            <label>Formations suivies (accès permanent)</label>
            <ul class="enrollment-list">
              ${enrollments.map((e) => `
                <li class="enrollment-item">
                  <span>
                    ${e.title} <small class="muted">(${e.subject_label})</small><br>
                    <small class="muted">${formatSessionDatesLabel(e.session_dates)}</small>
                    ${(e.sessions || []).length
                      ? `<br><small class="muted">${e.sessions.length} session(s)</small>`
                      : ''}
                  </span>
                  <button type="button" class="btn-danger btn-xs" data-unenroll="${user.id}" data-course="${e.course_id}">Retirer l'accès</button>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : '<p class="muted">Aucune formation assignée pour le moment.</p>'}
        <div class="field">
          <label>Ajouter / planifier une session</label>
          ${assignableCourses.length
    ? `<select name="course_id">
                <option value="">— Choisir une formation —</option>
                ${assignableCourses.map((c) => `<option value="${c.id}">${c.title} (${c.duration_days || 1} j · ${c.subject_label || c.subject})</option>`).join('')}
              </select>
              <p class="muted field-hint">Vous pouvez ajouter une nouvelle session même si l'apprenant a déjà suivi ce cours.</p>`
    : '<p class="muted">Aucune formation disponible dans le catalogue.</p>'}
        </div>
        <div class="field">
          <label>Libellé de session (optionnel)</label>
          <input name="session_label" placeholder="Ex. Session juin 2026">
        </div>
      `, async (fd, form) => {
        const courseId = parseInt(fd.get('course_id'), 10);
        if (!courseId) throw new Error('Sélectionnez une formation');
        const coursesById = coursesMapFromList(assignableCourses);
        validateSchedulesInForm(form, [courseId], coursesById);
        const sessionDates = collectScheduleFromForm(form, courseId);
        await API.request(`/api/admin/users/${user.id}/enrollments`, {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            session_dates: sessionDates,
            session_label: fd.get('session_label') || undefined,
          }),
        });
      }, (form) => {
        bindCourseSelectSchedule(form, 'course_id', coursesMapFromList(assignableCourses));
      });

      document.querySelectorAll('[data-unenroll]').forEach((unenrollBtn) => {
        unenrollBtn.addEventListener('click', async () => {
          if (!confirm('Retirer l\'accès permanent à cette formation ?')) return;
          await API.request(
            `/api/admin/users/${unenrollBtn.dataset.unenroll}/enrollments/${unenrollBtn.dataset.course}`,
            { method: 'DELETE' }
          );
          modal.hidden = true;
          loadAdmin();
        });
      });
    });
  });

  document.querySelectorAll('[data-user-access]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = parseInt(btn.dataset.userAccess, 10);
      const stats = await API.request(`/api/admin/users/${userId}/access-stats`);
      showModal(`Fréquentation — ${stats.user?.name || 'Participant'}`, `
        <p class="muted">Consultations pendant la session et après (accès permanent).</p>
        <div class="stats-grid access-stats-summary">
          <article class="card stat-card"><strong>${stats.totals?.total_views || 0}</strong><span>Vues totales</span></article>
          <article class="card stat-card"><strong>${stats.totals?.views_during || 0}</strong><span>Pendant le cours</span></article>
          <article class="card stat-card"><strong>${stats.totals?.views_after || 0}</strong><span>Après le cours</span></article>
        </div>
        <div class="table-wrap" style="margin-top:1rem">
          <table class="data-table">
            <thead>
              <tr>
                <th>Formation</th>
                <th>Session</th>
                <th>Pendant</th>
                <th>Après</th>
                <th>Total</th>
                <th>Dernier accès</th>
              </tr>
            </thead>
            <tbody>
              ${(stats.courses || []).length
                ? stats.courses.map((c) => `
                  <tr>
                    <td>${c.title}</td>
                    <td class="muted">${c.session_start && c.session_end ? `${c.session_start} → ${c.session_end}` : '—'}</td>
                    <td>${c.views_during || 0}</td>
                    <td>${c.views_after || 0}</td>
                    <td>${c.total_views || 0}</td>
                    <td class="muted">${c.last_access_at ? String(c.last_access_at).slice(0, 16).replace('T', ' ') : '—'}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="6" class="muted">Aucune donnée d\'accès</td></tr>'}
            </tbody>
          </table>
        </div>
      `, null);
    });
  });

  document.querySelectorAll('[data-course-access]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = parseInt(btn.dataset.courseAccess, 10);
      const stats = await API.request(`/api/admin/courses/${courseId}/access-stats`);
      showModal(`Fréquentation — ${stats.course?.title || 'Formation'}`, `
        <div class="stats-grid access-stats-summary">
          <article class="card stat-card"><strong>${stats.totals?.participants || 0}</strong><span>Participants</span></article>
          <article class="card stat-card"><strong>${stats.totals?.views_during || 0}</strong><span>Pendant</span></article>
          <article class="card stat-card"><strong>${stats.totals?.views_after || 0}</strong><span>Après</span></article>
          <article class="card stat-card"><strong>${stats.totals?.total_views || 0}</strong><span>Total</span></article>
        </div>
        <div class="table-wrap" style="margin-top:1rem">
          <table class="data-table">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Pendant</th>
                <th>Après</th>
                <th>Matériels</th>
                <th>Dernier accès</th>
              </tr>
            </thead>
            <tbody>
              ${(stats.participants || []).length
                ? stats.participants.map((p) => `
                  <tr>
                    <td>${p.name}<br><small class="muted">${p.email}</small></td>
                    <td>${p.views_during || 0}</td>
                    <td>${p.views_after || 0}</td>
                    <td>${p.unique_materials || 0}</td>
                    <td class="muted">${p.last_access_at ? String(p.last_access_at).slice(0, 16).replace('T', ' ') : '—'}</td>
                  </tr>
                `).join('')
                : '<tr><td colspan="5" class="muted">Aucun participant</td></tr>'}
            </tbody>
          </table>
        </div>
      `, null);
    });
  });

  document.querySelectorAll('[data-manage-sessions]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const courseId = parseInt(btn.dataset.manageSessions, 10);
      const course = courses.find((c) => c.id === courseId);
      const { sessions } = await API.request(`/api/admin/courses/${courseId}/sessions`);
      const learners = users.filter((u) => u.role === 'learner' && u.approved);

      showModal(`Sessions — ${course?.title || 'Formation'}`, `
        <p class="muted">Chaque session peut avoir des participants différents. Le contenu reste accessible ensuite.</p>
        ${sessions.length ? `
          <ul class="enrollment-list">
            ${sessions.map((s) => `
              <li class="enrollment-item" style="flex-direction:column;align-items:stretch;gap:0.5rem">
                <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start">
                  <span>
                    <strong>${s.label}</strong><br>
                    <small class="muted">${formatSessionDatesLabel(s.session_dates)} · ${s.learner_count || 0} participant(s)</small>
                  </span>
                  <button type="button" class="btn-danger btn-xs" data-delete-session="${s.id}">Supprimer</button>
                </div>
                <div>
                  ${(s.participants || []).filter((p) => p.role === 'learner').map((p) => `
                    <span class="role-badge role-learner" style="margin:0.15rem 0.25rem 0.15rem 0;display:inline-flex;align-items:center;gap:0.35rem">
                      ${p.name}
                      <button type="button" class="btn-danger btn-xs" data-remove-participant="${s.id}" data-user="${p.user_id}" title="Retirer de la session">×</button>
                    </span>
                  `).join('') || '<span class="muted">Aucun participant</span>'}
                </div>
                <div class="field" style="margin:0">
                  <label>Ajouter un participant</label>
                  <div style="display:flex;gap:0.5rem;align-items:center">
                    <select data-add-participant-select="${s.id}">
                      <option value="">— Apprenant —</option>
                      ${learners.map((u) => `<option value="${u.id}">${u.name}</option>`).join('')}
                    </select>
                    <button type="button" class="btn-secondary btn-xs" data-add-participant="${s.id}">Ajouter</button>
                  </div>
                </div>
              </li>
            `).join('')}
          </ul>
        ` : '<p class="muted">Aucune session pour le moment.</p>'}
        <hr>
        <h4>Nouvelle session</h4>
        <div class="field">
          <label>Libellé</label>
          <input name="label" placeholder="Ex. Session septembre 2026">
        </div>
        ${schedulePickerHtml(courseId, course?.duration_days || 1, course?.title || 'Formation', [])}
      `, async (fd, form) => {
        const label = fd.get('label');
        const sessionDates = collectScheduleFromForm(form, courseId);
        if (!sessionDates.length) throw new Error('Sélectionnez les jours de la session');
        await API.request(`/api/admin/courses/${courseId}/sessions`, {
          method: 'POST',
          body: JSON.stringify({ label, session_dates: sessionDates }),
        });
      });

      document.querySelectorAll('[data-delete-session]').forEach((delBtn) => {
        delBtn.addEventListener('click', async () => {
          if (!confirm('Supprimer cette session ?')) return;
          await API.request(`/api/admin/sessions/${delBtn.dataset.deleteSession}`, { method: 'DELETE' });
          modal.hidden = true;
          loadAdmin();
        });
      });

      document.querySelectorAll('[data-add-participant]').forEach((addBtn) => {
        addBtn.addEventListener('click', async () => {
          const sessionId = addBtn.dataset.addParticipant;
          const select = document.querySelector(`[data-add-participant-select="${sessionId}"]`);
          const userId = parseInt(select?.value, 10);
          if (!userId) {
            alert('Choisissez un apprenant');
            return;
          }
          await API.request(`/api/admin/sessions/${sessionId}/participants`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
          });
          modal.hidden = true;
          loadAdmin();
        });
      });

      document.querySelectorAll('[data-remove-participant]').forEach((rmBtn) => {
        rmBtn.addEventListener('click', async () => {
          await API.request(
            `/api/admin/sessions/${rmBtn.dataset.removeParticipant}/participants/${rmBtn.dataset.user}`,
            { method: 'DELETE' }
          );
          modal.hidden = true;
          loadAdmin();
        });
      });
    });
  });

  document.querySelectorAll('[data-edit-user]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const user = users.find((u) => u.id === parseInt(btn.dataset.editUser, 10));
      if (!user) return;

      showModal(`Modifier — ${user.name}`, `
        <div class="field"><label>Nom</label><input name="name" required></div>
        <div class="field"><label>Email</label><input name="email" type="email" required></div>
        ${roleSelect('role', user.role, user.role === 'admin' && !adminCapabilities.can_assign_admin
    ? ['admin', ...adminCapabilities.assignable_roles.filter((r) => r !== 'admin')]
    : null)}
        ${companyFieldHtml(user.company || '', { required: user.role === 'learner' })}
        <div class="field"><label>Nouveau mot de passe (optionnel)</label><input name="password" type="password" minlength="6" autocomplete="new-password"></div>
      `, async (fd) => {
        const payload = {
          name: fd.get('name'),
          email: fd.get('email'),
          role: fd.get('role'),
          company: fd.get('company'),
        };
        if (fd.get('password')) payload.password = fd.get('password');
        await API.request(`/api/admin/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }, (form) => {
        bindCompanyRoleToggle(form, user.role);
      });

      const form = document.getElementById('modal-form');
      form.querySelector('[name="name"]').value = user.name;
      form.querySelector('[name="email"]').value = user.email;
      const companyInput = form.querySelector('[name="company"]');
      if (companyInput) companyInput.value = user.company || '';
    });
  });

  document.querySelectorAll('[data-delete-user]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const user = users.find((u) => u.id === parseInt(btn.dataset.deleteUser, 10));
      const label = user ? `${user.name} (${user.email})` : 'cet utilisateur';
      if (!confirm(`Supprimer définitivement ${label} ?`)) return;
      try {
        await API.request(`/api/admin/users/${btn.dataset.deleteUser}`, { method: 'DELETE' });
        loadAdmin();
      } catch (err) {
        showAdminError(err.message || 'Impossible de supprimer cet utilisateur.');
      }
    });
  });

  document.querySelectorAll('[data-delete-course]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(
        'Supprimer cette formation ?\n\n'
        + 'Les accès des apprenants à cette formation seront retirés.\n'
        + 'Les comptes apprenants ne seront pas supprimés.'
      )) return;
      try {
        const result = await API.request(`/api/admin/courses/${btn.dataset.deleteCourse}`, { method: 'DELETE' });
        if (result.message) alert(result.message);
        loadAdmin();
      } catch (err) {
        showAdminError(err.message || 'Impossible de supprimer cette formation.');
      }
    });
  });
}

initAdminNavigation();
document.addEventListener('lms:localechange', () => {
  showAdminPanel(getAdminPanelId(), { updateHash: false });
  if (typeof updateNav === 'function') updateNav();
});
loadAdmin();
