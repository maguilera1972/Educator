(function initProfileHover() {
  if (window.__profileHoverBound) return;
  window.__profileHoverBound = true;

  const SHOW_DELAY = 350;
  const HIDE_DELAY = 200;
  const cache = new Map();

  let showTimer = null;
  let hideTimer = null;
  let activeUserId = null;
  let activeTrigger = null;
  let cardEl = null;

  function ensureCard() {
    if (cardEl) return cardEl;
    cardEl = document.createElement('div');
    cardEl.id = 'profile-hover-card';
    cardEl.className = 'profile-hover-card';
    cardEl.hidden = true;
    cardEl.setAttribute('role', 'tooltip');
    document.body.appendChild(cardEl);

    cardEl.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
    });
    cardEl.addEventListener('mouseleave', () => {
      scheduleHide();
    });

    return cardEl;
  }

  function scheduleHide() {
    clearTimeout(showTimer);
    hideTimer = setTimeout(hideCard, HIDE_DELAY);
  }

  function hideCard() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    activeUserId = null;
    activeTrigger = null;
    if (cardEl) cardEl.hidden = true;
  }

  function positionCard(trigger) {
    const card = ensureCard();
    card.hidden = false;
    const margin = 10;
    const triggerRect = trigger.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    let top = triggerRect.bottom + margin;
    let left = triggerRect.left;

    if (left + cardRect.width > window.innerWidth - margin) {
      left = window.innerWidth - cardRect.width - margin;
    }
    if (left < margin) left = margin;

    if (top + cardRect.height > window.innerHeight - margin) {
      top = triggerRect.top - cardRect.height - margin;
    }
    if (top < margin) top = margin;

    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function bioPreviewHtml(html) {
    if (!html?.trim()) {
      return '<p class="profile-hover-card__empty muted">No bio written yet.</p>';
    }
    return `<div class="profile-hover-card__bio">${html}</div>`;
  }

  function renderCard(data) {
    const card = ensureCard();
    const { user, profile_bio: profileBio, role_label: roleLabel } = data;
    card.innerHTML = `
      <div class="profile-hover-card__header">
        ${typeof avatarImgHtml === 'function' ? avatarImgHtml(user, 'md') : ''}
        <div class="profile-hover-card__meta">
          <strong class="profile-hover-card__name">${user.name}</strong>
          <span class="profile-hover-card__role">${roleLabel || ''}</span>
        </div>
      </div>
      ${bioPreviewHtml(profileBio)}
    `;
    if (typeof bindAvatarFallbacks === 'function') {
      bindAvatarFallbacks(card);
    }
  }

  async function fetchPreview(userId) {
    if (cache.has(userId)) return cache.get(userId);
    if (typeof API === 'undefined' || !API.getToken()) {
      throw new Error('Login requise');
    }
    const data = await API.request(`/api/profile/${userId}/preview`);
    cache.set(userId, data);
    return data;
  }

  async function showForTrigger(trigger) {
    const userId = parseInt(trigger.dataset.profileUser, 10);
    if (!userId) return;

    activeUserId = userId;
    activeTrigger = trigger;
    const card = ensureCard();
    card.hidden = false;
    card.innerHTML = '<p class="profile-hover-card__loading muted">Loading…</p>';
    positionCard(trigger);

    try {
      const data = await fetchPreview(userId);
      if (activeUserId !== userId) return;
      renderCard(data);
      positionCard(trigger);
    } catch (err) {
      if (activeUserId !== userId) return;
      card.innerHTML = `<p class="profile-hover-card__empty muted">${err.message || 'Profil indisponible'}</p>`;
      positionCard(trigger);
    }
  }

  function scheduleShow(trigger) {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      showForTrigger(trigger);
    }, SHOW_DELAY);
  }

  document.addEventListener('mouseover', (event) => {
    const trigger = event.target.closest('[data-profile-user]');
    if (!trigger) return;
    if (trigger === activeTrigger && cardEl && !cardEl.hidden) return;
    scheduleShow(trigger);
  });

  document.addEventListener('mouseout', (event) => {
    const trigger = event.target.closest('[data-profile-user]');
    if (!trigger) return;
    const related = event.relatedTarget;
    if (related && (trigger.contains(related) || cardEl?.contains(related))) return;
    scheduleHide();
  });

  document.addEventListener('focusin', (event) => {
    const trigger = event.target.closest('[data-profile-user]');
    if (trigger) scheduleShow(trigger);
  });

  document.addEventListener('focusout', (event) => {
    const trigger = event.target.closest('[data-profile-user]');
    if (!trigger) return;
    scheduleHide();
  });

  document.addEventListener('scroll', hideCard, true);
  window.addEventListener('resize', hideCard);
})();
