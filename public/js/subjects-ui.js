const SUBJECTS_UI = [
  { id: 'microsoft', label: 'Microsoft', icon: '/images/subjects/microsoft.svg', description: 'Microsoft certifications and technologies.' },
  { id: 'comptia', label: 'CompTIA', icon: '/images/subjects/comptia.svg', description: 'Foundational IT certifications.' },
  { id: 'systemes', label: 'Systems', icon: '/images/subjects/systemes.svg', description: 'Systems administration and architecture.' },
  { id: 'reseaux', label: 'Networking', icon: '/images/subjects/reseaux.svg', description: 'Network infrastructure, protocols and connectivity.' },
  { id: 'base-de-donnees', label: 'Databases', icon: '/images/subjects/base-de-donnees.svg', description: 'SQL, modeling and database administration.' },
  { id: 'bureautique', label: 'Office productivity', icon: '/images/subjects/bureautique.svg', description: 'Office suite, productivity and collaboration tools.' },
  { id: 'cours-entreprise', label: "Enterprise courses", icon: '/images/subjects/cours-entreprise.svg', description: 'Custom training for companies and organizations.' },
  { id: 'cloud', label: 'Cloud', icon: '/images/subjects/cloud.svg', description: 'Cloud infrastructure and services.' },
  { id: 'cybersecurite', label: 'Cybersecurity', icon: '/images/subjects/cybersecurite.svg', description: 'Systems and network security.' },
  { id: 'developpement', label: 'Development', icon: '/images/subjects/developpement.svg', description: 'Languages, frameworks and best practices.' },
  { id: 'devops', label: 'DevOps', icon: '/images/subjects/devops.svg', description: 'CI/CD, containers and automation.' },
  { id: 'ia', label: 'IA', icon: '/images/subjects/ia.svg', description: 'Artificial intelligence and machine learning.' },
];

function localizedSubject(subject) {
  if (typeof I18n !== 'undefined' && I18n.localizeSubject) {
    return I18n.localizeSubject(subject);
  }
  return subject;
}

function subjectLogoHtml(subject, className = 'subject-logo') {
  if (!subject?.icon) return '';
  return `<img class="${className}" src="${subject.icon}" alt="" aria-hidden="true" loading="lazy">`;
}

function mergeSubjectsCatalog(apiSubjects = []) {
  const apiById = Object.fromEntries(apiSubjects.map((s) => [s.id, s]));
  return SUBJECTS_UI.map((subject) => {
    const api = apiById[subject.id] || {};
    const merged = {
      ...subject,
      ...api,
      icon: api.icon || subject.icon,
      description: api.description || subject.description,
      course_count: api.course_count ?? 0,
      courses: api.courses ?? [],
    };
    return localizedSubject(merged);
  });
}

function courseCountLabel(count) {
  const n = Number(count) || 0;
  if (typeof t === 'function') {
    return n === 1
      ? t('catalog.courseCountOne', { n })
      : t('catalog.courseCountMany', { n });
  }
  return `${n} cours disponible${n > 1 ? 's' : ''}`;
}

function renderSubjectFeatureCard(subject) {
  const s = localizedSubject(subject);
  const explore = typeof t === 'function' ? t('catalog.explore') : 'Explorer';
  return `
    <article class="card feature-subject-card">
      <div class="subject-logo-wrap">
        ${subjectLogoHtml(s)}
      </div>
      <h3>${s.label}</h3>
      <p class="muted">${s.description}</p>
      <a href="/courses.html?subject=${s.id}" class="btn-secondary btn-sm">${explore}</a>
    </article>
  `;
}

function renderSubjectCatalogCard(subject, options = {}) {
  const s = localizedSubject(subject);
  const { activeId = null, showCount = true } = options;
  const countLabel = showCount && s.course_count !== undefined
    ? `<p class="muted">${courseCountLabel(s.course_count)}</p>`
    : '';
  const explore = typeof t === 'function' ? t('catalog.exploreSubject') : 'Explorer ce sujet →';
  return `
    <a href="/courses.html?subject=${s.id}" class="card subject-card${activeId === s.id ? ' is-active' : ''}">
      <div class="subject-logo-wrap">
        ${subjectLogoHtml(s)}
      </div>
      <h3>${s.label}</h3>
      ${countLabel}
      <span class="subject-count">${explore}</span>
    </a>
  `;
}
