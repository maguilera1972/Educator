const { loadEnvFile } = require('./lib/env');
loadEnvFile();

const express = require('express');
const path = require('path');
const multer = require('multer');
const { initMailSettings } = require('./lib/mail-settings');
const { initDatabase } = require('./db/database');

initMailSettings();
const createAuthRouter = require('./routes/auth');
const createCoursesRouter = require('./routes/courses');
const createModulesRouter = require('./routes/modules');
const createLessonsRouter = require('./routes/lessons');
const createQuizzesRouter = require('./routes/quizzes');
const createMaterialsRouter = require('./routes/materials');
const createMaterialSectionsRouter = require('./routes/material-sections');
const createVideoSectionsRouter = require('./routes/video-sections');
const createAdminRouter = require('./routes/admin');
const createProfileRouter = require('./routes/profile');
const createAvatarsRouter = require('./routes/avatars');
const createCalendarRouter = require('./routes/calendar');
const createWeatherRouter = require('./routes/weather');
const { getSubjectsCatalog } = require('./lib/subjects');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://lms-educator.eureka-training.online').replace(/\/$/, '');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const db = initDatabase();
app.locals.db = db;

// Cloudflare Tunnel / Zero Trust : le trafic arrive via proxy HTTPS
if (IS_PRODUCTION || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  const proto = req.headers['x-forwarded-proto'];
  const secure = req.secure || proto === 'https';
  if (secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self)');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'lms',
    version: '2.0.0',
    url: PUBLIC_URL,
    behindProxy: !!req.headers['cf-ray'] || !!req.headers['x-forwarded-for'],
  });
});

app.get('/api/subjects', (_req, res) => {
  res.json({ subjects: getSubjectsCatalog() });
});

app.use('/api/auth', createAuthRouter(db));
app.use('/api/calendar', createCalendarRouter(db));
app.use('/api/weather', createWeatherRouter());
app.use('/api/courses', createCoursesRouter(db));
app.use('/api/courses/:courseId/modules', createModulesRouter(db));
app.use('/api/courses/:courseId/modules/:moduleId/lessons', createLessonsRouter(db));
app.use('/api/courses/:courseId/modules/:moduleId/quizzes', createQuizzesRouter(db));
app.use('/api/courses/:courseId/materials', createMaterialsRouter(db));
app.use('/api/courses/:courseId/material-sections', createMaterialSectionsRouter(db));
app.use('/api/courses/:courseId/video-sections', createVideoSectionsRouter(db));
app.use('/api/admin', createAdminRouter(db));
app.use('/api/profile', createProfileRouter(db));
app.use('/api/avatars', createAvatarsRouter());

// Images newsletter accessibles sans auth (clients mail)
app.get('/api/newsletter/images/:filename', (req, res) => {
  const { resolveNewsletterImagePath } = require('./lib/uploads');
  const filePath = resolveNewsletterImagePath(req.params.filename);
  if (!filePath || !require('fs').existsSync(filePath)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(filePath);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ error: 'Limite de fichier atteinte' });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`LMS-Educator server running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_URL}`);
});
