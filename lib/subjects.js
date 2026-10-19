const SUBJECTS = [
  {
    id: 'microsoft',
    label: 'Microsoft',
    icon: '/images/subjects/microsoft.svg',
    description: 'Microsoft certifications and technologies.',
  },
  {
    id: 'comptia',
    label: 'CompTIA',
    icon: '/images/subjects/comptia.svg',
    description: 'Foundational IT certifications.',
  },
  {
    id: 'systemes',
    label: 'Systems',
    icon: '/images/subjects/systemes.svg',
    description: 'Systems administration and architecture.',
  },
  {
    id: 'reseaux',
    label: 'Networking',
    icon: '/images/subjects/reseaux.svg',
    description: 'Network infrastructure, protocols and connectivity.',
  },
  {
    id: 'base-de-donnees',
    label: 'Databases',
    icon: '/images/subjects/base-de-donnees.svg',
    description: 'SQL, modeling and database administration.',
  },
  {
    id: 'bureautique',
    label: 'Office productivity',
    icon: '/images/subjects/bureautique.svg',
    description: 'Office suite, productivity and collaboration tools.',
  },
  {
    id: 'cours-entreprise',
    label: "Enterprise courses",
    icon: '/images/subjects/cours-entreprise.svg',
    description: 'Custom training for companies and organizations.',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: '/images/subjects/cloud.svg',
    description: 'Cloud infrastructure and services.',
  },
  {
    id: 'cybersecurite',
    label: 'Cybersecurity',
    icon: '/images/subjects/cybersecurite.svg',
    description: 'Systems and network security.',
  },
  {
    id: 'developpement',
    label: 'Development',
    icon: '/images/subjects/developpement.svg',
    description: 'Languages, frameworks and best practices.',
  },
  {
    id: 'devops',
    label: 'DevOps',
    icon: '/images/subjects/devops.svg',
    description: 'CI/CD, containers and automation.',
  },
  {
    id: 'ia',
    label: 'IA',
    icon: '/images/subjects/ia.svg',
    description: 'Artificial intelligence and machine learning.',
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
