const DEFAULT_TZ = 'Europe/Zurich';

const CLOCK_TIMEZONES = [
  { value: 'Europe/Zurich', label: 'Berne' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/London', label: 'Londres' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'America/Montreal', label: 'Montreal' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapour' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
];

let activeTimezone = DEFAULT_TZ;
let timeFmt;
let dateFmt;
let monthFmt;

let sidebarCourses = [];
let sidebarLibrary = [];
let sidebarView = new Date();
let sidebarSelectedDay = null;
let clockTimer = null;

function clockTzStorageKey() {
  const userId = typeof API !== 'undefined' ? API.getUser()?.id : null;
  return userId ? `lms_clock_tz_${userId}` : 'lms_clock_tz';
}

function loadClockTimezone() {
  try {
    const saved = localStorage.getItem(clockTzStorageKey());
    if (saved && CLOCK_TIMEZONES.some((tz) => tz.value === saved)) {
      return saved;
    }
  } catch (_) {}
  return DEFAULT_TZ;
}

function saveClockTimezone(timezone) {
  try {
    localStorage.setItem(clockTzStorageKey(), timezone);
  } catch (_) {}
}

function initFormatters(timezone = activeTimezone) {
  activeTimezone = timezone;
  const opts = { timeZone: timezone };
  const intlLocale = typeof I18n !== 'undefined' ? I18n.getIntlLocale() : 'fr-CH';
  timeFmt = new Intl.DateTimeFormat(intlLocale, {
    ...opts,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  dateFmt = new Intl.DateTimeFormat(intlLocale, {
    ...opts,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  monthFmt = new Intl.DateTimeFormat(intlLocale, {
    ...opts,
    month: 'long',
    year: 'numeric',
  });
}

function localYmd(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: activeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shouldShowSidebar() {
  if (typeof API === 'undefined' || !API.getToken()) return false;
  if (document.body.classList.contains('auth-layout') || document.body.classList.contains('no-sidebar')) {
    return false;
  }
  return true;
}

function coursesOnDay(ymd) {
  return sidebarCourses.filter((c) => c.event_date === ymd);
}

function coursesInMonth(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return sidebarCourses.filter((c) => c.event_date?.startsWith(prefix));
}

function getTimezoneLabel(value) {
  return CLOCK_TIMEZONES.find((tz) => tz.value === value)?.label || value;
}

function buildTimezoneMenuItems() {
  return CLOCK_TIMEZONES.map((tz) => {
    const selected = tz.value === activeTimezone ? ' is-selected' : '';
    const ariaSelected = tz.value === activeTimezone ? ' aria-selected="true"' : ' aria-selected="false"';
    return `<li class="sidebar-clock-tz-option${selected}" role="option" data-value="${tz.value}"${ariaSelected} tabindex="-1">${tz.label}</li>`;
  }).join('');
}

function updateTimezonePickerUI() {
  const trigger = document.getElementById('sidebar-clock-tz-trigger');
  const menu = document.getElementById('sidebar-clock-tz-menu');
  if (trigger) trigger.textContent = getTimezoneLabel(activeTimezone);
  if (!menu) return;
  menu.querySelectorAll('.sidebar-clock-tz-option').forEach((item) => {
    const selected = item.dataset.value === activeTimezone;
    item.classList.toggle('is-selected', selected);
    item.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

function closeTimezoneMenu() {
  const menu = document.getElementById('sidebar-clock-tz-menu');
  const trigger = document.getElementById('sidebar-clock-tz-trigger');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

function openTimezoneMenu() {
  const menu = document.getElementById('sidebar-clock-tz-menu');
  const trigger = document.getElementById('sidebar-clock-tz-trigger');
  if (!menu) return;
  menu.hidden = false;
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  const selected = menu.querySelector('.sidebar-clock-tz-option.is-selected');
  selected?.focus();
}

function renderClock() {
  const now = new Date();
  const timeEl = document.getElementById('sidebar-clock-time');
  const dateEl = document.getElementById('sidebar-clock-date');
  if (!timeEl) return;
  timeEl.textContent = timeFmt.format(now);
  if (dateEl) dateEl.textContent = dateFmt.format(now);
  updateTimezonePickerUI();
}

function setClockTimezone(timezone) {
  if (!CLOCK_TIMEZONES.some((tz) => tz.value === timezone)) return;
  initFormatters(timezone);
  saveClockTimezone(timezone);
  renderClock();
  renderCalendarGrid();
}

function bindClockTimezonePicker() {
  const trigger = document.getElementById('sidebar-clock-tz-trigger');
  const menu = document.getElementById('sidebar-clock-tz-menu');
  if (!trigger || !menu || trigger.dataset.bound) return;
  trigger.dataset.bound = '1';

  updateTimezonePickerUI();

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (menu.hidden) openTimezoneMenu();
    else closeTimezoneMenu();
  });

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTimezoneMenu();
    }
    if (e.key === 'Escape') closeTimezoneMenu();
  });

  menu.addEventListener('click', (e) => {
    const option = e.target.closest('.sidebar-clock-tz-option');
    if (!option) return;
    setClockTimezone(option.dataset.value);
    closeTimezoneMenu();
    trigger.focus();
  });

  menu.addEventListener('keydown', (e) => {
    const options = [...menu.querySelectorAll('.sidebar-clock-tz-option')];
    const current = document.activeElement;
    const index = options.indexOf(current);

    if (e.key === 'Escape') {
      closeTimezoneMenu();
      trigger.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = options[Math.min(index + 1, options.length - 1)] || options[0];
      next.focus();
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = options[Math.max(index - 1, 0)] || options[options.length - 1];
      prev.focus();
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (current?.classList.contains('sidebar-clock-tz-option')) {
        setClockTimezone(current.dataset.value);
        closeTimezoneMenu();
        trigger.focus();
      }
    }
  });

  document.addEventListener('click', closeTimezoneMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTimezoneMenu();
  });
}

function startClock() {
  renderClock();
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(renderClock, 1000);
}

function renderCalendarGrid() {
  const grid = document.getElementById('sidebar-calendar-grid');
  const title = document.getElementById('sidebar-calendar-title');
  if (!grid || !title) return;

  const viewYmd = localYmd(sidebarView);
  const [vy, vm] = viewYmd.split('-').map(Number);
  const monthIndex = vm - 1;

  title.textContent = monthFmt.format(new Date(vy, monthIndex, 1));

  const firstDay = new Date(vy, monthIndex, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(vy, monthIndex + 1, 0).getDate();

  const monthCourses = coursesInMonth(vy, monthIndex);
  const datesWithCourses = new Set(monthCourses.map((c) => c.event_date));

  const weekdays = (typeof t === 'function' ? t('sidebar.weekdays') : 'L,M,M,J,V,S,D').split(',');
  let html = weekdays.map((d) => `<span class="cal-weekday">${d}</span>`).join('');

  for (let i = 0; i < startWeekday; i++) {
    html += '<span class="cal-day cal-day--empty"></span>';
  }

  const todayYmd = localYmd(new Date());

  for (let day = 1; day <= daysInMonth; day++) {
    const ymd = `${vy}-${String(vm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const classes = ['cal-day'];
    if (ymd === todayYmd) classes.push('cal-day--today');
    if (datesWithCourses.has(ymd)) classes.push('cal-day--has-course');
    if (sidebarSelectedDay === ymd) classes.push('cal-day--selected');
    html += `<button type="button" class="${classes.join(' ')}" data-date="${ymd}">${day}</button>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.cal-day[data-date]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const date = btn.dataset.date;
      sidebarSelectedDay = sidebarSelectedDay === date ? null : date;
      renderCalendarGrid();
      renderCourseList();
    });
  });
}

function relationLabel(relation) {
  if (relation === 'teaching') return typeof t === 'function' ? t('sidebar.teacher') : 'Instructor';
  return typeof t === 'function' ? t('sidebar.enrolled') : 'Inscrit';
}

function renderCourseList() {
  const list = document.getElementById('sidebar-course-list');
  const heading = document.getElementById('sidebar-course-heading');
  if (!list || !heading) return;

  const library = Array.isArray(sidebarLibrary) ? sidebarLibrary : [];

  let items = sidebarCourses;
  let mode = 'month';
  if (sidebarSelectedDay) {
    items = coursesOnDay(sidebarSelectedDay);
    const [y, m, d] = sidebarSelectedDay.split('-');
    heading.textContent = typeof t === 'function'
      ? t('sidebar.coursesOnDay', { date: `${d}.${m}.${y}` })
      : `Courses du ${d}.${m}.${y}`;
    mode = 'day';
  } else {
    const viewYmd = localYmd(sidebarView);
    const [vy, vm] = viewYmd.split('-').map(Number);
    items = coursesInMonth(vy, vm - 1);
    heading.textContent = items.length
      ? (typeof t === 'function' ? t('sidebar.myTrainingsMonth') : 'Mes formations ce mois')
      : (typeof t === 'function' ? t('sidebar.myTrainings') : 'Mes formations');
  }

  const statusLabel = (status) => {
    if (typeof t === 'function') {
      if (status === 'completed') return t('sidebar.status.completed');
      if (status === 'active') return t('sidebar.status.active');
      if (status === 'upcoming') return t('sidebar.status.upcoming');
      if (status === 'teaching') return t('sidebar.status.teaching');
      return t('sidebar.status.permanent');
    }
    if (status === 'completed') return 'Ended — access retained';
    if (status === 'active') return 'En cours';
    if (status === 'upcoming') return 'Upcoming';
    if (status === 'teaching') return 'Instructor';
    return 'Permanent access';
  };

  const libraryHtml = library.length
    ? `
      <div class="sidebar-library">
        <p class="sidebar-library-title">${typeof t === 'function' ? t('sidebar.permanentAccess') : 'Permanent access'}</p>
        ${library.map((course) => `
          <a href="${course.url}" class="sidebar-course-item sidebar-course-item--library">
            <span class="sidebar-course-title">${course.title}</span>
            <span class="sidebar-course-meta">${course.subject_label} · ${statusLabel(course.status)}</span>
          </a>
        `).join('')}
      </div>
    `
    : '';

  if (!sidebarCourses.length && !library.length) {
    list.innerHTML = `<p class="sidebar-empty">${typeof t === 'function' ? t('sidebar.empty') : 'No courses assigned yet.'}</p>`;
    return;
  }

  if (!items.length) {
    list.innerHTML = `
      <p class="sidebar-empty">${mode === 'day'
        ? (typeof t === 'function' ? t('sidebar.noCourseDay') : 'No courses on this date.')
        : (typeof t === 'function' ? t('sidebar.noCourseMonth') : 'No sessions scheduled this month.')}</p>
      ${libraryHtml}
    `;
    return;
  }

  list.innerHTML = items.map((course) => {
    const badge = `<span class="sidebar-course-badge sidebar-course-badge--${course.relation}">${relationLabel(course.relation)}</span>`;
    if (course.accessible) {
      return `
        <a href="${course.url}" class="sidebar-course-item">
          <span class="sidebar-course-title">${course.title}</span>
          <span class="sidebar-course-meta">${course.subject_label} · ${badge}</span>
        </a>
      `;
    }
    return `
      <span class="sidebar-course-item sidebar-course-item--locked" title="${typeof t === 'function' ? t('sidebar.enrollmentRequired') : 'Register requise'}">
        <span class="sidebar-course-title">${course.title}</span>
        <span class="sidebar-course-meta">${course.subject_label} · ${typeof t === 'function' ? t('sidebar.notEnrolled') : 'Non inscrit'}</span>
      </span>
    `;
  }).join('') + (mode === 'month' || mode === 'day' ? libraryHtml : '');
}

function shiftCalendarMonth(delta) {
  const viewYmd = localYmd(sidebarView);
  const [y, m] = viewYmd.split('-').map(Number);
  sidebarView = new Date(y, m - 1 + delta, 1);
  sidebarSelectedDay = null;
  renderCalendarGrid();
  renderCourseList();
}

function buildSidebarNavIcon(type) {
  const icons = {
    dashboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    courses:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    exams:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  };
  return icons[type] || '';
}

function highlightSidebarNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-nav-btn[data-nav]').forEach((link) => {
    const nav = link.dataset.nav;
    const active =
      (nav === 'dashboard' && (path === '/dashboard.html' || path === '/')) ||
      (nav === 'courses' && path === '/courses.html');
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function buildSidebarHtml() {
  const tr = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);
  const user = typeof API !== 'undefined' ? API.getUser() : null;
  const isAdmin = user?.role === 'admin';
  const accountLinks = `
      <a href="/profile.html" class="sidebar-nav-link">${tr('nav.profile', 'Mon profil')}</a>
      ${isAdmin ? `<a href="/admin.html" class="sidebar-nav-link">${tr('nav.admin', 'Administration')}</a>` : ''}
      <button type="button" class="sidebar-nav-link sidebar-nav-link--button" id="sidebar-logout-btn">${tr('nav.logout', 'Log out')}</button>
  `;
  return `
    <div class="sidebar-top">
      <div class="sidebar-clock" aria-live="polite">
        <div class="sidebar-clock-avatar-wrap" id="sidebar-clock-avatar-wrap">
          <img id="sidebar-clock-avatar" class="sidebar-clock-avatar" src="/avatars/generic-0.svg" alt="">
        </div>
        <div class="sidebar-clock-body">
          <div class="sidebar-clock-main">
            <span id="sidebar-clock-time" class="sidebar-clock-time">00:00:00</span>
          </div>
          <span id="sidebar-clock-date" class="sidebar-clock-date"></span>
          <div class="sidebar-clock-tz-picker">
            <span class="sidebar-clock-tz-label" id="sidebar-clock-tz-label">${tr('sidebar.timezone', 'Fuseau')}</span>
            <div class="sidebar-clock-tz-dropdown">
              <button
                type="button"
                id="sidebar-clock-tz-trigger"
                class="sidebar-clock-tz-trigger"
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-labelledby="sidebar-clock-tz-label sidebar-clock-tz-trigger"
                aria-controls="sidebar-clock-tz-menu"
                title="${tr('sidebar.timezoneTitle', 'Choisir le fuseau horaire')}"
              >${getTimezoneLabel(activeTimezone)}</button>
              <ul id="sidebar-clock-tz-menu" class="sidebar-clock-tz-menu" role="listbox" hidden>
                ${buildTimezoneMenuItems()}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar-weather" id="sidebar-weather" aria-label="${tr('sidebar.weather', 'Local weather')}"></div>
    </div>

    <div class="sidebar-panel">
    <nav class="sidebar-nav">
      <a href="/dashboard.html" class="sidebar-nav-link">${tr('sidebar.dashboard', 'Dashboard')}</a>
      <a href="/courses.html" class="sidebar-nav-link">${tr('sidebar.catalog', 'Course catalog')}</a>
      <a href="https://also-examsim.eureka-training.online/" class="sidebar-nav-link">${tr('sidebar.examSim', 'Exam simulation')}</a>
      <a href="https://also.eureka-training.online/feedback" class="sidebar-nav-link" target="_blank" rel="noopener noreferrer">${tr('sidebar.feedback', 'Feedback')}</a>
      ${accountLinks}
    </nav>

    <section class="sidebar-calendar-section" aria-label="${tr('sidebar.calendar', 'Calendrier des formations')}">
      <div class="sidebar-calendar-header">
        <button type="button" class="sidebar-cal-nav" id="sidebar-cal-prev" aria-label="${tr('sidebar.prevMonth', 'Previous month')}">‹</button>
        <h3 id="sidebar-calendar-title" class="sidebar-calendar-title"></h3>
        <button type="button" class="sidebar-cal-nav" id="sidebar-cal-next" aria-label="${tr('sidebar.nextMonth', 'Mois suivant')}">›</button>
      </div>
      <div id="sidebar-calendar-grid" class="sidebar-calendar-grid"></div>
    </section>

    <section class="sidebar-courses-section">
      <h3 id="sidebar-course-heading" class="sidebar-section-title">${tr('sidebar.myTrainings', 'Mes formations')}</h3>
      <div id="sidebar-course-list" class="sidebar-course-list"></div>
    </section>
    </div>
  `;
}

function renderSidebarAvatar() {
  const wrap = document.getElementById('sidebar-clock-avatar-wrap');
  const img = document.getElementById('sidebar-clock-avatar');
  if (!img || typeof API === 'undefined') return;
  const user = API.getUser();
  if (!user) return;

  const url = user.avatar_url || '/avatars/generic-0.svg';
  const fallback = user.gravatar_fallback || url;
  img.src = url;
  img.dataset.fallback = fallback;
  img.alt = user.name ? `Avatar de ${user.name}` : 'Your avatar';
  img.onerror = () => {
    if (img.dataset.fallback && img.src !== img.dataset.fallback) {
      img.src = img.dataset.fallback;
    }
  };

  if (wrap && user.id) {
    wrap.classList.add('profile-hover-trigger');
    wrap.dataset.profileUser = String(user.id);
    wrap.tabIndex = 0;
  }
}

function closeMobileSidebar() {
  document.body.classList.remove('sidebar-open');
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openMobileSidebar() {
  document.body.classList.remove('header-nav-open');
  document.body.classList.add('sidebar-open');
  const btn = document.getElementById('mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function toggleMobileSidebar() {
  if (document.body.classList.contains('sidebar-open')) closeMobileSidebar();
  else openMobileSidebar();
}

function ensureSidebarBackdrop() {
  let backdrop = document.getElementById('sidebar-backdrop');
  if (backdrop) return backdrop;
  backdrop = document.createElement('div');
  backdrop.id = 'sidebar-backdrop';
  backdrop.className = 'sidebar-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.addEventListener('click', closeMobileSidebar);
  document.body.appendChild(backdrop);
  return backdrop;
}

function bindMobileSidebarControls() {
  ensureSidebarBackdrop();
  if (typeof ensureMobileMenuButton === 'function') {
    ensureMobileMenuButton();
  }

  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = '1';
    logoutBtn.addEventListener('click', () => {
      if (typeof API !== 'undefined') API.logout();
    });
  }

  const aside = document.getElementById('app-sidebar');
  if (!aside || aside.dataset.mobileNavBound === '1') return;
  aside.dataset.mobileNavBound = '1';
  aside.addEventListener('click', (e) => {
    const link = e.target.closest('a.sidebar-nav-link');
    if (!link) return;
    if (window.matchMedia('(max-width: 960px)').matches) closeMobileSidebar();
  });
}

function mountSidebar() {
  const main = document.querySelector('main');
  if (!main || document.getElementById('app-sidebar')) return;

  initFormatters(loadClockTimezone());

  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const aside = document.createElement('aside');
  aside.id = 'app-sidebar';
  aside.className = 'app-sidebar';
  aside.setAttribute('aria-label', 'Side menu');
  aside.innerHTML = buildSidebarHtml();

  const mainWrap = document.createElement('div');
  mainWrap.className = 'app-main';

  main.parentNode.insertBefore(shell, main);
  shell.appendChild(aside);
  shell.appendChild(mainWrap);
  mainWrap.appendChild(main);

  document.getElementById('sidebar-cal-prev')?.addEventListener('click', () => shiftCalendarMonth(-1));
  document.getElementById('sidebar-cal-next')?.addEventListener('click', () => shiftCalendarMonth(1));

  bindClockTimezonePicker();
  renderSidebarAvatar();
  startClock();
  // Show the calendrier immédiatement (même sans dates / avant l'API)
  renderCalendarGrid();
  renderCourseList();
  if (typeof initSidebarWeather === 'function') initSidebarWeather();
  document.body.classList.add('has-app-shell');
  bindMobileSidebarControls();
}

async function loadSidebarData() {
  const list = document.getElementById('sidebar-course-list');
  try {
    const data = await API.request('/api/calendar');
    sidebarCourses = Array.isArray(data?.courses) ? data.courses : [];
    sidebarLibrary = Array.isArray(data?.library) ? data.library : [];
    sidebarView = new Date();
    sidebarSelectedDay = null;
    renderCalendarGrid();
    renderCourseList();
  } catch (err) {
    console.warn('[sidebar] calendrier:', err?.message || err);
    sidebarCourses = [];
    sidebarLibrary = [];
    // Toujours afficher le calendrier du mois, même sans sessions planifiées
    try {
      renderCalendarGrid();
      renderCourseList();
    } catch (renderErr) {
      console.warn('[sidebar] rendu:', renderErr?.message || renderErr);
      if (list) {
        list.innerHTML = '<p class="sidebar-empty">No courses scheduled yet.</p>';
      }
    }
  }
}

function remountSidebarContent() {
  const aside = document.getElementById('app-sidebar');
  if (!aside) return;
  initFormatters(activeTimezone);
  aside.innerHTML = buildSidebarHtml();
  document.getElementById('sidebar-cal-prev')?.addEventListener('click', () => shiftCalendarMonth(-1));
  document.getElementById('sidebar-cal-next')?.addEventListener('click', () => shiftCalendarMonth(1));
  const trigger = document.getElementById('sidebar-clock-tz-trigger');
  if (trigger) delete trigger.dataset.bound;
  bindClockTimezonePicker();
  renderSidebarAvatar();
  startClock();
  renderCalendarGrid();
  renderCourseList();
  if (typeof initSidebarWeather === 'function') initSidebarWeather();
  bindMobileSidebarControls();
}

async function initSidebar() {
  if (!shouldShowSidebar()) return;
  mountSidebar();
  await loadSidebarData();
}

function initSidebarWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
}

document.addEventListener('lms:localechange', () => {
  remountSidebarContent();
  if (typeof updateNav === 'function') updateNav();
});

initSidebarWhenReady();

window.refreshSidebar = loadSidebarData;
