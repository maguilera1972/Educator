/**
 * Structure alignée sur le Microsoft Certification Poster (solution areas + niveaux).
 * Référence : https://arch-center.azureedge.net/Credentials/Certification-Poster_en-us.pdf
 */

const MICROSOFT_SUBSECTIONS = [
  {
    id: 'fundamentals',
    label: 'Fundamentals',
    description: 'Entry-level certifications — ideal to get started or change fields. No prerequisites.',
    order: 1,
  },
  {
    id: 'infrastructure',
    label: 'Azure Infrastructure',
    description: 'Administration, architecture and operation of Azure and hybrid workloads.',
    order: 2,
  },
  {
    id: 'data-ai',
    label: 'Data & AI',
    description: 'Data engineering, data science, AI and Microsoft Fabric.',
    order: 3,
  },
  {
    id: 'digital-app',
    label: 'Apps & Innovation',
    description: 'Cloud development, modern apps and AI integration.',
    order: 4,
  },
  {
    id: 'modern-work',
    label: 'Modern Work',
    description: 'Microsoft 365, Teams, endpoints and Power Platform.',
    order: 5,
  },
  {
    id: 'business-apps',
    label: 'Business Applications',
    description: 'Dynamics 365 — sales, customer service, finance and operations.',
    order: 6,
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Cloud security, identity, compliance and security operations.',
    order: 7,
  },
  {
    id: 'specialty',
    label: 'Specialties',
    description: 'Targeted certifications for specific workloads or industries.',
    order: 8,
  },
];

const LEVEL_LABELS = {
  fundamentals: 'Fundamentals',
  associate: 'Associate',
  expert: 'Expert',
  specialty: 'Specialty',
};

const MICROSOFT_COURSES = [
  // — Fundamentals —
  { exam_code: 'AZ-900', title: 'Microsoft Azure Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Cloud concepts, core Azure services, security, compliance and pricing.' },
  { exam_code: 'AI-901', title: 'Microsoft Azure AI Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Concepts d\'IA et de machine learning sur Azure, Azure OpenAI et workloads IA.' },
  { exam_code: 'DP-900', title: 'Microsoft Azure Data Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Relational and non-relational data concepts, analytics and Azure.' },
  { exam_code: 'SC-900', title: 'Microsoft Security, Compliance, and Identity Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Security, compliance and identity fundamentals on Microsoft Entra, Defender and Purview.' },
  { exam_code: 'MS-900', title: 'Microsoft 365 Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Microsoft 365 services, cloud, security and licensing models.' },
  { exam_code: 'PL-900', title: 'Microsoft Power Platform Fundamentals', subsection: 'fundamentals', level: 'fundamentals', description: 'Power Apps, Power Automate, Power BI et les fondamentaux de la Power Platform.' },
  { exam_code: 'MB-910', title: 'Microsoft Dynamics 365 Fundamentals (CRM)', subsection: 'fundamentals', level: 'fundamentals', description: 'Fundamentals des applications CRM Dynamics 365 — ventes, marketing et service client.' },
  { exam_code: 'MB-920', title: 'Microsoft Dynamics 365 Fundamentals (ERP)', subsection: 'fundamentals', level: 'fundamentals', description: 'Dynamics 365 ERP application fundamentals — finance and operations.' },

  // — Azure Infrastructure —
  { exam_code: 'AZ-104', title: 'Microsoft Azure Administrator Associate', subsection: 'infrastructure', level: 'associate', description: 'Identity, storage, virtual networks, backups and Azure governance.' },
  { exam_code: 'AZ-305', title: 'Microsoft Azure Solutions Architect Expert', subsection: 'infrastructure', level: 'expert', description: 'Design secure, scalable and resilient Azure solutions (prerequisite AZ-104).' },
  { exam_code: 'AZ-700', title: 'Microsoft Azure Network Engineer Associate', subsection: 'infrastructure', level: 'associate', description: 'Hybrid networking, connectivity, load balancing and network security on Azure.' },
  { exam_code: 'AZ-800', title: 'Windows Server Hybrid Administrator Associate (AZ-800)', subsection: 'infrastructure', level: 'associate', description: 'Administer on-premises and hybrid Windows Server — configuration (AZ-800).' },
  { exam_code: 'AZ-801', title: 'Windows Server Hybrid Administrator Associate (AZ-801)', subsection: 'infrastructure', level: 'associate', description: 'Administer on-premises and hybrid Windows Server — security and maintenance (AZ-801).' },
  { exam_code: 'AZ-400', title: 'Microsoft Azure DevOps Engineer Expert', subsection: 'infrastructure', level: 'expert', description: 'CI/CD, Infrastructure as Code, release strategies and DevOps collaboration on Azure.' },

  // — Data & AI —
  { exam_code: 'AI-103', title: 'Microsoft Azure AI App and Agent Developer Associate', subsection: 'data-ai', level: 'associate', description: 'Design and deploy AI solutions and agents with Azure AI Foundry and Azure OpenAI.' },
  { exam_code: 'DP-100', title: 'Microsoft Azure Data Scientist Associate', subsection: 'data-ai', level: 'associate', description: 'Train, evaluate and deploy ML models with Azure Machine Learning.' },
  { exam_code: 'DP-203', title: 'Microsoft Azure Data Engineer Associate', subsection: 'data-ai', level: 'associate', description: 'Data pipelines, Azure Data Factory, Synapse Analytics and Databricks.' },
  { exam_code: 'DP-300', title: 'Microsoft Azure Database Administrator Associate', subsection: 'data-ai', level: 'associate', description: 'Administer relational databases on SQL Server and Azure (Azure SQL, PostgreSQL, etc.).' },
  { exam_code: 'DP-700', title: 'Microsoft Fabric Data Engineer Associate', subsection: 'data-ai', level: 'associate', description: 'Data engineering with Microsoft Fabric — unified lakehouses, pipelines and analytics.' },

  // — Apps & Innovation —
  { exam_code: 'AI-200', title: 'Microsoft Azure AI Cloud Developer Associate', subsection: 'digital-app', level: 'associate', description: 'Cloud application development with AI — successor to the Azure developer path.' },
  { exam_code: 'AZ-204', title: 'Microsoft Azure Developer Associate', subsection: 'digital-app', level: 'associate', description: 'Development sur Azure Functions, App Service, Cosmos DB et stockage (en transition vers AI-200).' },

  // — Modern Work —
  { exam_code: 'MS-700', title: 'Microsoft Teams Administrator Associate', subsection: 'modern-work', level: 'associate', description: 'Deploy and manage Microsoft Teams, telephony, meetings and governance.' },
  { exam_code: 'MD-102', title: 'Microsoft Endpoint Administrator Associate', subsection: 'modern-work', level: 'associate', description: 'Manage Windows endpoints with Intune, Autopilot and compliance policies.' },
  { exam_code: 'MS-102', title: 'Microsoft 365 Administrator Expert', subsection: 'modern-work', level: 'expert', description: 'Deploy and administer Microsoft 365 globally — identity, security and collaboration.' },
  { exam_code: 'PL-200', title: 'Microsoft Power Platform Functional Consultant Associate', subsection: 'modern-work', level: 'associate', description: 'Design Power Platform solutions for business processes and Dynamics 365.' },
  { exam_code: 'PL-400', title: 'Microsoft Power Platform Developer Associate', subsection: 'modern-work', level: 'associate', description: 'Develop, secure and troubleshoot Power Platform solutions.' },
  { exam_code: 'PL-600', title: 'Microsoft Power Platform Solution Architect Expert', subsection: 'modern-work', level: 'expert', description: 'Architect Power Platform solutions at organizational scale.' },

  // — Business Applications (Dynamics 365) —
  { exam_code: 'MB-210', title: 'Microsoft Dynamics 365 Sales Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Configuration et personnalisation de Dynamics 365 Sales et du parcours commercial.' },
  { exam_code: 'MB-220', title: 'Microsoft Dynamics 365 Marketing Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Campagnes marketing, segments et parcours client dans Dynamics 365 Marketing.' },
  { exam_code: 'MB-230', title: 'Microsoft Dynamics 365 Customer Service Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Service client, cases, knowledge base et omnicanal dans Dynamics 365.' },
  { exam_code: 'MB-300', title: 'Microsoft Dynamics 365 Finance Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Accounting, fixed assets and finance in Dynamics 365 Finance.' },
  { exam_code: 'MB-310', title: 'Microsoft Dynamics 365 Supply Chain Management Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Gestion des stocks, production et logistique dans Dynamics 365 SCM.' },
  { exam_code: 'MB-700', title: 'Microsoft Dynamics 365 Finance and Operations Apps Solution Architect Expert', subsection: 'business-apps', level: 'expert', description: 'Architecture de solutions Finance & Operations pour les grandes organisations.' },
  { exam_code: 'MB-800', title: 'Microsoft Dynamics 365 Business Central Functional Consultant', subsection: 'business-apps', level: 'associate', description: 'Configure and deploy Dynamics 365 Business Central for SMBs.' },

  // — Security —
  { exam_code: 'SC-200', title: 'Microsoft Security Operations Analyst Associate', subsection: 'security', level: 'associate', description: 'Threat detection and response with Microsoft Sentinel, Defender XDR and SIEM.' },
  { exam_code: 'SC-300', title: 'Microsoft Identity and Access Administrator Associate', subsection: 'security', level: 'associate', description: 'Identity management, conditional access and Microsoft Entra ID.' },
  { exam_code: 'SC-400', title: 'Microsoft Information Protection Administrator Associate', subsection: 'security', level: 'associate', description: 'Data protection, DLP, governance and compliance with Purview.' },
  { exam_code: 'SC-500', title: 'Microsoft Cloud and AI Security Engineer Associate', subsection: 'security', level: 'associate', description: 'Secure cloud and AI workloads — successor to the AZ-500 path.' },
  { exam_code: 'SC-100', title: 'Microsoft Cybersecurity Architect Expert', subsection: 'security', level: 'expert', description: 'Design enterprise Zero Trust cybersecurity architecture.' },
  { exam_code: 'AZ-500', title: 'Microsoft Azure Security Engineer Associate', subsection: 'security', level: 'associate', description: 'Azure identity, network and data security (transitioning to SC-500).' },

  // — Specialties —
  { exam_code: 'AZ-140', title: 'Microsoft Azure Virtual Desktop Specialty', subsection: 'specialty', level: 'specialty', description: 'Plan and deploy Azure Virtual Desktop (AVD) at scale.' },
  { exam_code: 'AZ-120', title: 'Microsoft Azure for SAP Workloads Specialty', subsection: 'specialty', level: 'specialty', description: 'Migrate, deploy and operate SAP workloads on Azure.' },
  { exam_code: 'DP-420', title: 'Microsoft Azure Cosmos DB Developer Specialty', subsection: 'specialty', level: 'specialty', description: 'Model and develop applications on Azure Cosmos DB.' },
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
