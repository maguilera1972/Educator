const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function localYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatMonthTitle(date) {
  return date.toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' });
}

function formatDatesList(dates) {
  if (!dates.length) return '';
  return dates.map((d) => {
    const dt = parseYmd(d);
    return dt.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' });
  }).join(' · ');
}

function schedulePickerHtml(courseId, durationDays, title = '', initialDates = [], options = {}) {
  const {
    allowedDates = null,
    replacementMode = false,
    replacementRequested = [],
  } = options;
  const allowedList = Array.isArray(allowedDates) ? allowedDates.filter(Boolean) : [];
  const maxSelectable = allowedList.length ? allowedList.length : durationDays;
  const initialValue = (initialDates || []).join(',');
  const allowedAttr = allowedList.length ? ` data-allowed-dates="${allowedList.join(',')}"` : '';
  const replacementAttr = replacementMode ? ' data-replacement-mode="1"' : '';
  const requestedAttr = replacementRequested.length
    ? ` data-replacement-requested="${replacementRequested.map((d) => d.date || d).join(',')}"`
    : '';

  let hintExtra = `(1 à ${durationDays}, planification partielle possible)`;
  if (replacementMode && allowedList.length) {
    hintExtra = `(remplacement : choisissez 1 à ${allowedList.length} jour(s) parmi la planification existante)`;
  }

  return `
    <div class="schedule-picker${replacementMode ? ' schedule-picker--replacement' : ''}" data-schedule-picker data-course-id="${courseId}" data-duration="${maxSelectable}"${allowedAttr}${replacementAttr}${requestedAttr}>
      ${title ? `<p class="schedule-picker-title">${title}</p>` : ''}
      ${replacementMode && replacementRequested.length ? `
        <p class="schedule-picker-replacement-notice muted">
          Jours signalés pour remplacement : ${formatDatesList(replacementRequested.map((d) => d.date || d))}
        </p>
      ` : ''}
      <p class="schedule-picker-hint muted">
        Durée officielle : <strong>${durationDays}</strong> jour(s) —
        <span class="schedule-picker-count" data-count-for="${courseId}">0 / ${maxSelectable}</span> sélectionné(s)
        <span class="schedule-picker-partial-hint">${hintExtra}</span>
      </p>
      <div class="schedule-picker-nav">
        <button type="button" class="schedule-picker-nav-btn" data-schedule-prev aria-label="Mois précédent">‹</button>
        <span class="schedule-picker-month" data-schedule-month></span>
        <button type="button" class="schedule-picker-nav-btn" data-schedule-next aria-label="Mois suivant">›</button>
      </div>
      <div class="schedule-picker-grid" data-schedule-grid></div>
      <p class="schedule-picker-selected muted" data-schedule-summary></p>
      <input type="hidden" name="session_dates_${courseId}" data-session-dates-input value="${initialValue}">
    </div>
  `;
}

function mountSchedulePicker(root) {
  if (!root || root.dataset.bound) return;
  root.dataset.bound = '1';

  const courseId = parseInt(root.dataset.courseId, 10);
  const duration = Math.max(1, parseInt(root.dataset.duration, 10) || 1);
  const allowedDates = (root.dataset.allowedDates || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  const allowed = allowedDates.length ? new Set(allowedDates) : null;
  const replacementRequested = new Set(
    (root.dataset.replacementRequested || '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
  );
  const isReplacement = root.dataset.replacementMode === '1';

  const monthEl = root.querySelector('[data-schedule-month]');
  const gridEl = root.querySelector('[data-schedule-grid]');
  const countEl = root.querySelector(`[data-count-for="${courseId}"]`) || root.querySelector('.schedule-picker-count');
  const summaryEl = root.querySelector('[data-schedule-summary]');
  const hiddenInput = root.querySelector('[data-session-dates-input]');
  const todayYmd = localYmd(new Date());

  let view = new Date();
  view.setDate(1);
  const initialDates = (hiddenInput?.value || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);
  if (initialDates.length) {
    view = parseYmd(initialDates[0]);
    view.setDate(1);
  } else if (allowedDates.length) {
    view = parseYmd(allowedDates[0]);
    view.setDate(1);
  }
  const selected = new Set(initialDates);

  function syncHidden() {
    const dates = [...selected].sort();
    if (hiddenInput) hiddenInput.value = dates.join(',');
    if (countEl) {
      countEl.textContent = `${dates.length} / ${duration}`;
      countEl.classList.toggle('is-complete', dates.length === duration);
      countEl.classList.toggle('is-partial', dates.length > 0 && dates.length < duration);
      countEl.classList.toggle('is-invalid', dates.length > duration);
    }
    if (summaryEl) {
      summaryEl.textContent = dates.length
        ? `Jours choisis : ${formatDatesList(dates)}`
        : isReplacement
          ? 'Sélectionnez un ou plusieurs jours parmi la planification existante (orange = remplacement demandé).'
          : 'Cliquez sur les jours du calendrier (consécutifs ou répartis).';
    }
    root.classList.toggle('is-complete', dates.length === duration);
    root.classList.toggle('is-partial', dates.length > 0 && dates.length < duration);
  }

  function renderGrid() {
    const year = view.getFullYear();
    const month = view.getMonth();
    monthEl.textContent = formatMonthTitle(view);

    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = WEEKDAYS.map((d) => `<span class="schedule-picker-weekday">${d}</span>`).join('');

    for (let i = 0; i < startWeekday; i++) {
      html += '<span class="schedule-picker-day schedule-picker-day--empty"></span>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const classes = ['schedule-picker-day'];
      if (ymd === todayYmd) classes.push('schedule-picker-day--today');
      if (selected.has(ymd)) classes.push('schedule-picker-day--selected');
      if (allowed && !allowed.has(ymd)) classes.push('schedule-picker-day--disabled');
      if (replacementRequested.has(ymd)) classes.push('schedule-picker-day--replacement');
      html += `<button type="button" class="${classes.join(' ')}" data-date="${ymd}"${allowed && !allowed.has(ymd) ? ' disabled' : ''}>${day}</button>`;
    }

    gridEl.innerHTML = html;

    gridEl.querySelectorAll('.schedule-picker-day[data-date]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        if (allowed && !allowed.has(date)) return;
        if (selected.has(date)) {
          selected.delete(date);
        } else if (selected.size < duration) {
          selected.add(date);
        } else {
          selected.delete([...selected].sort().pop());
          selected.add(date);
        }
        renderGrid();
        syncHidden();
      });
    });
  }

  root.querySelector('[data-schedule-prev]')?.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
    renderGrid();
  });

  root.querySelector('[data-schedule-next]')?.addEventListener('click', () => {
    view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    renderGrid();
  });

  renderGrid();
  syncHidden();
}

function bindSchedulePickers(container = document) {
  container.querySelectorAll('[data-schedule-picker]').forEach(mountSchedulePicker);
}

function bindCourseChecklistSchedules(form, coursesById) {
  const checkboxes = form.querySelectorAll('input[name="course_ids"]');
  checkboxes.forEach((checkbox) => {
    const courseId = parseInt(checkbox.value, 10);
    const course = coursesById.get(courseId);
    if (!course) return;

    let panel = form.querySelector(`[data-schedule-panel="${courseId}"]`);
    if (!panel) {
      const wrapper = checkbox.closest('.checkbox-row') || checkbox.parentElement;
      panel = document.createElement('div');
      panel.className = 'schedule-picker-panel';
      panel.dataset.schedulePanel = String(courseId);
      panel.hidden = true;
      panel.innerHTML = schedulePickerHtml(courseId, course.duration_days || 1, course.title);
      wrapper.insertAdjacentElement('afterend', panel);
    }

    const toggle = () => {
      panel.hidden = !checkbox.checked;
      if (checkbox.checked) bindSchedulePickers(panel);
    };

    checkbox.addEventListener('change', toggle);
    toggle();
  });
}

function bindCourseSelectSchedule(form, selectName, coursesById, options = {}) {
  const select = form.querySelector(`[name="${selectName}"]`);
  if (!select) return;

  let panel = form.querySelector('[data-schedule-select-panel]');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'schedule-picker-panel';
    panel.dataset.scheduleSelectPanel = '1';
    panel.hidden = true;
    select.closest('.field')?.insertAdjacentElement('afterend', panel);
  }

  const renderForCourse = async () => {
    const courseId = parseInt(select.value, 10);
    if (!courseId) {
      panel.hidden = true;
      panel.innerHTML = '';
      panel.dataset.allowedDates = '';
      return;
    }
    const course = coursesById.get(courseId);
    if (!course) return;

    panel.hidden = false;
    panel.innerHTML = '<p class="muted">Chargement du calendrier…</p>';

    let pickerOptions = {};
    if (typeof options.fetchScheduleContext === 'function') {
      try {
        pickerOptions = await options.fetchScheduleContext(courseId) || {};
      } catch {
        pickerOptions = {};
      }
    }

    const allowedDates = pickerOptions.allowedDates || [];
    panel.dataset.allowedDates = allowedDates.join(',');
    panel.innerHTML = schedulePickerHtml(
      courseId,
      course.duration_days || 1,
      course.title,
      [],
      pickerOptions
    );
    bindSchedulePickers(panel);
  };

  select.addEventListener('change', () => {
    renderForCourse().catch(() => {});
  });
}

function getAllowedDatesFromForm(form, courseId) {
  const panel = form.querySelector('[data-schedule-select-panel]')
    || form.querySelector(`[data-schedule-panel="${courseId}"]`)
    || form.querySelector(`[data-teaching-schedule-panel="${courseId}"]`);
  const raw = panel?.dataset?.allowedDates;
  if (!raw) return null;
  const dates = raw.split(',').map((d) => d.trim()).filter(Boolean);
  return dates.length ? dates : null;
}

function readSessionDatesRaw(source, courseId) {
  const fieldName = `session_dates_${courseId}`;
  if (source instanceof FormData) {
    return source.get(fieldName) || '';
  }
  if (source?.querySelector) {
    return source.querySelector(`[name="${fieldName}"]`)?.value || '';
  }
  return '';
}

function parseSessionDates(raw) {
  return String(raw).split(',').map((d) => d.trim()).filter(Boolean);
}

function collectSchedulesFromForm(form, courseIds) {
  const schedules = {};
  for (const courseId of courseIds) {
    schedules[courseId] = parseSessionDates(readSessionDatesRaw(form, courseId));
  }
  return schedules;
}

function collectScheduleFromForm(form, courseId) {
  return parseSessionDates(readSessionDatesRaw(form, courseId));
}

function validateSchedulesInForm(form, courseIds, coursesById) {
  for (const courseId of courseIds) {
    const course = coursesById.get(courseId);
    const duration = course?.duration_days || 1;
    const dates = collectScheduleFromForm(form, courseId);
    const allowed = getAllowedDatesFromForm(form, courseId);
    const maxDays = allowed?.length ? allowed.length : duration;
    const label = course?.title || 'Formation';

    if (!dates.length) {
      throw new Error(`${label} : sélectionnez au moins un jour de formation.`);
    }
    if (dates.length > maxDays) {
      throw new Error(`${label} : maximum ${maxDays} jour(s) (${dates.length} sélectionné(s)).`);
    }
    if (allowed?.length) {
      const allowedSet = new Set(allowed);
      if (dates.some((d) => !allowedSet.has(d))) {
        throw new Error(`${label} : les jours doivent faire partie de la planification existante.`);
      }
    }
  }
}

function coursesMapFromList(courses) {
  return new Map(courses.map((c) => [c.id, c]));
}

function formatSessionDatesLabel(dates) {
  if (!dates?.length) return 'Dates non définies';
  return formatDatesList(dates);
}

function initSchedulePickersInModal(form) {
  bindSchedulePickers(form);
}

window.schedulePickerHtml = schedulePickerHtml;
window.bindSchedulePickers = bindSchedulePickers;
window.bindCourseChecklistSchedules = bindCourseChecklistSchedules;
window.bindCourseSelectSchedule = bindCourseSelectSchedule;
window.collectSchedulesFromForm = collectSchedulesFromForm;
window.collectScheduleFromForm = collectScheduleFromForm;
window.validateSchedulesInForm = validateSchedulesInForm;
window.coursesMapFromList = coursesMapFromList;
window.formatSessionDatesLabel = formatSessionDatesLabel;
window.initSchedulePickersInModal = initSchedulePickersInModal;

function mountSchedulePickerFresh(root) {
  if (!root) return;
  delete root.dataset.bound;
  mountSchedulePicker(root);
}

window.mountSchedulePickerFresh = mountSchedulePickerFresh;
