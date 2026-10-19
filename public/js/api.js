const API = {
  getToken() {
    return localStorage.getItem('lms_token');
  },

  setToken(token) {
    localStorage.setItem('lms_token', token);
  },

  clearToken() {
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
  },

  getUser() {
    const raw = localStorage.getItem('lms_user');
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  },

  setUser(user) {
    localStorage.setItem('lms_user', JSON.stringify(normalizeUser(user)));
  },

  async request(path, options = {}) {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(path, { ...options, headers });
    } catch {
      throw new Error('Login interrupted during upload. Retry or import fewer files at a time.');
    }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      let message = data.error || `Erreur ${res.status}`;
      if (res.status === 414) {
        message = 'Error 414 — request URL too long. Retry the import file by file, or reload the page then re-importez.';
      } else if (res.status === 413) {
        message = 'Error 413 — chunk too large for the proxy. Retry the import (large files are split automaticalt).';
      }
      if (res.status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
        this.clearToken();
        const onAuthPage = /login\.html|register\.html/i.test(window.location.pathname);
        if (!onAuthPage) {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login.html?next=${next}&reason=session`;
          throw new Error('Session expired — signing in again…');
        }
      }
      throw new Error(message);
    }

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  },

  async uploadMaterials(courseId, formData) {
    return this.request(`/api/courses/${courseId}/materials`, {
      method: 'POST',
      body: formData,
    });
  },

  async uploadMaterialsBatch(courseId, formData) {
    return this.request(`/api/courses/${courseId}/materials/batch`, {
      method: 'POST',
      body: formData,
    });
  },

  // Sous la limite Cloudflare (~100 Mo) — découpe transparente des gros fichiers
  CHUNK_UPLOAD_BYTES: 8 * 1024 * 1024,

  async uploadFileDirect(courseId, { type, sectionId, file }) {
    const fd = new FormData();
    // Ordre important pour multer : champs texte avant le fichier
    fd.append('type', type);
    if (sectionId) fd.append('section_id', sectionId);
    fd.append('title', file.name.replace(/\.[^.]+$/, '') || file.name);
    fd.append('file', file, file.name);

    return this.request(`/api/courses/${courseId}/materials`, {
      method: 'POST',
      body: fd,
      headers: { 'X-Material-Type': type },
    });
  },

  async uploadFileChunked(courseId, { type, sectionId, file, onChunkProgress }) {
    const chunkSize = this.CHUNK_UPLOAD_BYTES;
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
    const title = file.name.replace(/\.[^.]+$/, '') || file.name;

    const init = await this.request(`/api/courses/${courseId}/materials/upload-init`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        section_id: sectionId || null,
        title,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        total_chunks: totalChunks,
      }),
    });

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      const fd = new FormData();
      fd.append('upload_id', init.upload_id);
      fd.append('chunk_index', String(i));
      fd.append('chunk', blob, `part-${i}`);

      await this.request(`/api/courses/${courseId}/materials/upload-chunk`, {
        method: 'POST',
        body: fd,
      });

      if (onChunkProgress) onChunkProgress(i + 1, totalChunks);
    }

    return this.request(`/api/courses/${courseId}/materials/upload-complete`, {
      method: 'POST',
      body: JSON.stringify({ upload_id: init.upload_id }),
    });
  },

  async uploadMaterialsSequential(courseId, { type, sectionId, files, onProgress }) {
    const uploaded = [];
    const list = [...files].filter((file) => file && file.size > 0);
    const chunkThreshold = this.CHUNK_UPLOAD_BYTES;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (onProgress) onProgress(i + 1, list.length, file.name);

      const useChunks = file.size > chunkThreshold;
      const res = useChunks
        ? await this.uploadFileChunked(courseId, {
          type,
          sectionId,
          file,
          onChunkProgress: (chunk, totalChunks) => {
            if (!onProgress) return;
            onProgress(i + 1, list.length, `${file.name} (${chunk}/${totalChunks})`);
          },
        })
        : await this.uploadFileDirect(courseId, { type, sectionId, file });

      uploaded.push(res.material);
    }

    return { materials: uploaded, count: uploaded.length };
  },

  materialFileLink(courseId, materialId) {
    const token = this.getToken();
    return `/api/courses/${courseId}/materials/${materialId}/file?token=${encodeURIComponent(token || '')}`;
  },

  materialStreamLink(courseId, materialId) {
    const token = this.getToken();
    return `/api/courses/${courseId}/materials/${materialId}/stream?token=${encodeURIComponent(token || '')}`;
  },

  async materialStreamUrl(courseId, materialId) {
    const data = await this.request(
      `/api/courses/${courseId}/materials/${materialId}/stream-ticket`,
      { method: 'POST' }
    );
    return data.url;
  },

  async markMaterialViewed(courseId, materialId) {
    return this.request(`/api/courses/${courseId}/materials/${materialId}/viewed`, {
      method: 'POST',
    });
  },

  markVideoViewed(courseId, materialId) {
    return this.markMaterialViewed(courseId, materialId);
  },

  async register(payload) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  logout() {
    this.clearToken();
    window.location.href = '/login.html';
  },
};

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    approved: !!user.approved,
    is_instructor: !!user.is_instructor,
  };
}

function requireAuth() {
  if (!API.getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  const user = API.getUser();
  if (!user || user.role !== 'admin') {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

function getRoleLabels() {
  if (typeof t === 'function') {
    return {
      learner: t('role.learner'),
      instructor: t('role.instructor'),
      admin: t('role.admin'),
    };
  }
  return {
    learner: 'Learner',
    instructor: 'Instructor',
    admin: 'Administrator',
  };
}

const ROLE_LABELS = getRoleLabels();

function roleLabel(role) {
  return getRoleLabels()[role] || role;
}

function displayRoles(user) {
  if (!user) return '';
  const labels = getRoleLabels();
  const roles = [];
  if (user.role === 'admin') roles.push(labels.admin);
  if (user.role === 'learner' && !user.is_instructor) roles.push(labels.learner);
  if (user.role === 'instructor' || user.is_instructor) roles.push(labels.instructor);
  return roles.length ? roles.join(', ') : roleLabel(user.role);
}

function isActiveInstructor(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.is_instructor) return true;
  return user.role === 'instructor' && !!user.approved;
}

function isPendingInstructor(user) {
  if (!user) return false;
  if (user.role === 'admin') return false;
  if (user.is_instructor) return false;
  if (user.approved) return false;
  return user.role === 'instructor';
}

function isPendingLearner(user) {
  if (!user) return false;
  if (user.role !== 'learner') return false;
  if (user.is_instructor) return false;
  return !user.approved;
}

function isApprovedLearner(user) {
  if (!user) return false;
  if (user.role === 'admin' || isActiveInstructor(user)) return true;
  if (user.role !== 'learner') return false;
  return !!user.approved;
}

function getPendingBannerMessage(user) {
  if (!user || user.role === 'admin' || user.approved) return null;
  if (isPendingInstructor(user)) {
    return 'Your instructor account is pending approval. An administrator will approve your profile and assign your courses.';
  }
  if (isPendingLearner(user)) {
    return 'Votre compte est en attente de validation. Un administrateur validera votre inscription et vous assignera vos formations.';
  }
  return null;
}

function applyPendingBanners(user, root = document) {
  const message = getPendingBannerMessage(user);
  const banner = root.getElementById('pending-banner');
  const textEl = root.getElementById('pending-banner-text');

  if (!banner) return;
  banner.hidden = !message;
  if (textEl && message) textEl.textContent = message;
}

function bindLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    API.logout();
  });
}

function setNavLink(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

function updateNav() {
  const user = API.getUser();
  const loggedIn = !!(user && API.getToken());

  const navUser = document.getElementById('nav-user');
  const navLogin = document.getElementById('nav-login');
  const navRegister = document.getElementById('nav-register');
  const navDashboard = document.getElementById('nav-dashboard');
  const navCourses = document.getElementById('nav-courses');
  const navAdmin = document.getElementById('nav-admin');
  const logoutBtn = document.getElementById('logout-btn');
  const ctaRegister = document.getElementById('cta-register');
  const ctaCourses = document.getElementById('cta-courses');

  if (loggedIn) {
    if (navUser) {
      navUser.innerHTML = typeof userChipHtml === 'function'
        ? userChipHtml(user)
        : `${user.name} (${displayRoles(user)})`;
      if (typeof bindAvatarFallbacks === 'function') bindAvatarFallbacks(navUser);
    }
    if (logoutBtn) logoutBtn.hidden = false;
    setNavLink(navLogin, false);
    setNavLink(navRegister, false);
    setNavLink(navDashboard, true);
    setNavLink(navCourses, true);
    setNavLink(navAdmin, user.role === 'admin');
    if (ctaRegister) ctaRegister.style.display = 'none';
    if (ctaCourses) ctaCourses.style.display = '';
    bindLogout();
  } else {
    if (navUser) navUser.innerHTML = '';
    if (logoutBtn) logoutBtn.hidden = true;
    setNavLink(navLogin, true);
    setNavLink(navRegister, true);
    setNavLink(navDashboard, false);
    setNavLink(navCourses, true);
    setNavLink(navAdmin, false);
    if (ctaRegister) ctaRegister.style.display = '';
    if (ctaCourses) ctaCourses.style.display = 'none';
  }
}

function ensureMobileMenuButton() {
  if (document.getElementById('mobile-menu-btn')) return document.getElementById('mobile-menu-btn');
  const container = document.querySelector('.header > .container');
  if (!container) return null;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'mobile-menu-btn';
  btn.className = 'mobile-menu-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'app-sidebar');
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<span class="mobile-menu-btn-bars" aria-hidden="true"></span>';

  const logo = container.querySelector('.logo, .brand-logo');
  if (logo) container.insertBefore(btn, logo);
  else container.prepend(btn);

  btn.addEventListener('click', () => {
    if (document.getElementById('app-sidebar')) {
      if (typeof toggleMobileSidebar === 'function') toggleMobileSidebar();
      else document.body.classList.toggle('sidebar-open');
      btn.setAttribute('aria-expanded', document.body.classList.contains('sidebar-open') ? 'true' : 'false');
      return;
    }
    document.body.classList.toggle('header-nav-open');
    btn.setAttribute('aria-expanded', document.body.classList.contains('header-nav-open') ? 'true' : 'false');
  });

  return btn;
}

function initMobileNavigation() {
  ensureMobileMenuButton();

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.body.classList.remove('header-nav-open');
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    else document.body.classList.remove('sidebar-open');
    const btn = document.getElementById('mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 961px)').matches) {
      document.body.classList.remove('header-nav-open', 'sidebar-open');
      const btn = document.getElementById('mobile-menu-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function initNav() {
  const boot = () => {
    updateNav();
    initMobileNavigation();
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

initNav();
