const MICROSOFT_SUBSECTIONS_UI = [
  { id: 'fundamentals', label: 'Fondamentaux', description: 'Certifications d\'entrée — idéal pour débuter ou changer de domaine.' },
  { id: 'infrastructure', label: 'Infrastructure Azure', description: 'Administration, architecture et exploitation des workloads Azure.' },
  { id: 'data-ai', label: 'Data & IA', description: 'Ingénierie des données, science des données, IA et Microsoft Fabric.' },
  { id: 'digital-app', label: 'Applications & Innovation', description: 'Développement cloud, applications modernes et intégration IA.' },
  { id: 'modern-work', label: 'Modern Work', description: 'Microsoft 365, Teams, endpoints et Power Platform.' },
  { id: 'business-apps', label: 'Business Applications', description: 'Dynamics 365 — ventes, service client, finance et opérations.' },
  { id: 'security', label: 'Sécurité', description: 'Sécurité cloud, identité, conformité et opérations de sécurité.' },
  { id: 'specialty', label: 'Spécialités', description: 'Certifications ciblées pour des workloads spécifiques.' },
];

const MICROSOFT_LEVEL_LABELS = {
  fundamentals: 'Fondamental',
  associate: 'Associé',
  expert: 'Expert',
  specialty: 'Spécialité',
};

function localizedMicrosoftSubsections() {
  return MICROSOFT_SUBSECTIONS_UI.map((section) => {
    if (typeof I18n === 'undefined') return section;
    return {
      ...section,
      label: I18n.microsoftSubsectionLabel(section.id, section.label),
      description: I18n.microsoftSubsectionDescription(section.id, section.description),
    };
  });
}

function localizedLevelLabel(level, fallback) {
  if (typeof I18n !== 'undefined' && I18n.microsoftLevelLabel) {
    return I18n.microsoftLevelLabel(level, fallback || MICROSOFT_LEVEL_LABELS[level] || level);
  }
  return fallback || MICROSOFT_LEVEL_LABELS[level] || level;
}

function groupCoursesByMicrosoftSubsection(courses) {
  const sections = localizedMicrosoftSubsections();
  const grouped = Object.fromEntries(sections.map((s) => [s.id, []]));
  for (const course of courses) {
    const key = course.subsection && grouped[course.subsection] ? course.subsection : 'fundamentals';
    grouped[key].push(course);
  }
  return sections
    .map((section) => ({
      ...section,
      courses: (grouped[section.id] || []).sort((a, b) =>
        (a.exam_code || a.title).localeCompare(b.exam_code || b.title)
      ),
    }))
    .filter((section) => section.courses.length > 0);
}

function renderMicrosoftCatalogSections(subsections, renderCourseCard) {
  return subsections.map((section) => `
    <section class="catalog-subsection" id="ms-${section.id}">
      <header class="catalog-subsection-header">
        <h3 class="catalog-subsection-title">${section.label}</h3>
        <p class="muted catalog-subsection-desc">${section.description}</p>
      </header>
      <div class="course-grid catalog-subsection-grid">
        ${section.courses.map((course) => renderCourseCard(course)).join('')}
      </div>
    </section>
  `).join('');
}

function microsoftCourseBadges(course) {
  const localized = typeof I18n !== 'undefined' && I18n.localizeCourse
    ? I18n.localizeCourse(course)
    : course;
  const parts = [];
  if (localized.exam_code) {
    parts.push(`<span class="exam-badge">${localized.exam_code}</span>`);
  }
  const levelLabel = localized.cert_level
    ? localizedLevelLabel(localized.cert_level, localized.cert_level_label)
    : localized.cert_level_label;
  if (levelLabel) {
    parts.push(`<span class="level-badge level-badge--${localized.cert_level || 'default'}">${levelLabel}</span>`);
  }
  return parts.join('');
}
