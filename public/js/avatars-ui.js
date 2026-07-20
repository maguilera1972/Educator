function avatarImgHtml(user, size = 'md', extraClass = '') {
  if (!user) return '';
  const url = user.avatar_url || '/avatars/generic-0.svg';
  const fallback = user.gravatar_fallback || user.avatar_url || '/avatars/generic-0.svg';
  const name = user.name || 'Utilisateur';
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : 'avatar-md';
  return `<img src="${url}" alt="Avatar de ${name}" class="avatar ${sizeClass} ${extraClass}" data-fallback="${fallback}" onerror="this.onerror=null;this.src=this.dataset.fallback;">`;
}

function bindAvatarFallbacks(root = document) {
  root.querySelectorAll('.avatar[data-fallback]').forEach((img) => {
    img.addEventListener('error', () => {
      if (img.dataset.fallback) img.src = img.dataset.fallback;
    }, { once: true });
  });
}

function profileHoverTrigger(userId, innerHtml, extraClass = '') {
  if (!userId) return innerHtml;
  return `<span class="profile-hover-trigger ${extraClass}" data-profile-user="${userId}" tabindex="0">${innerHtml}</span>`;
}

function userChipHtml(user) {
  if (!user) return '';
  const label = typeof displayRoles === 'function' ? displayRoles(user) : user.role;
  const attrs = user.id ? ` class="nav-user-chip profile-hover-trigger" data-profile-user="${user.id}"` : ' class="nav-user-chip"';
  return `
    <a href="/profile.html"${attrs}>
      ${avatarImgHtml(user, 'sm')}
      <span>${user.name} (${label})</span>
    </a>
  `;
}

function instructorChipHtml(instructor) {
  if (!instructor) return '';
  const fallbackUrl = instructor.gravatar_fallback || instructor.avatar_url || '/avatars/generic-0.svg';
  const roleSuffix = instructor.teaching_role === 'principal'
    ? ' (principal)'
    : instructor.teaching_role === 'remplaçant'
      ? ' (remplaçant)'
      : '';
  const inner = `
    <span class="instructor-chip">
      <img src="${instructor.avatar_url || fallbackUrl}" alt="" class="avatar avatar-sm" data-fallback="${fallbackUrl}" onerror="this.onerror=null;this.src=this.dataset.fallback;">
      <span>${instructor.name}${roleSuffix}</span>
    </span>
  `;
  return profileHoverTrigger(instructor.id, inner, 'instructor-chip-wrap');
}

function instructorLineHtml(name, avatarUrl, fallback, userId = null) {
  const fallbackUrl = fallback || '/avatars/generic-0.svg';
  const inner = `
    <span class="instructor-line">
      <img src="${avatarUrl || fallbackUrl}" alt="" class="avatar avatar-sm" data-fallback="${fallbackUrl}" onerror="this.onerror=null;this.src=this.dataset.fallback;">
      <span>Formateur : ${name}</span>
    </span>
  `;
  return profileHoverTrigger(userId, inner);
}

function courseInstructorsLineHtml(course) {
  if (course?.teaching_instructors?.length) {
    return instructorsLineHtml(course.teaching_instructors);
  }
  return instructorLineHtml(
    course?.instructor_name,
    course?.instructor_avatar_url,
    course?.instructor_avatar_fallback,
    course?.instructor_id || null
  );
}

function instructorsLineHtml(instructors) {
  if (!instructors?.length) return '';
  if (instructors.length === 1) {
    return `<span class="instructor-line">${instructorChipHtml(instructors[0])}</span>`;
  }

  const chips = instructors.map((instructor) => instructorChipHtml(instructor)).join('<span class="instructor-sep"> · </span>');
  return `
    <span class="instructor-line instructor-line--multiple">
      <span>Formateurs : ${chips}</span>
    </span>
  `;
}

function userProfileCellHtml(user, contentHtml) {
  if (!user?.id) return contentHtml;
  return profileHoverTrigger(user.id, contentHtml, 'user-cell profile-hover-trigger--block');
}
