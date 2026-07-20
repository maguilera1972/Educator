const SUBJECTS_UI = [
  { id: 'microsoft', label: 'Microsoft', icon: '/images/subjects/microsoft.svg', description: 'Certifications et technologies Microsoft.' },
  { id: 'comptia', label: 'CompTIA', icon: '/images/subjects/comptia.svg', description: 'Certifications IT fondamentales.' },
  { id: 'systemes', label: 'Systèmes', icon: '/images/subjects/systemes.svg', description: 'Administration et architecture des systèmes.' },
  { id: 'reseaux', label: 'Réseaux', icon: '/images/subjects/reseaux.svg', description: 'Infrastructure réseau, protocoles et connectivité.' },
  { id: 'base-de-donnees', label: 'Base de données', icon: '/images/subjects/base-de-donnees.svg', description: 'SQL, modélisation et administration de bases de données.' },
  { id: 'bureautique', label: 'Bureautique', icon: '/images/subjects/bureautique.svg', description: 'Suite Office, productivité et outils collaboratifs.' },
  { id: 'cours-entreprise', label: "Cours d'entreprise", icon: '/images/subjects/cours-entreprise.svg', description: 'Formations sur mesure pour les entreprises et organisations.' },
  { id: 'cloud', label: 'Cloud', icon: '/images/subjects/cloud.svg', description: 'Infrastructure et services cloud.' },
  { id: 'cybersecurite', label: 'Cybersécurité', icon: '/images/subjects/cybersecurite.svg', description: 'Sécurité des systèmes et des réseaux.' },
  { id: 'developpement', label: 'Développement', icon: '/images/subjects/developpement.svg', description: 'Langages, frameworks et bonnes pratiques.' },
  { id: 'devops', label: 'DevOps', icon: '/images/subjects/devops.svg', description: 'CI/CD, conteneurs et automatisation.' },
  { id: 'ia', label: 'IA', icon: '/images/subjects/ia.svg', description: 'Intelligence artificielle et machine learning.' },
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
