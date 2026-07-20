/**
 * Structure alignée sur le Microsoft Certification Poster (solution areas + niveaux).
 * Référence : https://arch-center.azureedge.net/Credentials/Certification-Poster_en-us.pdf
 */

const MICROSOFT_SUBSECTIONS = [
  {
    id: 'fundamentals',
    label: 'Fondamentaux',
    description: 'Certifications d\'entrée — idéal pour débuter ou changer de domaine. Aucun prérequis.',
    order: 1,
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure Azure',
    description: 'Administration, architecture et exploitation des workloads Azure et hybrides.',
    order: 2,
  },
  {
    id: 'data-ai',
    label: 'Data & IA',
    description: 'Ingénierie des données, science des données, IA et Microsoft Fabric.',
    order: 3,
  },
  {
    id: 'digital-app',
    label: 'Applications & Innovation',
    description: 'Développement cloud, applications modernes et intégration IA.',
    order: 4,
  },
  {
    id: 'modern-work',
    label: 'Modern Work',
    description: 'Microsoft 365, Teams, endpoints et Power Platform.',
    order: 5,
  },
  {
    id: 'business-apps',
    label: 'Business Applications',
    description: 'Dynamics 365 — ventes, service client, finance et opérations.',
    order: 6,
  },
  {
    id: 'security',
    label: 'Sécurité',
    description: 'Sécurité cloud, identité, conformité et opérations de sécurité.',
    order: 7,
  },
  {
    id: 'specialty',
    label: 'Spécialités',
    description: 'Certifications ciblées pour des workloads ou secteurs spécifiques.',
    order: 8,
  },
];

const LEVEL_LABELS = {
  fundamentals: 'Fondamental',
  associate: 'Associé',
  expert: 'Expert',
  specialty: 'Spécialité',
};

const MICROSOFT_COURSES = [
  // — Fondamentaux —
  { exam_code: 'AZ-900', title: 'Microsoft Azure Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Concepts cloud, services Azure de base, sécurité, conformité et tarification.' },
  { exam_code: 'AI-901', title: 'Microsoft Azure AI Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Concepts d\'IA et de machine learning sur Azure, Azure OpenAI et workloads IA.' },
  { exam_code: 'DP-900', title: 'Microsoft Azure Data Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Concepts de données relationnelles et non relationnelles, analytics et Azure.' },
  { exam_code: 'SC-900', title: 'Microsoft Security, Compliance, and Identity Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Fondamentaux sécurité, conformité et identité sur Microsoft Entra, Defender et Purview.' },
  { exam_code: 'MS-900', title: 'Microsoft 365 Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Services Microsoft 365, cloud, sécurité et modèles de licences.' },
  { exam_code: 'PL-900', title: 'Microsoft Power Platform Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Power Apps, Power Automate, Power BI et les fondamentaux de la Power Platform.' },
  { exam_code: 'MB-910', title: 'Microsoft Dynamics 365 Fundamentals (CRM)', subsection: 'fundamentals', level: 'fundamentals', description: 'Fondamentaux des applications CRM Dynamics 365 — ventes, marketing et service client.' },
  { exam_code: 'MB-920', title: 'Microsoft Dynamics 365 Fundamentals (ERP)', subsection: 'fundamentals', level: 'fundamentals', description: 'Fondamentaux des applications ERP Dynamics 365 — finance et opérations.' },

  // — Infrastructure Azure —
  { exam_code: 'AZ-104', title: 'Microsoft Azure Administrator Associate', subsection: 'infrastructure', level: 'associate', description: 'Gestion des identités, stockage, réseaux virtuels, sauvegardes et gouvernance Azure.' },
  { exam_code: 'AZ-305', title: 'Microsoft Azure Solutions Architect Expert', subsection: 'infrastructure', level: 'expert', description: 'Conception de solutions Azure sécurisées, évolutives et résilientes (prérequis AZ-104).' },
  { exam_code: 'AZ-700', title: 'Microsoft Azure Network Engineer Associate', subsection: 'infrastructure', level: 'associate', description: 'Réseaux hybrides, connectivité, load balancing et sécurité réseau sur Azure.' },
  { exam_code: 'AZ-800', title: 'Windows Server Hybrid Administrator Associate (AZ-800)', subsection: 'infrastructure', level: 'associate', description: 'Administration des serveurs Windows locaux et hybrides — partie configuration (AZ-800).' },
  { exam_code: 'AZ-801', title: 'Windows Server Hybrid Administrator Associate (AZ-801)', subsection: 'infrastructure', level: 'associate', description: 'Administration des serveurs Windows locaux et hybrides — partie sécurité et maintenance (AZ-801).' },
  { exam_code: 'AZ-400', title: 'Microsoft Azure DevOps Engineer Expert', subsection: 'infrastructure', level: 'expert', description: 'CI/CD, Infrastructure as Code, stratégies de release et collaboration DevOps sur Azure.' },

  // — Data & IA —
  { exam_code: 'AI-103', title: 'Microsoft Azure AI App and Agent Developer Associate', subsection: 'data-ai', level: 'associate', description: 'Conception et déploiement de solutions IA et d\'agents avec Azure AI Foundry et Azure OpenAI.' },
  { exam_code: 'DP-100', title: 'Microsoft Azure Data Scientist Associate', subsection: 'data-ai', level: 'associate', description: 'Entraînement, évaluation et déploiement de modèles ML avec Azure Machine Learning.' },
  { exam_code: 'DP-203', title: 'Microsoft Azure Data Engineer Associate', subsection: 'data-ai', level: 'associate', description: 'Pipelines de données, Azure Data Factory, Synapse Analytics et Databricks.' },
  { exam_code: 'DP-300', title: 'Microsoft Azure Database Administrator Associate', subsection: 'data-ai', level: 'associate', description: 'Administration des bases relationnelles SQL Server et Azure (Azure SQL, PostgreSQL, etc.).' },
  { exam_code: 'DP-700', title: 'Microsoft Fabric Data Engineer Associate', subsection: 'data-ai', level: 'associate', description: 'Ingénierie des données avec Microsoft Fabric — lakehouses, pipelines et analytics unifiés.' },

  // — Applications & Innovation —
  { exam_code: 'AI-200', title: 'Microsoft Azure AI Cloud Developer Associate', subsection: 'digital-app', level: 'associate', description: 'Développement d\'applications cloud intégrant l\'IA — successeur du parcours développeur Azure.' },
  { exam_code: 'AZ-204', title: 'Microsoft Azure Developer Associate', subsection: 'digital-app', level: 'associate', description: 'Développement sur Azure Functions, App Service, Cosmos DB et stockage (en transition vers AI-200).' },

  // — Modern Work —
  { exam_code: 'MS-700', title: 'Microsoft Teams Administrator Associate', subsection: 'modern-work', level: 'associate', description: 'Déploiement et gestion de Microsoft Teams, téléphonie, réunions et gouvernance.' },
  { exam_code: 'MD-102', title: 'Microsoft Endpoint Administrator Associate', subsection: 'modern-work', level: 'associate', description: 'Gestion des endpoints Windows via Intune, Autopilot et politiques de conformité.' },
  { exam_code: 'MS-102', title: 'Microsoft 365 Administrator Expert', subsection: 'modern-work', level: 'expert', description: 'Déploiement et administration globale de Microsoft 365 — identité, sécurité et collaboration.' },
  { exam_code: 'PL-200', title: 'Microsoft Power Platform Functional Consultant Associate', subsection: 'modern-work', level: 'associate', description: 'Conception de solutions Power Platform pour les processus métier et Dynamics 365.' },
  { exam_code: 'PL-400', title: 'Microsoft Power Platform Developer Associate', subsection: 'modern-work', level: 'associate', description: 'Développement, sécurisation et dépannage de solutions Power Platform.' },
  { exam_code: 'PL-600', title: 'Microsoft Power Platform Solution Architect Expert', subsection: 'modern-work', level: 'expert', description: 'Architecture de solutions Power Platform à l\'échelle de l\'organisation.' },

  // — Business Applications (Dynamics 365) —
  { exam_code: 'MB-210', title: 'Microsoft Dynamics 365 Sales Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Configuration et personnalisation de Dynamics 365 Sales et du parcours commercial.' },
  { exam_code: 'MB-220', title: 'Microsoft Dynamics 365 Marketing Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Campagnes marketing, segments et parcours client dans Dynamics 365 Marketing.' },
  { exam_code: 'MB-230', title: 'Microsoft Dynamics 365 Customer Service Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Service client, cases, knowledge base et omnicanal dans Dynamics 365.' },
  { exam_code: 'MB-300', title: 'Microsoft Dynamics 365 Finance Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Comptabilité, immobilisations et finances dans Dynamics 365 Finance.' },
  { exam_code: 'MB-310', title: 'Microsoft Dynamics 365 Supply Chain Management Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Gestion des stocks, production et logistique dans Dynamics 365 SCM.' },
  { exam_code: 'MB-700', title: 'Microsoft Dynamics 365 Finance and Operations Apps Solution Architect Expert', subsection: 'business-apps', level: 'expert', description: 'Architecture de solutions Finance & Operations pour les grandes organisations.' },
  { exam_code: 'MB-800', title: 'Microsoft Dynamics 365 Business Central Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Configuration et déploiement de Dynamics 365 Business Central pour les PME.' },

  // — Sécurité —
  { exam_code: 'SC-200', title: 'Microsoft Security Operations Analyst Associate', subsection: 'security', level: 'associate', description: 'Détection et réponse aux menaces avec Microsoft Sentinel, Defender XDR et SIEM.' },
  { exam_code: 'SC-300', title: 'Microsoft Identity and Access Administrator Associate', subsection: 'security', level: 'associate', description: 'Gestion des identités, accès conditionnel et Microsoft Entra ID.' },
  { exam_code: 'SC-400', title: 'Microsoft Information Protection Administrator Associate', subsection: 'security', level: 'associate', description: 'Protection des données, DLP, gouvernance et conformité avec Purview.' },
  { exam_code: 'SC-500', title: 'Microsoft Cloud and AI Security Engineer Associate', subsection: 'security', level: 'associate', description: 'Sécurisation des workloads cloud et IA — successeur du parcours AZ-500.' },
  { exam_code: 'SC-100', title: 'Microsoft Cybersecurity Architect Expert', subsection: 'security', level: 'expert', description: 'Conception de l\'architecture de cybersécurité Zero Trust pour l\'entreprise.' },
  { exam_code: 'AZ-500', title: 'Microsoft Azure Security Engineer Associate', subsection: 'security', level: 'associate', description: 'Sécurité des identités, réseaux et données Azure (en transition vers SC-500).' },

  // — Spécialités —
  { exam_code: 'AZ-140', title: 'Microsoft Azure Virtual Desktop Specialty', subsection: 'specialty', level: 'specialty', description: 'Planification et déploiement d\'Azure Virtual Desktop (AVD) à l\'échelle.' },
  { exam_code: 'AZ-120', title: 'Microsoft Azure for SAP Workloads Specialty', subsection: 'specialty', level: 'specialty', description: 'Migration, déploiement et exploitation des workloads SAP sur Azure.' },
  { exam_code: 'DP-420', title: 'Microsoft Azure Cosmos DB Developer Specialty', subsection: 'specialty', level: 'specialty', description: 'Modélisation et développement d\'applications sur Azure Cosmos DB.' },
];

const SUBSECTION_BY_ID = Object.fromEntries(MICROSOFT_SUBSECTIONS.map((s) => [s.id, s]));

function getMicrosoftSubsectionLabel(id) {
  return SUBSECTION_BY_ID[id]?.label || id;
}

function getMicrosoftLevelLabel(level) {
  return LEVEL_LABELS[level] || level;
}

function formatMicrosoftCourseTitle(examCode, title) {
  return `${examCode} — ${title}`;
}

function groupMicrosoftCourses(courses) {
  const grouped = Object.fromEntries(MICROSOFT_SUBSECTIONS.map((s) => [s.id, []]));
  for (const course of courses) {
    const key = course.subsection && grouped[course.subsection] ? course.subsection : 'fundamentals';
    grouped[key].push(course);
  }
  return MICROSOFT_SUBSECTIONS
    .map((section) => ({
      ...section,
      courses: (grouped[section.id] || []).sort((a, b) =>
        (a.exam_code || '').localeCompare(b.exam_code || '')
      ),
    }))
    .filter((section) => section.courses.length > 0);
}

module.exports = {
  MICROSOFT_SUBSECTIONS,
  MICROSOFT_COURSES,
  LEVEL_LABELS,
  getMicrosoftSubsectionLabel,
  getMicrosoftLevelLabel,
  formatMicrosoftCourseTitle,
  groupMicrosoftCourses,
};
