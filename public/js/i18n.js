/**
 * LMS-Educator internationalization
 * Locales: fr, en, it, es, de
 */
(function (global) {
  const STORAGE_KEY = 'lms_locale';
  const LOCALES = ['fr', 'en', 'it', 'es', 'de'];
  const LOCALE_LABELS = {
    fr: 'Français',
    en: 'English',
    it: 'Italiano',
    es: 'Español',
    de: 'Deutsch',
  };
  const LOCALE_HTML = {
    fr: 'fr',
    en: 'en',
    it: 'it',
    es: 'es',
    de: 'de',
  };
  const LOCALE_INTL = {
    fr: 'fr-CH',
    en: 'en-GB',
    it: 'it-IT',
    es: 'es-ES',
    de: 'de-DE',
  };

  const STRINGS = {
    fr: {
      'lang.label': 'Langue',
      'nav.courses': 'Cours',
      'nav.dashboard': 'Tableau de bord',
      'nav.admin': 'Administration',
      'nav.login': 'Connexion',
      'nav.register': 'Inscription',
      'nav.logout': 'Déconnexion',
      'nav.profile': 'Mon profil',
      'nav.createAccount': 'Créer un compte',

      'common.save': 'Enregistrer',
      'common.cancel': 'Annuler',
      'common.edit': 'Modifier',
      'common.delete': 'Supprimer',
      'common.add': 'Ajouter',
      'common.create': 'Créer',
      'common.loading': 'Chargement…',
      'common.view': 'Consulter',
      'common.download': 'Télécharger',
      'common.open': 'Ouvrir',
      'common.back': 'Retour',
      'common.yes': 'Oui',
      'common.no': 'Non',
      'common.close': 'Fermer',
      'common.import': 'Importer',
      'common.section': 'Section',
      'common.manageSections': 'Gérer les sections',
      'common.viewed': '✓ Vu',
      'common.notViewed': '',
      'common.principal': 'principal',
      'common.substitute': 'remplaçant',

      'role.learner': 'Apprenant',
      'role.instructor': 'Formateur',
      'role.admin': 'Administrateur',

      'home.heroTitle': "Votre plateforme d'apprentissage personnalisée",
      'home.heroText': 'Gérez vos cours, suivez la progression des apprenants et déployez des contenus pédagogiques.',
      'home.ctaStart': 'Commencer',
      'home.ctaCourses': 'Voir les cours',
      'home.viewAllSubjects': 'Voir tous les sujets',

      'login.title': 'Connexion',
      'login.email': 'Email',
      'login.password': 'Mot de passe',
      'login.submit': 'Se connecter',
      'login.noAccount': "Pas encore de compte ?",
      'login.signUp': "S'inscrire",
      'login.sessionExpired': 'Votre session a expiré ou a été réinitialisée. Veuillez vous reconnecter.',

      'register.title': 'Créer un compte',
      'register.firstName': 'Prénom',
      'register.lastName': 'Nom de famille',
      'register.email': 'Email',
      'register.company': 'Entreprise',
      'register.companyHint': "Requis pour les apprenants — indiquez l'entreprise pour laquelle vous suivez la formation.",
      'register.companyPlaceholder': 'Nom de votre entreprise',
      'register.password': 'Mot de passe',
      'register.profile': 'Profil',
      'register.roleLearner': 'Apprenant',
      'register.roleInstructor': 'Formateur (validation admin requise)',
      'register.instructorHint': 'Les inscriptions formateur doivent être validées par un administrateur qui assignera les formations à enseigner.',
      'register.submit': "S'inscrire",
      'register.hasAccount': 'Déjà inscrit ?',
      'register.signIn': 'Se connecter',
      'register.companyRequired': 'Indiquez votre entreprise',

      'dashboard.title': 'Tableau de bord',
      'dashboard.editProfile': 'Modifier mon profil',
      'dashboard.myCourses': 'Mes cours',
      'dashboard.browseCatalog': 'Parcourir le catalogue',
      'dashboard.noCourses': 'Aucun cours pour le moment.',
      'dashboard.admin': 'Administration',
      'dashboard.adminPanel': "Panneau d'administration",
      'dashboard.adminHint': "Gérez les utilisateurs, les rôles et l'ensemble des cours de la plateforme.",
      'dashboard.instructorCourses': 'Mes formations (formateur)',
      'dashboard.manageCourses': 'Gérer mes cours',
      'dashboard.replacements': 'Remplacements',
      'dashboard.replacementsHint': "Indiquez les jours de votre planning pour lesquels vous aurez besoin d'un remplaçant. L'administrateur pourra ensuite assigner un formateur sur ces dates.",
      'dashboard.welcome': 'Bienvenue, {name} — profil : {roles}',

      'courses.title': 'Catalogue des cours',
      'courses.newCourse': '+ Nouveau cours',
      'courses.createTitle': 'Créer un cours',
      'courses.subject': 'Sujet',
      'courses.courseTitle': 'Titre',
      'courses.description': 'Description',
      'courses.create': 'Créer',
      'courses.cancel': 'Annuler',

      'course.loading': 'Chargement…',
      'course.materials': 'Matériel de formation',
      'course.modules': 'Modules',
      'course.addModule': '+ Module',
      'course.evaluation': 'Évaluation de la formation',
      'course.evaluationHint': 'Votre avis nous aide à améliorer les prochaines sessions. Le formulaire s’ouvre dans un nouvel onglet.',
      'course.evaluationOpen': "Ouvrir le formulaire d’évaluation",
      'course.enrollBanner': 'Cette formation vous sera assignée par votre administrateur.',
      'course.noModules': 'Aucun module pour le moment',
      'course.save': 'Enregistrer',
      'course.cancel': 'Annuler',

      'material.slides': 'Slides',
      'material.videos': 'Vidéos',
      'material.docs': 'Documents',
      'material.labs': 'Labs',
      'material.slide': 'slide',
      'material.slidesPlural': 'slides',
      'material.video': 'vidéo',
      'material.videosPlural': 'vidéos',
      'material.doc': 'document',
      'material.docsPlural': 'documents',
      'material.lab': 'lab',
      'material.labsPlural': 'labs',
      'material.view': 'Consulter',
      'material.download': 'Télécharger',
      'material.addSection': '+ Section',
      'material.manageSections': 'Gérer les sections',
      'material.add': '+ Ajouter',
      'material.import': 'Importer',
      'material.consulted': '{n}/{total} consulté{s}',
      'material.unassigned': 'Non assigné',
      'material.emptySection': 'Aucun élément dans cette section.',

      'profile.title': 'Mon profil',
      'profile.intro': 'Personnalisez votre avatar et rédigez une présentation visible par les autres membres du LMS.',
      'profile.avatarSource': "Source de l'avatar",
      'profile.modeAuto': 'Automatique',
      'profile.modeAutoDesc': ' — Gravatar si disponible, sinon avatar générique',
      'profile.modeGravatar': 'Gravatar',
      'profile.modeGravatarDesc': ' — Utiliser mon Gravatar (gravatar.com)',
      'profile.modeGeneric': 'Avatar générique',
      'profile.modeGenericDesc': ' — Choisir parmi la liste ci-dessous',
      'profile.generics': 'Avatars génériques',
      'profile.genericsHint': "Sélectionnez un avatar si vous n'avez pas de Gravatar ou si vous préférez un style fixe.",
      'profile.saveAvatar': "Enregistrer l'avatar",
      'profile.bio': 'Présentation',
      'profile.bioHint': "Décrivez votre parcours, vos compétences ou vos centres d'intérêt. Vous pouvez mettre du texte en forme, ajouter des liens et insérer des images.",
      'profile.saveBio': 'Enregistrer la présentation',
      'profile.yourAvatar': 'Votre avatar',

      'admin.title': 'Administration',
      'admin.subtitle': "Vue d'ensemble de la plateforme",
      'admin.newUser': '+ Nouvel utilisateur',
      'admin.loading': 'Chargement des données…',
      'admin.menu': 'Menu',
      'admin.group.general': 'Général',
      'admin.group.communication': 'Communication',
      'admin.group.accounts': 'Comptes',
      'admin.group.catalog': 'Catalogue',
      'admin.nav.overview': "Vue d'ensemble",
      'admin.nav.mail': 'Configuration e-mail',
      'admin.nav.newsletter': 'Newsletter',
      'admin.nav.learnersPending': 'Apprenants en attente',
      'admin.nav.instructorsPending': 'Formateurs en attente',
      'admin.nav.users': 'Utilisateurs',
      'admin.nav.courses': 'Formations',
      'admin.overview.hint': 'Indicateurs clés et accès rapide aux autres espaces.',
      'admin.quick.mail': 'Configuration e-mail',
      'admin.quick.mailDesc': 'Microsoft 365 / Graph API',
      'admin.quick.newsletter': 'Newsletter',
      'admin.quick.newsletterDesc': 'Annoncer les nouvelles formations',
      'admin.quick.users': 'Utilisateurs',
      'admin.quick.usersDesc': 'Rôles, validations et inscriptions',
      'admin.quick.courses': 'Formations',
      'admin.quick.coursesDesc': 'Sessions et fréquentation',
      'admin.panel.overview': "Vue d'ensemble de la plateforme",
      'admin.panel.mail': 'Paramètres Microsoft 365 / Graph API',
      'admin.panel.newsletter': 'Annoncer les nouvelles formations',
      'admin.panel.learners': 'Comptes apprenants à valider',
      'admin.panel.instructors': 'Comptes formateurs à valider',
      'admin.panel.users': 'Gestion des comptes et des rôles',
      'admin.panel.courses': 'Catalogue, sessions et fréquentation',
      'admin.validate': 'Valider',
      'admin.validateAssign': 'Valider et assigner',

      'sidebar.dashboard': 'Tableau de bord',
      'sidebar.catalog': 'Catalogue des cours',
      'sidebar.examSim': "Simulation d'examens",
      'sidebar.myTrainings': 'Mes formations',
      'sidebar.myTrainingsMonth': 'Mes formations ce mois',
      'sidebar.coursesOnDay': 'Cours du {date}',
      'sidebar.timezone': 'Fuseau',
      'sidebar.timezoneTitle': 'Choisir le fuseau horaire',
      'sidebar.weather': 'Météo locale',
      'sidebar.calendar': 'Calendrier des formations',
      'sidebar.prevMonth': 'Mois précédent',
      'sidebar.nextMonth': 'Mois suivant',
      'sidebar.empty': 'Aucune formation assignée pour le moment.',
      'sidebar.noCourseDay': 'Aucun cours à cette date.',
      'sidebar.noCourseMonth': 'Aucune session planifiée ce mois-ci.',
      'sidebar.permanentAccess': 'Accès permanent',
      'sidebar.enrolled': 'Inscrit',
      'sidebar.teacher': 'Formateur',
      'sidebar.notEnrolled': 'Non inscrit',
      'sidebar.enrollmentRequired': 'Inscription requise',
      'sidebar.status.completed': 'Terminée — accès conservé',
      'sidebar.status.active': 'En cours',
      'sidebar.status.upcoming': 'À venir',
      'sidebar.status.teaching': 'Formateur',
      'sidebar.status.permanent': 'Accès permanent',
      'sidebar.avatarOf': 'Avatar de {name}',
      'sidebar.yourAvatar': 'Votre avatar',
      'sidebar.weekdays': 'L,M,M,J,V,S,D',

      'weather.title': 'Météo locale',
      'weather.promptText': 'Autorisez votre position pour afficher la météo actuelle.',
      'weather.enableGps': 'Autoriser ma position',
      'weather.approx': 'Position approximative',
      'weather.loading': 'Localisation et chargement en cours…',
      'weather.refreshing': 'Actualisation de la météo…',
      'weather.estimating': 'Estimation de votre position…',
      'weather.retry': 'Réessayer',
      'weather.refreshTitle': 'Actualiser la météo',
      'weather.feelsLike': 'Ressenti {n}°',
      'weather.humidity': 'Humidité {n}%',
      'weather.wind': 'Vent {n} km/h',
      'weather.approxHint': ' · approx.',
      'weather.currentPosition': 'Position actuelle',
      'weather.placeNotFound': 'Lieu introuvable',
      'weather.unavailable': 'Météo indisponible',
      'weather.incomplete': 'Données météo incomplètes',
      'weather.loadError': 'Impossible de charger la météo.',
      'weather.geoUnavailable': 'Impossible d\'obtenir votre position.',
      'weather.geoDenied': 'Accès GPS refusé ou indisponible. Utilisez la position approximative ou autorisez la localisation dans les paramètres du navigateur.',
      'weather.geoMissing': 'Position indisponible. Réessayez ou utilisez la position approximative.',
      'weather.geoTimeout': 'Délai dépassé pour obtenir votre position.',
      'weather.loginRequired': 'Connectez-vous pour afficher la météo.',
      'weather.approxUnavailable': 'Position approximative indisponible pour le moment.',
      'weather.wmo.0': 'Ciel dégagé',
      'weather.wmo.1': 'Peu nuageux',
      'weather.wmo.2': 'Partiellement nuageux',
      'weather.wmo.3': 'Couvert',
      'weather.wmo.45': 'Brouillard',
      'weather.wmo.48': 'Brouillard givrant',
      'weather.wmo.51': 'Bruine légère',
      'weather.wmo.53': 'Bruine',
      'weather.wmo.55': 'Bruine dense',
      'weather.wmo.56': 'Bruine verglaçante',
      'weather.wmo.57': 'Bruine verglaçante dense',
      'weather.wmo.61': 'Pluie faible',
      'weather.wmo.63': 'Pluie modérée',
      'weather.wmo.65': 'Pluie forte',
      'weather.wmo.66': 'Pluie verglaçante',
      'weather.wmo.67': 'Pluie verglaçante forte',
      'weather.wmo.71': 'Neige faible',
      'weather.wmo.73': 'Neige modérée',
      'weather.wmo.75': 'Neige forte',
      'weather.wmo.77': 'Grains de neige',
      'weather.wmo.80': 'Averses faibles',
      'weather.wmo.81': 'Averses modérées',
      'weather.wmo.82': 'Averses fortes',
      'weather.wmo.85': 'Averses de neige',
      'weather.wmo.86': 'Fortes averses de neige',
      'weather.wmo.95': 'Orage',
      'weather.wmo.96': 'Orage avec grêle',
      'weather.wmo.99': 'Orage violent',
      'weather.wmo.default': 'Conditions variables',

      'footer.default': 'LMS-Educator — Base de données, authentification et gestion des cours actives',
    },

    en: {
      'lang.label': 'Language',
      'nav.courses': 'Courses',
      'nav.dashboard': 'Dashboard',
      'nav.admin': 'Administration',
      'nav.login': 'Log in',
      'nav.register': 'Sign up',
      'nav.logout': 'Log out',
      'nav.profile': 'My profile',
      'nav.createAccount': 'Create an account',

      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.add': 'Add',
      'common.create': 'Create',
      'common.loading': 'Loading…',
      'common.view': 'View',
      'common.download': 'Download',
      'common.open': 'Open',
      'common.back': 'Back',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.close': 'Close',
      'common.import': 'Import',
      'common.section': 'Section',
      'common.manageSections': 'Manage sections',
      'common.viewed': '✓ Seen',
      'common.principal': 'primary',
      'common.substitute': 'substitute',

      'role.learner': 'Learner',
      'role.instructor': 'Instructor',
      'role.admin': 'Administrator',

      'home.heroTitle': 'Your personalized learning platform',
      'home.heroText': 'Manage your courses, track learner progress and deliver training content.',
      'home.ctaStart': 'Get started',
      'home.ctaCourses': 'Browse courses',
      'home.viewAllSubjects': 'View all subjects',

      'login.title': 'Log in',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.submit': 'Log in',
      'login.noAccount': 'No account yet?',
      'login.signUp': 'Sign up',
      'login.sessionExpired': 'Your session has expired or was reset. Please log in again.',

      'register.title': 'Create an account',
      'register.firstName': 'First name',
      'register.lastName': 'Last name',
      'register.email': 'Email',
      'register.company': 'Company',
      'register.companyHint': 'Required for learners — enter the company for which you are taking the training.',
      'register.companyPlaceholder': 'Your company name',
      'register.password': 'Password',
      'register.profile': 'Profile',
      'register.roleLearner': 'Learner',
      'register.roleInstructor': 'Instructor (admin approval required)',
      'register.instructorHint': 'Instructor registrations must be approved by an administrator who will assign the courses to teach.',
      'register.submit': 'Sign up',
      'register.hasAccount': 'Already registered?',
      'register.signIn': 'Log in',
      'register.companyRequired': 'Please enter your company',

      'dashboard.title': 'Dashboard',
      'dashboard.editProfile': 'Edit my profile',
      'dashboard.myCourses': 'My courses',
      'dashboard.browseCatalog': 'Browse catalog',
      'dashboard.noCourses': 'No courses yet.',
      'dashboard.admin': 'Administration',
      'dashboard.adminPanel': 'Admin panel',
      'dashboard.adminHint': 'Manage users, roles and all courses on the platform.',
      'dashboard.instructorCourses': 'My trainings (instructor)',
      'dashboard.manageCourses': 'Manage my courses',
      'dashboard.replacements': 'Replacements',
      'dashboard.replacementsHint': 'Select the days in your schedule for which you need a substitute. An administrator can then assign an instructor for those dates.',
      'dashboard.welcome': 'Welcome, {name} — profile: {roles}',

      'courses.title': 'Course catalog',
      'courses.newCourse': '+ New course',
      'courses.createTitle': 'Create a course',
      'courses.subject': 'Subject',
      'courses.courseTitle': 'Title',
      'courses.description': 'Description',
      'courses.create': 'Create',
      'courses.cancel': 'Cancel',

      'course.loading': 'Loading…',
      'course.materials': 'Training materials',
      'course.modules': 'Modules',
      'course.addModule': '+ Module',
      'course.evaluation': 'Training evaluation',
      'course.evaluationHint': 'Your feedback helps us improve future sessions. The form opens in a new tab.',
      'course.evaluationOpen': 'Open evaluation form',
      'course.enrollBanner': 'This training will be assigned to you by your administrator.',
      'course.noModules': 'No modules yet',
      'course.save': 'Save',
      'course.cancel': 'Cancel',

      'material.slides': 'Slides',
      'material.videos': 'Videos',
      'material.docs': 'Documents',
      'material.labs': 'Labs',
      'material.slide': 'slide',
      'material.slidesPlural': 'slides',
      'material.video': 'video',
      'material.videosPlural': 'videos',
      'material.doc': 'document',
      'material.docsPlural': 'documents',
      'material.lab': 'lab',
      'material.labsPlural': 'labs',
      'material.view': 'View',
      'material.download': 'Download',
      'material.addSection': '+ Section',
      'material.manageSections': 'Manage sections',
      'material.add': '+ Add',
      'material.import': 'Import',
      'material.consulted': '{n}/{total} viewed',
      'material.unassigned': 'Unassigned',
      'material.emptySection': 'No items in this section.',

      'profile.title': 'My profile',
      'profile.intro': 'Customize your avatar and write a bio visible to other LMS members.',
      'profile.avatarSource': 'Avatar source',
      'profile.modeAuto': 'Automatic',
      'profile.modeAutoDesc': ' — Gravatar if available, otherwise a generic avatar',
      'profile.modeGravatar': 'Gravatar',
      'profile.modeGravatarDesc': ' — Use my Gravatar (gravatar.com)',
      'profile.modeGeneric': 'Generic avatar',
      'profile.modeGenericDesc': ' — Choose from the list below',
      'profile.generics': 'Generic avatars',
      'profile.genericsHint': 'Select an avatar if you do not have a Gravatar or prefer a fixed style.',
      'profile.saveAvatar': 'Save avatar',
      'profile.bio': 'Bio',
      'profile.bioHint': 'Describe your background, skills or interests. You can format text, add links and insert images.',
      'profile.saveBio': 'Save bio',
      'profile.yourAvatar': 'Your avatar',

      'admin.title': 'Administration',
      'admin.subtitle': 'Platform overview',
      'admin.newUser': '+ New user',
      'admin.loading': 'Loading data…',
      'admin.menu': 'Menu',
      'admin.group.general': 'General',
      'admin.group.communication': 'Communication',
      'admin.group.accounts': 'Accounts',
      'admin.group.catalog': 'Catalog',
      'admin.nav.overview': 'Overview',
      'admin.nav.mail': 'Email settings',
      'admin.nav.newsletter': 'Newsletter',
      'admin.nav.learnersPending': 'Pending learners',
      'admin.nav.instructorsPending': 'Pending instructors',
      'admin.nav.users': 'Users',
      'admin.nav.courses': 'Trainings',
      'admin.overview.hint': 'Key indicators and quick access to other areas.',
      'admin.quick.mail': 'Email settings',
      'admin.quick.mailDesc': 'Microsoft 365 / Graph API',
      'admin.quick.newsletter': 'Newsletter',
      'admin.quick.newsletterDesc': 'Announce new trainings',
      'admin.quick.users': 'Users',
      'admin.quick.usersDesc': 'Roles, approvals and enrollments',
      'admin.quick.courses': 'Trainings',
      'admin.quick.coursesDesc': 'Sessions and attendance',
      'admin.panel.overview': 'Platform overview',
      'admin.panel.mail': 'Microsoft 365 / Graph API settings',
      'admin.panel.newsletter': 'Announce new trainings',
      'admin.panel.learners': 'Learner accounts to approve',
      'admin.panel.instructors': 'Instructor accounts to approve',
      'admin.panel.users': 'Account and role management',
      'admin.panel.courses': 'Catalog, sessions and attendance',
      'admin.validate': 'Approve',
      'admin.validateAssign': 'Approve and assign',

      'sidebar.dashboard': 'Dashboard',
      'sidebar.catalog': 'Course catalog',
      'sidebar.examSim': 'Exam simulation',
      'sidebar.myTrainings': 'My trainings',
      'sidebar.myTrainingsMonth': 'My trainings this month',
      'sidebar.coursesOnDay': 'Courses on {date}',
      'sidebar.timezone': 'Timezone',
      'sidebar.timezoneTitle': 'Choose timezone',
      'sidebar.weather': 'Local weather',
      'sidebar.calendar': 'Training calendar',
      'sidebar.prevMonth': 'Previous month',
      'sidebar.nextMonth': 'Next month',
      'sidebar.empty': 'No training assigned yet.',
      'sidebar.noCourseDay': 'No courses on this date.',
      'sidebar.noCourseMonth': 'No sessions planned this month.',
      'sidebar.permanentAccess': 'Permanent access',
      'sidebar.enrolled': 'Enrolled',
      'sidebar.teacher': 'Instructor',
      'sidebar.notEnrolled': 'Not enrolled',
      'sidebar.enrollmentRequired': 'Enrollment required',
      'sidebar.status.completed': 'Completed — access retained',
      'sidebar.status.active': 'In progress',
      'sidebar.status.upcoming': 'Upcoming',
      'sidebar.status.teaching': 'Instructor',
      'sidebar.status.permanent': 'Permanent access',
      'sidebar.avatarOf': 'Avatar of {name}',
      'sidebar.yourAvatar': 'Your avatar',
      'sidebar.weekdays': 'M,T,W,T,F,S,S',

      'weather.title': 'Local weather',
      'weather.promptText': 'Allow your location to show the current weather.',
      'weather.enableGps': 'Allow my location',
      'weather.approx': 'Approximate location',
      'weather.loading': 'Locating and loading…',
      'weather.refreshing': 'Refreshing weather…',
      'weather.estimating': 'Estimating your location…',
      'weather.retry': 'Try again',
      'weather.refreshTitle': 'Refresh weather',
      'weather.feelsLike': 'Feels like {n}°',
      'weather.humidity': 'Humidity {n}%',
      'weather.wind': 'Wind {n} km/h',
      'weather.approxHint': ' · approx.',
      'weather.currentPosition': 'Current location',
      'weather.placeNotFound': 'Place not found',
      'weather.unavailable': 'Weather unavailable',
      'weather.incomplete': 'Incomplete weather data',
      'weather.loadError': 'Unable to load weather.',
      'weather.geoUnavailable': 'Unable to get your location.',
      'weather.geoDenied': 'GPS access denied or unavailable. Use approximate location or allow location in your browser settings.',
      'weather.geoMissing': 'Location unavailable. Try again or use approximate location.',
      'weather.geoTimeout': 'Timed out while getting your location.',
      'weather.loginRequired': 'Sign in to show the weather.',
      'weather.approxUnavailable': 'Approximate location unavailable for now.',
      'weather.wmo.0': 'Clear sky',
      'weather.wmo.1': 'Mainly clear',
      'weather.wmo.2': 'Partly cloudy',
      'weather.wmo.3': 'Overcast',
      'weather.wmo.45': 'Fog',
      'weather.wmo.48': 'Depositing rime fog',
      'weather.wmo.51': 'Light drizzle',
      'weather.wmo.53': 'Drizzle',
      'weather.wmo.55': 'Dense drizzle',
      'weather.wmo.56': 'Freezing drizzle',
      'weather.wmo.57': 'Dense freezing drizzle',
      'weather.wmo.61': 'Slight rain',
      'weather.wmo.63': 'Moderate rain',
      'weather.wmo.65': 'Heavy rain',
      'weather.wmo.66': 'Freezing rain',
      'weather.wmo.67': 'Heavy freezing rain',
      'weather.wmo.71': 'Slight snow',
      'weather.wmo.73': 'Moderate snow',
      'weather.wmo.75': 'Heavy snow',
      'weather.wmo.77': 'Snow grains',
      'weather.wmo.80': 'Slight showers',
      'weather.wmo.81': 'Moderate showers',
      'weather.wmo.82': 'Violent showers',
      'weather.wmo.85': 'Snow showers',
      'weather.wmo.86': 'Heavy snow showers',
      'weather.wmo.95': 'Thunderstorm',
      'weather.wmo.96': 'Thunderstorm with hail',
      'weather.wmo.99': 'Severe thunderstorm',
      'weather.wmo.default': 'Variable conditions',

      'footer.default': 'LMS-Educator — Database, authentication and course management active',
    },

    it: {
      'lang.label': 'Lingua',
      'nav.courses': 'Corsi',
      'nav.dashboard': 'Dashboard',
      'nav.admin': 'Amministrazione',
      'nav.login': 'Accedi',
      'nav.register': 'Registrati',
      'nav.logout': 'Esci',
      'nav.profile': 'Il mio profilo',
      'nav.createAccount': 'Crea un account',

      'common.save': 'Salva',
      'common.cancel': 'Annulla',
      'common.edit': 'Modifica',
      'common.delete': 'Elimina',
      'common.add': 'Aggiungi',
      'common.create': 'Crea',
      'common.loading': 'Caricamento…',
      'common.view': 'Consulta',
      'common.download': 'Scarica',
      'common.open': 'Apri',
      'common.back': 'Indietro',
      'common.yes': 'Sì',
      'common.no': 'No',
      'common.close': 'Chiudi',
      'common.import': 'Importa',
      'common.section': 'Sezione',
      'common.manageSections': 'Gestisci sezioni',
      'common.viewed': '✓ Visto',
      'common.principal': 'principale',
      'common.substitute': 'sostituto',

      'role.learner': 'Discente',
      'role.instructor': 'Formatore',
      'role.admin': 'Amministratore',

      'home.heroTitle': 'La tua piattaforma di apprendimento personalizzata',
      'home.heroText': 'Gestisci i corsi, monitora i progressi dei discenti e distribuisci i contenuti formativi.',
      'home.ctaStart': 'Inizia',
      'home.ctaCourses': 'Vedi i corsi',
      'home.viewAllSubjects': 'Vedi tutti gli argomenti',

      'login.title': 'Accesso',
      'login.email': 'Email',
      'login.password': 'Password',
      'login.submit': 'Accedi',
      'login.noAccount': 'Non hai ancora un account?',
      'login.signUp': 'Registrati',
      'login.sessionExpired': 'La sessione è scaduta o è stata reimpostata. Accedi di nuovo.',

      'register.title': 'Crea un account',
      'register.firstName': 'Nome',
      'register.lastName': 'Cognome',
      'register.email': 'Email',
      'register.company': 'Azienda',
      'register.companyHint': "Obbligatorio per i discenti — indica l'azienda per cui segui la formazione.",
      'register.companyPlaceholder': 'Nome della tua azienda',
      'register.password': 'Password',
      'register.profile': 'Profilo',
      'register.roleLearner': 'Discente',
      'register.roleInstructor': 'Formatore (approvazione admin richiesta)',
      'register.instructorHint': "Le iscrizioni dei formatori devono essere approvate da un amministratore che assegnerà i corsi da insegnare.",
      'register.submit': 'Registrati',
      'register.hasAccount': 'Già registrato?',
      'register.signIn': 'Accedi',
      'register.companyRequired': "Indica la tua azienda",

      'dashboard.title': 'Dashboard',
      'dashboard.editProfile': 'Modifica il mio profilo',
      'dashboard.myCourses': 'I miei corsi',
      'dashboard.browseCatalog': 'Sfoglia il catalogo',
      'dashboard.noCourses': 'Nessun corso al momento.',
      'dashboard.admin': 'Amministrazione',
      'dashboard.adminPanel': 'Pannello di amministrazione',
      'dashboard.adminHint': 'Gestisci utenti, ruoli e tutti i corsi della piattaforma.',
      'dashboard.instructorCourses': 'Le mie formazioni (formatore)',
      'dashboard.manageCourses': 'Gestisci i miei corsi',
      'dashboard.replacements': 'Sostituzioni',
      'dashboard.replacementsHint': "Indica i giorni del tuo planning per cui ti serve un sostituto. L'amministratore potrà poi assegnare un formatore in quelle date.",
      'dashboard.welcome': 'Benvenuto/a, {name} — profilo: {roles}',

      'courses.title': 'Catalogo dei corsi',
      'courses.newCourse': '+ Nuovo corso',
      'courses.createTitle': 'Crea un corso',
      'courses.subject': 'Argomento',
      'courses.courseTitle': 'Titolo',
      'courses.description': 'Descrizione',
      'courses.create': 'Crea',
      'courses.cancel': 'Annulla',

      'course.loading': 'Caricamento…',
      'course.materials': 'Materiale didattico',
      'course.modules': 'Moduli',
      'course.addModule': '+ Modulo',
      'course.evaluation': 'Valutazione della formazione',
      'course.evaluationHint': 'Il tuo feedback ci aiuta a migliorare le sessioni future. Il modulo si apre in una nuova scheda.',
      'course.evaluationOpen': 'Apri il modulo di valutazione',
      'course.enrollBanner': 'Questa formazione ti sarà assegnata dal tuo amministratore.',
      'course.noModules': 'Nessun modulo al momento',
      'course.save': 'Salva',
      'course.cancel': 'Annulla',

      'material.slides': 'Slide',
      'material.videos': 'Video',
      'material.docs': 'Documenti',
      'material.labs': 'Lab',
      'material.slide': 'slide',
      'material.slidesPlural': 'slide',
      'material.video': 'video',
      'material.videosPlural': 'video',
      'material.doc': 'documento',
      'material.docsPlural': 'documenti',
      'material.lab': 'lab',
      'material.labsPlural': 'lab',
      'material.view': 'Consulta',
      'material.download': 'Scarica',
      'material.addSection': '+ Sezione',
      'material.manageSections': 'Gestisci sezioni',
      'material.add': '+ Aggiungi',
      'material.import': 'Importa',
      'material.consulted': '{n}/{total} consultati',
      'material.unassigned': 'Non assegnato',
      'material.emptySection': 'Nessun elemento in questa sezione.',

      'profile.title': 'Il mio profilo',
      'profile.intro': 'Personalizza il tuo avatar e scrivi una presentazione visibile agli altri membri del LMS.',
      'profile.avatarSource': "Fonte dell'avatar",
      'profile.modeAuto': 'Automatico',
      'profile.modeAutoDesc': ' — Gravatar se disponibile, altrimenti avatar generico',
      'profile.modeGravatar': 'Gravatar',
      'profile.modeGravatarDesc': ' — Usa il mio Gravatar (gravatar.com)',
      'profile.modeGeneric': 'Avatar generico',
      'profile.modeGenericDesc': ' — Scegli dall’elenco qui sotto',
      'profile.generics': 'Avatar generici',
      'profile.genericsHint': 'Seleziona un avatar se non hai Gravatar o preferisci uno stile fisso.',
      'profile.saveAvatar': "Salva l'avatar",
      'profile.bio': 'Presentazione',
      'profile.bioHint': 'Descrivi il tuo percorso, le competenze o gli interessi. Puoi formattare il testo, aggiungere link e inserire immagini.',
      'profile.saveBio': 'Salva la presentazione',
      'profile.yourAvatar': 'Il tuo avatar',

      'admin.title': 'Amministrazione',
      'admin.subtitle': "Panoramica della piattaforma",
      'admin.newUser': '+ Nuovo utente',
      'admin.loading': 'Caricamento dati…',
      'admin.menu': 'Menu',
      'admin.group.general': 'Generale',
      'admin.group.communication': 'Comunicazione',
      'admin.group.accounts': 'Account',
      'admin.group.catalog': 'Catalogo',
      'admin.nav.overview': 'Panoramica',
      'admin.nav.mail': 'Configurazione e-mail',
      'admin.nav.newsletter': 'Newsletter',
      'admin.nav.learnersPending': 'Discenti in attesa',
      'admin.nav.instructorsPending': 'Formatori in attesa',
      'admin.nav.users': 'Utenti',
      'admin.nav.courses': 'Formazioni',
      'admin.overview.hint': 'Indicatori chiave e accesso rapido alle altre aree.',
      'admin.quick.mail': 'Configurazione e-mail',
      'admin.quick.mailDesc': 'Microsoft 365 / Graph API',
      'admin.quick.newsletter': 'Newsletter',
      'admin.quick.newsletterDesc': 'Annunciare le nuove formazioni',
      'admin.quick.users': 'Utenti',
      'admin.quick.usersDesc': 'Ruoli, convalide e iscrizioni',
      'admin.quick.courses': 'Formazioni',
      'admin.quick.coursesDesc': 'Sessioni e frequenza',
      'admin.panel.overview': 'Panoramica della piattaforma',
      'admin.panel.mail': 'Impostazioni Microsoft 365 / Graph API',
      'admin.panel.newsletter': 'Annunciare le nuove formazioni',
      'admin.panel.learners': 'Account discenti da approvare',
      'admin.panel.instructors': 'Account formatori da approvare',
      'admin.panel.users': 'Gestione account e ruoli',
      'admin.panel.courses': 'Catalogo, sessioni e frequenza',
      'admin.validate': 'Approva',
      'admin.validateAssign': 'Approva e assegna',

      'sidebar.dashboard': 'Dashboard',
      'sidebar.catalog': 'Catalogo dei corsi',
      'sidebar.examSim': 'Simulazione esami',
      'sidebar.myTrainings': 'Le mie formazioni',
      'sidebar.myTrainingsMonth': 'Le mie formazioni questo mese',
      'sidebar.coursesOnDay': 'Corsi del {date}',
      'sidebar.timezone': 'Fuso',
      'sidebar.timezoneTitle': 'Scegli il fuso orario',
      'sidebar.weather': 'Meteo locale',
      'sidebar.calendar': 'Calendario delle formazioni',
      'sidebar.prevMonth': 'Mese precedente',
      'sidebar.nextMonth': 'Mese successivo',
      'sidebar.empty': 'Nessuna formazione assegnata al momento.',
      'sidebar.noCourseDay': 'Nessun corso in questa data.',
      'sidebar.noCourseMonth': 'Nessuna sessione pianificata questo mese.',
      'sidebar.permanentAccess': 'Accesso permanente',
      'sidebar.enrolled': 'Iscritto',
      'sidebar.teacher': 'Formatore',
      'sidebar.notEnrolled': 'Non iscritto',
      'sidebar.enrollmentRequired': 'Iscrizione richiesta',
      'sidebar.status.completed': 'Completata — accesso mantenuto',
      'sidebar.status.active': 'In corso',
      'sidebar.status.upcoming': 'In arrivo',
      'sidebar.status.teaching': 'Formatore',
      'sidebar.status.permanent': 'Accesso permanente',
      'sidebar.avatarOf': 'Avatar di {name}',
      'sidebar.yourAvatar': 'Il tuo avatar',
      'sidebar.weekdays': 'L,M,M,G,V,S,D',

      'weather.title': 'Meteo locale',
      'weather.promptText': 'Autorizza la tua posizione per mostrare il meteo attuale.',
      'weather.enableGps': 'Autorizza la mia posizione',
      'weather.approx': 'Posizione approssimativa',
      'weather.loading': 'Localizzazione e caricamento in corso…',
      'weather.refreshing': 'Aggiornamento del meteo…',
      'weather.estimating': 'Stima della tua posizione…',
      'weather.retry': 'Riprova',
      'weather.refreshTitle': 'Aggiorna il meteo',
      'weather.feelsLike': 'Percepiti {n}°',
      'weather.humidity': 'Umidità {n}%',
      'weather.wind': 'Vento {n} km/h',
      'weather.approxHint': ' · approx.',
      'weather.currentPosition': 'Posizione attuale',
      'weather.placeNotFound': 'Luogo non trovato',
      'weather.unavailable': 'Meteo non disponibile',
      'weather.incomplete': 'Dati meteo incompleti',
      'weather.loadError': 'Impossibile caricare il meteo.',
      'weather.geoUnavailable': 'Impossibile ottenere la tua posizione.',
      'weather.geoDenied': 'Accesso GPS rifiutato o non disponibile. Usa la posizione approssimativa o autorizza la localizzazione nelle impostazioni del browser.',
      'weather.geoMissing': 'Posizione non disponibile. Riprova o usa la posizione approssimativa.',
      'weather.geoTimeout': 'Tempo scaduto per ottenere la tua posizione.',
      'weather.loginRequired': 'Accedi per visualizzare il meteo.',
      'weather.approxUnavailable': 'Posizione approssimativa non disponibile al momento.',
      'weather.wmo.0': 'Cielo sereno',
      'weather.wmo.1': 'Prevalentemente sereno',
      'weather.wmo.2': 'Parzialmente nuvoloso',
      'weather.wmo.3': 'Coperto',
      'weather.wmo.45': 'Nebbia',
      'weather.wmo.48': 'Nebbia gelata',
      'weather.wmo.51': 'Pioviggine leggera',
      'weather.wmo.53': 'Pioviggine',
      'weather.wmo.55': 'Pioviggine intensa',
      'weather.wmo.56': 'Pioviggine gelata',
      'weather.wmo.57': 'Pioviggine gelata intensa',
      'weather.wmo.61': 'Pioggia debole',
      'weather.wmo.63': 'Pioggia moderata',
      'weather.wmo.65': 'Pioggia forte',
      'weather.wmo.66': 'Pioggia gelata',
      'weather.wmo.67': 'Pioggia gelata forte',
      'weather.wmo.71': 'Neve debole',
      'weather.wmo.73': 'Neve moderata',
      'weather.wmo.75': 'Neve forte',
      'weather.wmo.77': 'Grani di neve',
      'weather.wmo.80': 'Rovesci deboli',
      'weather.wmo.81': 'Rovesci moderati',
      'weather.wmo.82': 'Rovesci forti',
      'weather.wmo.85': 'Rovesci di neve',
      'weather.wmo.86': 'Forti rovesci di neve',
      'weather.wmo.95': 'Temporale',
      'weather.wmo.96': 'Temporale con grandine',
      'weather.wmo.99': 'Temporale violento',
      'weather.wmo.default': 'Condizioni variabili',

      'footer.default': 'LMS-Educator — Database, autenticazione e gestione corsi attivi',
    },

    es: {
      'lang.label': 'Idioma',
      'nav.courses': 'Cursos',
      'nav.dashboard': 'Panel',
      'nav.admin': 'Administración',
      'nav.login': 'Iniciar sesión',
      'nav.register': 'Registrarse',
      'nav.logout': 'Cerrar sesión',
      'nav.profile': 'Mi perfil',
      'nav.createAccount': 'Crear una cuenta',

      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.edit': 'Editar',
      'common.delete': 'Eliminar',
      'common.add': 'Añadir',
      'common.create': 'Crear',
      'common.loading': 'Cargando…',
      'common.view': 'Consultar',
      'common.download': 'Descargar',
      'common.open': 'Abrir',
      'common.back': 'Volver',
      'common.yes': 'Sí',
      'common.no': 'No',
      'common.close': 'Cerrar',
      'common.import': 'Importar',
      'common.section': 'Sección',
      'common.manageSections': 'Gestionar secciones',
      'common.viewed': '✓ Visto',
      'common.principal': 'principal',
      'common.substitute': 'sustituto',

      'role.learner': 'Alumno',
      'role.instructor': 'Formador',
      'role.admin': 'Administrador',

      'home.heroTitle': 'Tu plataforma de aprendizaje personalizada',
      'home.heroText': 'Gestiona tus cursos, sigue el progreso de los alumnos y publica contenidos formativos.',
      'home.ctaStart': 'Empezar',
      'home.ctaCourses': 'Ver cursos',
      'home.viewAllSubjects': 'Ver todos los temas',

      'login.title': 'Iniciar sesión',
      'login.email': 'Correo electrónico',
      'login.password': 'Contraseña',
      'login.submit': 'Iniciar sesión',
      'login.noAccount': '¿Aún no tienes cuenta?',
      'login.signUp': 'Registrarse',
      'login.sessionExpired': 'Tu sesión ha caducado o se ha restablecido. Vuelve a iniciar sesión.',

      'register.title': 'Crear una cuenta',
      'register.firstName': 'Nombre',
      'register.lastName': 'Apellidos',
      'register.email': 'Correo electrónico',
      'register.company': 'Empresa',
      'register.companyHint': 'Obligatorio para alumnos — indica la empresa para la que realizas la formación.',
      'register.companyPlaceholder': 'Nombre de tu empresa',
      'register.password': 'Contraseña',
      'register.profile': 'Perfil',
      'register.roleLearner': 'Alumno',
      'register.roleInstructor': 'Formador (requiere validación del admin)',
      'register.instructorHint': 'Las altas de formador deben ser validadas por un administrador que asignará las formaciones a impartir.',
      'register.submit': 'Registrarse',
      'register.hasAccount': '¿Ya estás registrado?',
      'register.signIn': 'Iniciar sesión',
      'register.companyRequired': 'Indica tu empresa',

      'dashboard.title': 'Panel',
      'dashboard.editProfile': 'Editar mi perfil',
      'dashboard.myCourses': 'Mis cursos',
      'dashboard.browseCatalog': 'Explorar el catálogo',
      'dashboard.noCourses': 'Ningún curso por el momento.',
      'dashboard.admin': 'Administración',
      'dashboard.adminPanel': 'Panel de administración',
      'dashboard.adminHint': 'Gestiona usuarios, roles y todos los cursos de la plataforma.',
      'dashboard.instructorCourses': 'Mis formaciones (formador)',
      'dashboard.manageCourses': 'Gestionar mis cursos',
      'dashboard.replacements': 'Sustituciones',
      'dashboard.replacementsHint': 'Indica los días de tu planificación en los que necesitarás un sustituto. El administrador podrá asignar un formador en esas fechas.',
      'dashboard.welcome': 'Bienvenido/a, {name} — perfil: {roles}',

      'courses.title': 'Catálogo de cursos',
      'courses.newCourse': '+ Nuevo curso',
      'courses.createTitle': 'Crear un curso',
      'courses.subject': 'Tema',
      'courses.courseTitle': 'Título',
      'courses.description': 'Descripción',
      'courses.create': 'Crear',
      'courses.cancel': 'Cancelar',

      'course.loading': 'Cargando…',
      'course.materials': 'Material de formación',
      'course.modules': 'Módulos',
      'course.addModule': '+ Módulo',
      'course.evaluation': 'Evaluación de la formación',
      'course.evaluationHint': 'Tu opinión nos ayuda a mejorar las próximas sesiones. El formulario se abre en una nueva pestaña.',
      'course.evaluationOpen': 'Abrir el formulario de evaluación',
      'course.enrollBanner': 'Esta formación te la asignará tu administrador.',
      'course.noModules': 'Ningún módulo por el momento',
      'course.save': 'Guardar',
      'course.cancel': 'Cancelar',

      'material.slides': 'Diapositivas',
      'material.videos': 'Vídeos',
      'material.docs': 'Documentos',
      'material.labs': 'Labs',
      'material.slide': 'diapositiva',
      'material.slidesPlural': 'diapositivas',
      'material.video': 'vídeo',
      'material.videosPlural': 'vídeos',
      'material.doc': 'documento',
      'material.docsPlural': 'documentos',
      'material.lab': 'lab',
      'material.labsPlural': 'labs',
      'material.view': 'Consultar',
      'material.download': 'Descargar',
      'material.addSection': '+ Sección',
      'material.manageSections': 'Gestionar secciones',
      'material.add': '+ Añadir',
      'material.import': 'Importar',
      'material.consulted': '{n}/{total} consultados',
      'material.unassigned': 'Sin asignar',
      'material.emptySection': 'Ningún elemento en esta sección.',

      'profile.title': 'Mi perfil',
      'profile.intro': 'Personaliza tu avatar y escribe una presentación visible para los demás miembros del LMS.',
      'profile.avatarSource': 'Fuente del avatar',
      'profile.modeAuto': 'Automático',
      'profile.modeAutoDesc': ' — Gravatar si está disponible; si no, avatar genérico',
      'profile.modeGravatar': 'Gravatar',
      'profile.modeGravatarDesc': ' — Usar mi Gravatar (gravatar.com)',
      'profile.modeGeneric': 'Avatar genérico',
      'profile.modeGenericDesc': ' — Elegir de la lista siguiente',
      'profile.generics': 'Avatares genéricos',
      'profile.genericsHint': 'Selecciona un avatar si no tienes Gravatar o prefieres un estilo fijo.',
      'profile.saveAvatar': 'Guardar avatar',
      'profile.bio': 'Presentación',
      'profile.bioHint': 'Describe tu trayectoria, competencias o intereses. Puedes dar formato al texto, añadir enlaces e insertar imágenes.',
      'profile.saveBio': 'Guardar presentación',
      'profile.yourAvatar': 'Tu avatar',

      'admin.title': 'Administración',
      'admin.subtitle': 'Vista general de la plataforma',
      'admin.newUser': '+ Nuevo usuario',
      'admin.loading': 'Cargando datos…',
      'admin.menu': 'Menú',
      'admin.group.general': 'General',
      'admin.group.communication': 'Comunicación',
      'admin.group.accounts': 'Cuentas',
      'admin.group.catalog': 'Catálogo',
      'admin.nav.overview': 'Vista general',
      'admin.nav.mail': 'Configuración de correo',
      'admin.nav.newsletter': 'Boletín',
      'admin.nav.learnersPending': 'Alumnos pendientes',
      'admin.nav.instructorsPending': 'Formadores pendientes',
      'admin.nav.users': 'Usuarios',
      'admin.nav.courses': 'Formaciones',
      'admin.overview.hint': 'Indicadores clave y acceso rápido a otras áreas.',
      'admin.quick.mail': 'Configuración de correo',
      'admin.quick.mailDesc': 'Microsoft 365 / Graph API',
      'admin.quick.newsletter': 'Boletín',
      'admin.quick.newsletterDesc': 'Anunciar nuevas formaciones',
      'admin.quick.users': 'Usuarios',
      'admin.quick.usersDesc': 'Roles, validaciones e inscripciones',
      'admin.quick.courses': 'Formaciones',
      'admin.quick.coursesDesc': 'Sesiones y asistencia',
      'admin.panel.overview': 'Vista general de la plataforma',
      'admin.panel.mail': 'Ajustes Microsoft 365 / Graph API',
      'admin.panel.newsletter': 'Anunciar nuevas formaciones',
      'admin.panel.learners': 'Cuentas de alumnos por validar',
      'admin.panel.instructors': 'Cuentas de formadores por validar',
      'admin.panel.users': 'Gestión de cuentas y roles',
      'admin.panel.courses': 'Catálogo, sesiones y asistencia',
      'admin.validate': 'Validar',
      'admin.validateAssign': 'Validar y asignar',

      'sidebar.dashboard': 'Panel',
      'sidebar.catalog': 'Catálogo de cursos',
      'sidebar.examSim': 'Simulación de exámenes',
      'sidebar.myTrainings': 'Mis formaciones',
      'sidebar.myTrainingsMonth': 'Mis formaciones este mes',
      'sidebar.coursesOnDay': 'Cursos del {date}',
      'sidebar.timezone': 'Zona',
      'sidebar.timezoneTitle': 'Elegir zona horaria',
      'sidebar.weather': 'Tiempo local',
      'sidebar.calendar': 'Calendario de formaciones',
      'sidebar.prevMonth': 'Mes anterior',
      'sidebar.nextMonth': 'Mes siguiente',
      'sidebar.empty': 'Ninguna formación asignada por el momento.',
      'sidebar.noCourseDay': 'Ningún curso en esta fecha.',
      'sidebar.noCourseMonth': 'Ninguna sesión planificada este mes.',
      'sidebar.permanentAccess': 'Acceso permanente',
      'sidebar.enrolled': 'Inscrito',
      'sidebar.teacher': 'Formador',
      'sidebar.notEnrolled': 'No inscrito',
      'sidebar.enrollmentRequired': 'Inscripción requerida',
      'sidebar.status.completed': 'Terminada — acceso conservado',
      'sidebar.status.active': 'En curso',
      'sidebar.status.upcoming': 'Próxima',
      'sidebar.status.teaching': 'Formador',
      'sidebar.status.permanent': 'Acceso permanente',
      'sidebar.avatarOf': 'Avatar de {name}',
      'sidebar.yourAvatar': 'Tu avatar',
      'sidebar.weekdays': 'L,M,X,J,V,S,D',

      'weather.title': 'Tiempo local',
      'weather.promptText': 'Autorice su ubicación para mostrar el tiempo actual.',
      'weather.enableGps': 'Permitir mi ubicación',
      'weather.approx': 'Ubicación aproximada',
      'weather.loading': 'Localizando y cargando…',
      'weather.refreshing': 'Actualizando el tiempo…',
      'weather.estimating': 'Estimando su ubicación…',
      'weather.retry': 'Reintentar',
      'weather.refreshTitle': 'Actualizar el tiempo',
      'weather.feelsLike': 'Sensación {n}°',
      'weather.humidity': 'Humedad {n}%',
      'weather.wind': 'Viento {n} km/h',
      'weather.approxHint': ' · aprox.',
      'weather.currentPosition': 'Ubicación actual',
      'weather.placeNotFound': 'Lugar no encontrado',
      'weather.unavailable': 'Tiempo no disponible',
      'weather.incomplete': 'Datos meteorológicos incompletos',
      'weather.loadError': 'No se puede cargar el tiempo.',
      'weather.geoUnavailable': 'No se puede obtener su ubicación.',
      'weather.geoDenied': 'Acceso GPS denegado o no disponible. Use la ubicación aproximada o autorice la localización en la configuración del navegador.',
      'weather.geoMissing': 'Ubicación no disponible. Inténtelo de nuevo o use la ubicación aproximada.',
      'weather.geoTimeout': 'Tiempo de espera agotado al obtener su ubicación.',
      'weather.loginRequired': 'Inicie sesión para mostrar el tiempo.',
      'weather.approxUnavailable': 'Ubicación aproximada no disponible por el momento.',
      'weather.wmo.0': 'Cielo despejado',
      'weather.wmo.1': 'Mayormente despejado',
      'weather.wmo.2': 'Parcialmente nublado',
      'weather.wmo.3': 'Cubierto',
      'weather.wmo.45': 'Niebla',
      'weather.wmo.48': 'Niebla escarchada',
      'weather.wmo.51': 'Llovizna ligera',
      'weather.wmo.53': 'Llovizna',
      'weather.wmo.55': 'Llovizna densa',
      'weather.wmo.56': 'Llovizna helada',
      'weather.wmo.57': 'Llovizna helada densa',
      'weather.wmo.61': 'Lluvia débil',
      'weather.wmo.63': 'Lluvia moderada',
      'weather.wmo.65': 'Lluvia fuerte',
      'weather.wmo.66': 'Lluvia helada',
      'weather.wmo.67': 'Lluvia helada fuerte',
      'weather.wmo.71': 'Nieve débil',
      'weather.wmo.73': 'Nieve moderada',
      'weather.wmo.75': 'Nieve fuerte',
      'weather.wmo.77': 'Granos de nieve',
      'weather.wmo.80': 'Chubascos débiles',
      'weather.wmo.81': 'Chubascos moderados',
      'weather.wmo.82': 'Chubascos fuertes',
      'weather.wmo.85': 'Chubascos de nieve',
      'weather.wmo.86': 'Chubascos de nieve fuertes',
      'weather.wmo.95': 'Tormenta',
      'weather.wmo.96': 'Tormenta con granizo',
      'weather.wmo.99': 'Tormenta violenta',
      'weather.wmo.default': 'Condiciones variables',

      'footer.default': 'LMS-Educator — Base de datos, autenticación y gestión de cursos activas',
    },

    de: {
      'lang.label': 'Sprache',
      'nav.courses': 'Kurse',
      'nav.dashboard': 'Dashboard',
      'nav.admin': 'Administration',
      'nav.login': 'Anmelden',
      'nav.register': 'Registrieren',
      'nav.logout': 'Abmelden',
      'nav.profile': 'Mein Profil',
      'nav.createAccount': 'Konto erstellen',

      'common.save': 'Speichern',
      'common.cancel': 'Abbrechen',
      'common.edit': 'Bearbeiten',
      'common.delete': 'Löschen',
      'common.add': 'Hinzufügen',
      'common.create': 'Erstellen',
      'common.loading': 'Laden…',
      'common.view': 'Ansehen',
      'common.download': 'Herunterladen',
      'common.open': 'Öffnen',
      'common.back': 'Zurück',
      'common.yes': 'Ja',
      'common.no': 'Nein',
      'common.close': 'Schließen',
      'common.import': 'Importieren',
      'common.section': 'Abschnitt',
      'common.manageSections': 'Abschnitte verwalten',
      'common.viewed': '✓ Gesehen',
      'common.principal': 'Haupt',
      'common.substitute': 'Vertretung',

      'role.learner': 'Teilnehmer',
      'role.instructor': 'Trainer',
      'role.admin': 'Administrator',

      'home.heroTitle': 'Ihre personalisierte Lernplattform',
      'home.heroText': 'Verwalten Sie Kurse, verfolgen Sie den Fortschritt der Teilnehmer und stellen Sie Lerninhalte bereit.',
      'home.ctaStart': 'Starten',
      'home.ctaCourses': 'Kurse ansehen',
      'home.viewAllSubjects': 'Alle Themen anzeigen',

      'login.title': 'Anmeldung',
      'login.email': 'E-Mail',
      'login.password': 'Passwort',
      'login.submit': 'Anmelden',
      'login.noAccount': 'Noch kein Konto?',
      'login.signUp': 'Registrieren',
      'login.sessionExpired': 'Ihre Sitzung ist abgelaufen oder wurde zurückgesetzt. Bitte melden Sie sich erneut an.',

      'register.title': 'Konto erstellen',
      'register.firstName': 'Vorname',
      'register.lastName': 'Nachname',
      'register.email': 'E-Mail',
      'register.company': 'Unternehmen',
      'register.companyHint': 'Für Teilnehmer erforderlich — geben Sie das Unternehmen an, für das Sie die Schulung besuchen.',
      'register.companyPlaceholder': 'Name Ihres Unternehmens',
      'register.password': 'Passwort',
      'register.profile': 'Profil',
      'register.roleLearner': 'Teilnehmer',
      'register.roleInstructor': 'Trainer (Admin-Freigabe erforderlich)',
      'register.instructorHint': 'Trainer-Registrierungen müssen von einem Administrator freigegeben werden, der die zu unterrichtenden Schulungen zuweist.',
      'register.submit': 'Registrieren',
      'register.hasAccount': 'Bereits registriert?',
      'register.signIn': 'Anmelden',
      'register.companyRequired': 'Bitte geben Sie Ihr Unternehmen an',

      'dashboard.title': 'Dashboard',
      'dashboard.editProfile': 'Mein Profil bearbeiten',
      'dashboard.myCourses': 'Meine Kurse',
      'dashboard.browseCatalog': 'Katalog durchsuchen',
      'dashboard.noCourses': 'Derzeit keine Kurse.',
      'dashboard.admin': 'Administration',
      'dashboard.adminPanel': 'Administrationsbereich',
      'dashboard.adminHint': 'Verwalten Sie Benutzer, Rollen und alle Kurse der Plattform.',
      'dashboard.instructorCourses': 'Meine Schulungen (Trainer)',
      'dashboard.manageCourses': 'Meine Kurse verwalten',
      'dashboard.replacements': 'Vertretungen',
      'dashboard.replacementsHint': 'Geben Sie die Tage in Ihrem Plan an, für die Sie eine Vertretung brauchen. Der Administrator kann dann einen Trainer für diese Daten zuweisen.',
      'dashboard.welcome': 'Willkommen, {name} — Profil: {roles}',

      'courses.title': 'Kurskatalog',
      'courses.newCourse': '+ Neuer Kurs',
      'courses.createTitle': 'Kurs erstellen',
      'courses.subject': 'Thema',
      'courses.courseTitle': 'Titel',
      'courses.description': 'Beschreibung',
      'courses.create': 'Erstellen',
      'courses.cancel': 'Abbrechen',

      'course.loading': 'Laden…',
      'course.materials': 'Schulungsmaterial',
      'course.modules': 'Module',
      'course.addModule': '+ Modul',
      'course.evaluation': 'Schulungsbewertung',
      'course.evaluationHint': 'Ihr Feedback hilft uns, künftige Sitzungen zu verbessern. Das Formular öffnet sich in einem neuen Tab.',
      'course.evaluationOpen': 'Bewertungsformular öffnen',
      'course.enrollBanner': 'Diese Schulung wird Ihnen von Ihrem Administrator zugewiesen.',
      'course.noModules': 'Derzeit keine Module',
      'course.save': 'Speichern',
      'course.cancel': 'Abbrechen',

      'material.slides': 'Folien',
      'material.videos': 'Videos',
      'material.docs': 'Dokumente',
      'material.labs': 'Labs',
      'material.slide': 'Folie',
      'material.slidesPlural': 'Folien',
      'material.video': 'Video',
      'material.videosPlural': 'Videos',
      'material.doc': 'Dokument',
      'material.docsPlural': 'Dokumente',
      'material.lab': 'Lab',
      'material.labsPlural': 'Labs',
      'material.view': 'Ansehen',
      'material.download': 'Herunterladen',
      'material.addSection': '+ Abschnitt',
      'material.manageSections': 'Abschnitte verwalten',
      'material.add': '+ Hinzufügen',
      'material.import': 'Importieren',
      'material.consulted': '{n}/{total} angesehen',
      'material.unassigned': 'Nicht zugewiesen',
      'material.emptySection': 'Keine Elemente in diesem Abschnitt.',

      'profile.title': 'Mein Profil',
      'profile.intro': 'Passen Sie Ihren Avatar an und schreiben Sie eine Vorstellung, die für andere LMS-Mitglieder sichtbar ist.',
      'profile.avatarSource': 'Avatar-Quelle',
      'profile.modeAuto': 'Automatisch',
      'profile.modeAutoDesc': ' — Gravatar falls verfügbar, sonst generischer Avatar',
      'profile.modeGravatar': 'Gravatar',
      'profile.modeGravatarDesc': ' — Meinen Gravatar verwenden (gravatar.com)',
      'profile.modeGeneric': 'Generischer Avatar',
      'profile.modeGenericDesc': ' — Aus der Liste unten wählen',
      'profile.generics': 'Generische Avatare',
      'profile.genericsHint': 'Wählen Sie einen Avatar, wenn Sie keinen Gravatar haben oder einen festen Stil bevorzugen.',
      'profile.saveAvatar': 'Avatar speichern',
      'profile.bio': 'Vorstellung',
      'profile.bioHint': 'Beschreiben Sie Ihren Werdegang, Ihre Kompetenzen oder Interessen. Sie können Text formatieren, Links hinzufügen und Bilder einfügen.',
      'profile.saveBio': 'Vorstellung speichern',
      'profile.yourAvatar': 'Ihr Avatar',

      'admin.title': 'Administration',
      'admin.subtitle': 'Plattformübersicht',
      'admin.newUser': '+ Neuer Benutzer',
      'admin.loading': 'Daten werden geladen…',
      'admin.menu': 'Menü',
      'admin.group.general': 'Allgemein',
      'admin.group.communication': 'Kommunikation',
      'admin.group.accounts': 'Konten',
      'admin.group.catalog': 'Katalog',
      'admin.nav.overview': 'Übersicht',
      'admin.nav.mail': 'E-Mail-Konfiguration',
      'admin.nav.newsletter': 'Newsletter',
      'admin.nav.learnersPending': 'Ausstehende Teilnehmer',
      'admin.nav.instructorsPending': 'Ausstehende Trainer',
      'admin.nav.users': 'Benutzer',
      'admin.nav.courses': 'Schulungen',
      'admin.overview.hint': 'Kennzahlen und Schnellzugriff auf andere Bereiche.',
      'admin.quick.mail': 'E-Mail-Konfiguration',
      'admin.quick.mailDesc': 'Microsoft 365 / Graph API',
      'admin.quick.newsletter': 'Newsletter',
      'admin.quick.newsletterDesc': 'Neue Schulungen ankündigen',
      'admin.quick.users': 'Benutzer',
      'admin.quick.usersDesc': 'Rollen, Freigaben und Einschreibungen',
      'admin.quick.courses': 'Schulungen',
      'admin.quick.coursesDesc': 'Sitzungen und Anwesenheit',
      'admin.panel.overview': 'Plattformübersicht',
      'admin.panel.mail': 'Microsoft 365 / Graph API-Einstellungen',
      'admin.panel.newsletter': 'Neue Schulungen ankündigen',
      'admin.panel.learners': 'Teilnehmerkonten zur Freigabe',
      'admin.panel.instructors': 'Trainerkonten zur Freigabe',
      'admin.panel.users': 'Konten- und Rollenverwaltung',
      'admin.panel.courses': 'Katalog, Sitzungen und Anwesenheit',
      'admin.validate': 'Freigeben',
      'admin.validateAssign': 'Freigeben und zuweisen',

      'sidebar.dashboard': 'Dashboard',
      'sidebar.catalog': 'Kurskatalog',
      'sidebar.examSim': 'Prüfungssimulation',
      'sidebar.myTrainings': 'Meine Schulungen',
      'sidebar.myTrainingsMonth': 'Meine Schulungen diesen Monat',
      'sidebar.coursesOnDay': 'Kurse am {date}',
      'sidebar.timezone': 'Zeitzone',
      'sidebar.timezoneTitle': 'Zeitzone wählen',
      'sidebar.weather': 'Lokales Wetter',
      'sidebar.calendar': 'Schulungskalender',
      'sidebar.prevMonth': 'Vorheriger Monat',
      'sidebar.nextMonth': 'Nächster Monat',
      'sidebar.empty': 'Derzeit keine zugewiesene Schulung.',
      'sidebar.noCourseDay': 'Kein Kurs an diesem Datum.',
      'sidebar.noCourseMonth': 'Diesen Monat keine geplanten Sitzungen.',
      'sidebar.permanentAccess': 'Dauerhafter Zugriff',
      'sidebar.enrolled': 'Eingeschrieben',
      'sidebar.teacher': 'Trainer',
      'sidebar.notEnrolled': 'Nicht eingeschrieben',
      'sidebar.enrollmentRequired': 'Einschreibung erforderlich',
      'sidebar.status.completed': 'Abgeschlossen — Zugriff behalten',
      'sidebar.status.active': 'Laufend',
      'sidebar.status.upcoming': 'Bevorstehend',
      'sidebar.status.teaching': 'Trainer',
      'sidebar.status.permanent': 'Dauerhafter Zugriff',
      'sidebar.avatarOf': 'Avatar von {name}',
      'sidebar.yourAvatar': 'Ihr Avatar',
      'sidebar.weekdays': 'M,D,M,D,F,S,S',

      'weather.title': 'Lokales Wetter',
      'weather.promptText': 'Erlauben Sie Ihren Standort, um das aktuelle Wetter anzuzeigen.',
      'weather.enableGps': 'Meinen Standort erlauben',
      'weather.approx': 'Ungefährer Standort',
      'weather.loading': 'Standortbestimmung und Laden…',
      'weather.refreshing': 'Wetter wird aktualisiert…',
      'weather.estimating': 'Standort wird geschätzt…',
      'weather.retry': 'Erneut versuchen',
      'weather.refreshTitle': 'Wetter aktualisieren',
      'weather.feelsLike': 'Gefühlt {n}°',
      'weather.humidity': 'Luftfeuchtigkeit {n}%',
      'weather.wind': 'Wind {n} km/h',
      'weather.approxHint': ' · ca.',
      'weather.currentPosition': 'Aktueller Standort',
      'weather.placeNotFound': 'Ort nicht gefunden',
      'weather.unavailable': 'Wetter nicht verfügbar',
      'weather.incomplete': 'Unvollständige Wetterdaten',
      'weather.loadError': 'Wetter konnte nicht geladen werden.',
      'weather.geoUnavailable': 'Standort konnte nicht ermittelt werden.',
      'weather.geoDenied': 'GPS-Zugriff verweigert oder nicht verfügbar. Nutzen Sie den ungefähren Standort oder erlauben Sie die Ortung in den Browsereinstellungen.',
      'weather.geoMissing': 'Standort nicht verfügbar. Erneut versuchen oder ungefähren Standort nutzen.',
      'weather.geoTimeout': 'Zeitüberschreitung bei der Standortbestimmung.',
      'weather.loginRequired': 'Melden Sie sich an, um das Wetter anzuzeigen.',
      'weather.approxUnavailable': 'Ungefährer Standort derzeit nicht verfügbar.',
      'weather.wmo.0': 'Klarer Himmel',
      'weather.wmo.1': 'Überwiegend klar',
      'weather.wmo.2': 'Teilweise bewölkt',
      'weather.wmo.3': 'Bedeckt',
      'weather.wmo.45': 'Nebel',
      'weather.wmo.48': 'Reifnebel',
      'weather.wmo.51': 'Leichter Nieselregen',
      'weather.wmo.53': 'Nieselregen',
      'weather.wmo.55': 'Dichter Nieselregen',
      'weather.wmo.56': 'Gefrierender Nieselregen',
      'weather.wmo.57': 'Dichter gefrierender Nieselregen',
      'weather.wmo.61': 'Leichter Regen',
      'weather.wmo.63': 'Mäßiger Regen',
      'weather.wmo.65': 'Starker Regen',
      'weather.wmo.66': 'Gefrierender Regen',
      'weather.wmo.67': 'Starker gefrierender Regen',
      'weather.wmo.71': 'Leichter Schnee',
      'weather.wmo.73': 'Mäßiger Schnee',
      'weather.wmo.75': 'Starker Schnee',
      'weather.wmo.77': 'Schneegriesel',
      'weather.wmo.80': 'Leichte Schauer',
      'weather.wmo.81': 'Mäßige Schauer',
      'weather.wmo.82': 'Starke Schauer',
      'weather.wmo.85': 'Schneeschauer',
      'weather.wmo.86': 'Starke Schneeschauer',
      'weather.wmo.95': 'Gewitter',
      'weather.wmo.96': 'Gewitter mit Hagel',
      'weather.wmo.99': 'Schweres Gewitter',
      'weather.wmo.default': 'Wechselhafte Bedingungen',

      'footer.default': 'LMS-Educator — Datenbank, Authentifizierung und Kursverwaltung aktiv',
    },
  };

  let currentLocale = 'fr';

  function normalizeLocale(code) {
    if (!code) return null;
    const short = String(code).toLowerCase().slice(0, 2);
    return LOCALES.includes(short) ? short : null;
  }

  function detectLocale() {
    try {
      const saved = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) {}
    try {
      const nav = (navigator.language || navigator.userLanguage || 'fr').toLowerCase();
      const match = normalizeLocale(nav);
      if (match) return match;
    } catch (_) {}
    return 'fr';
  }

  function interpolate(template, vars) {
    if (!vars) return template;
    return String(template).replace(/\{(\w+)\}/g, (_, key) => (
      vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : `{${key}}`
    ));
  }

  function t(key, vars, fallback) {
    // Allow t(key, fallbackString) when vars omitted
    if (typeof vars === 'string' && fallback === undefined) {
      fallback = vars;
      vars = undefined;
    }
    const dict = STRINGS[currentLocale] || STRINGS.fr;
    const fr = STRINGS.fr[key];
    const value = dict[key] ?? fr ?? fallback;
    if (value === undefined || value === null) return key;
    return interpolate(value, vars);
  }

  function hasKey(key) {
    return !!(STRINGS[currentLocale]?.[key] ?? STRINGS.fr?.[key]);
  }

  function addTranslations(locale, entries) {
    const code = normalizeLocale(locale) || locale;
    if (!STRINGS[code]) STRINGS[code] = {};
    Object.assign(STRINGS[code], entries || {});
  }

  function subjectLabel(id, fallback) {
    return t(`subject.${id}.label`, fallback || id);
  }

  function subjectDescription(id, fallback) {
    return t(`subject.${id}.desc`, fallback || '');
  }

  function localizeSubject(subject) {
    if (!subject?.id) return subject;
    return {
      ...subject,
      label: subjectLabel(subject.id, subject.label),
      description: subjectDescription(subject.id, subject.description),
    };
  }

  function microsoftSubsectionLabel(id, fallback) {
    return t(`ms.sub.${id}.label`, fallback || id);
  }

  function microsoftSubsectionDescription(id, fallback) {
    return t(`ms.sub.${id}.desc`, fallback || '');
  }

  function microsoftLevelLabel(level, fallback) {
    return t(`ms.level.${level}`, fallback || level);
  }

  function localizeCourse(course) {
    if (!course) return course;
    const next = { ...course };
    if (course.subject) {
      next.subject_label = subjectLabel(course.subject, course.subject_label || course.subject);
    }
    if (course.cert_level) {
      next.cert_level_label = microsoftLevelLabel(course.cert_level, course.cert_level_label);
    }
    if (course.subsection) {
      next.subsection_label = microsoftSubsectionLabel(course.subsection, course.subsection_label);
    }
    const code = course.exam_code;
    if (code) {
      const descKey = `ms.course.${code}.desc`;
      if (hasKey(descKey)) next.description = t(descKey);
      const titleKey = `ms.course.${code}.title`;
      if (hasKey(titleKey)) {
        const official = t(titleKey);
        next.title = course.exam_code ? `${course.exam_code} — ${official}` : official;
      }
    }
    return next;
  }

  function setLocale(locale, { persist = true, apply = true } = {}) {
    const next = normalizeLocale(locale) || 'fr';
    const changed = next !== currentLocale;
    currentLocale = next;
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, currentLocale);
      } catch (_) {}
    }
    document.documentElement.lang = LOCALE_HTML[currentLocale] || currentLocale;
    const select = document.getElementById('lang-select');
    if (select && select.value !== currentLocale) select.value = currentLocale;
    if (apply) applyTranslations();
    if (changed) {
      document.dispatchEvent(new CustomEvent('lms:localechange', { detail: { locale: currentLocale } }));
    }
    return currentLocale;
  }

  function getLocale() {
    return currentLocale;
  }

  function getIntlLocale() {
    return LOCALE_INTL[currentLocale] || currentLocale;
  }

  function applyNode(el) {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const attr = el.getAttribute('data-i18n-attr');
    const text = t(key);
    if (attr) {
      attr.split(',').map((a) => a.trim()).filter(Boolean).forEach((name) => {
        if (name === 'html') el.innerHTML = text;
        else if (name === 'text') el.textContent = text;
        else el.setAttribute(name, text);
      });
      return;
    }
    if (el.hasAttribute('data-i18n-html')) {
      el.innerHTML = text;
      return;
    }
    el.textContent = text;
  }

  function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(applyNode);
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
    const pageTitle = document.body?.getAttribute('data-page-title-key');
    if (pageTitle && typeof applyBranding === 'function') {
      document.body.setAttribute('data-page-title', t(pageTitle));
      applyBranding();
    } else if (pageTitle) {
      const brand = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.brandName) || 'LMS-Educator';
      document.title = `${t(pageTitle)} — ${brand}`;
    }
  }

  function buildSwitcherHtml() {
    const options = LOCALES.map((code) => (
      `<option value="${code}"${code === currentLocale ? ' selected' : ''}>${LOCALE_LABELS[code]}</option>`
    )).join('');
    return `
      <div class="lang-switcher" id="lang-switcher">
        <label class="lang-switcher-label" for="lang-select" data-i18n="lang.label">${t('lang.label')}</label>
        <select id="lang-select" class="lang-select" aria-label="${t('lang.label')}">
          ${options}
        </select>
      </div>
    `;
  }

  function mountLanguageSwitcher() {
    if (document.getElementById('lang-switcher')) return;
    const header = document.querySelector('.header > .container');
    if (!header) return;

    const wrap = document.createElement('div');
    wrap.innerHTML = buildSwitcherHtml().trim();
    const switcher = wrap.firstElementChild;

    const nav = header.querySelector('nav');
    if (nav) {
      nav.insertBefore(switcher, nav.firstChild);
    } else {
      header.appendChild(switcher);
    }

    const select = switcher.querySelector('#lang-select');
    select.addEventListener('change', () => {
      setLocale(select.value);
    });
  }

  function init() {
    currentLocale = detectLocale();
    document.documentElement.lang = LOCALE_HTML[currentLocale] || currentLocale;
    mountLanguageSwitcher();
    applyTranslations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.I18n = {
    t,
    hasKey,
    addTranslations,
    setLocale,
    getLocale,
    getIntlLocale,
    applyTranslations,
    mountLanguageSwitcher,
    subjectLabel,
    subjectDescription,
    localizeSubject,
    microsoftSubsectionLabel,
    microsoftSubsectionDescription,
    microsoftLevelLabel,
    localizeCourse,
    LOCALES,
    LOCALE_LABELS,
  };
  global.t = t;
})(window);
