const SUBJECTS = [
  {
    id: 'microsoft',
    label: 'Microsoft',
    icon: '/images/subjects/microsoft.svg',
    description: 'Certifications et technologies Microsoft.',
  },
  {
    id: 'comptia',
    label: 'CompTIA',
    icon: '/images/subjects/comptia.svg',
    description: 'Certifications IT fondamentales.',
  },
  {
    id: 'systemes',
    label: 'Systèmes',
    icon: '/images/subjects/systemes.svg',
    description: 'Administration et architecture des systèmes.',
  },
  {
    id: 'reseaux',
    label: 'Réseaux',
    icon: '/images/subjects/reseaux.svg',
    description: 'Infrastructure réseau, protocoles et connectivité.',
  },
  {
    id: 'base-de-donnees',
    label: 'Base de données',
    icon: '/images/subjects/base-de-donnees.svg',
    description: 'SQL, modélisation et administration de bases de données.',
  },
  {
    id: 'bureautique',
    label: 'Bureautique',
    icon: '/images/subjects/bureautique.svg',
    description: 'Suite Office, productivité et outils collaboratifs.',
  },
  {
    id: 'cours-entreprise',
    label: "Cours d'entreprise",
    icon: '/images/subjects/cours-entreprise.svg',
    description: 'Formations sur mesure pour les entreprises et organisations.',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: '/images/subjects/cloud.svg',
    description: 'Infrastructure et services cloud.',
  },
  {
    id: 'cybersecurite',
    label: 'Cybersécurité',
    icon: '/images/subjects/cybersecurite.svg',
    description: 'Sécurité des systèmes et des réseaux.',
  },
  {
    id: 'developpement',
    label: 'Développement',
    icon: '/images/subjects/developpement.svg',
    description: 'Langages, frameworks et bonnes pratiques.',
  },
  {
    id: 'devops',
    label: 'DevOps',
    icon: '/images/subjects/devops.svg',
    description: 'CI/CD, conteneurs et automatisation.',
  },
  {
    id: 'ia',
    label: 'IA',
    icon: '/images/subjects/ia.svg',
    description: 'Intelligence artificielle et machine learning.',
  },
];

const SUBJECT_IDS = new Set(SUBJECTS.map((s) => s.id));

function isValidSubject(id) {
  return SUBJECT_IDS.has(id);
}

function getSubjectLabel(id) {
  return SUBJECTS.find((s) => s.id === id)?.label || id;
}

function getSubjectIcon(id) {
  return SUBJECTS.find((s) => s.id === id)?.icon || '/images/subjects/default.svg';
}

function getSubjectsCatalog(courseLists = {}) {
  return SUBJECTS.map((subject) => ({
    ...subject,
    course_count: courseLists[subject.id]?.length || 0,
    courses: courseLists[subject.id] || [],
  }));
}

module.exports = {
  SUBJECTS,
  isValidSubject,
  getSubjectLabel,
  getSubjectIcon,
  getSubjectsCatalog,
};
