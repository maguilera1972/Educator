const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function courseTypeDir(courseId, type) {
  const dir = path.join(UPLOADS_ROOT, 'courses', String(courseId), type);
  ensureDir(dir);
  return dir;
}

function safeFilename(name) {
  const cleaned = String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  // Évite des noms extrêmes (chemins/URL trop longs côté proxies → HTTP 414)
  if (cleaned.length <= 120) return cleaned || 'file';
  const extMatch = cleaned.match(/(\.[a-zA-Z0-9]{1,12})$/);
  const ext = extMatch ? extMatch[1] : '';
  const base = cleaned.slice(0, Math.max(1, 120 - ext.length));
  return `${base}${ext}`;
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const type = req.body?.type
        || req.get?.('x-material-type')
        || req.query?.type
        || 'docs';
      const dir = courseTypeDir(req.params.courseId, type);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${unique}-${safeFilename(file.originalname)}`);
  },
});

// Aucune limite de taille ni de nombre de fichiers
const upload = multer({ storage });

function deleteStoredFile(filePath) {
  if (!filePath) return;
  const absolute = path.resolve(filePath);
  if (!absolute.startsWith(path.resolve(UPLOADS_ROOT))) return;
  if (fs.existsSync(absolute)) {
    fs.unlinkSync(absolute);
  }
}

function materialFileUrl(courseId, materialId) {
  return `/api/courses/${courseId}/materials/${materialId}/file`;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function profileBioDir(userId) {
  const dir = path.join(UPLOADS_ROOT, 'profile', String(userId));
  ensureDir(dir);
  return dir;
}

const profileBioStorage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      cb(null, profileBioDir(req.user.id));
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${unique}-${safeFilename(file.originalname)}`);
  },
});

const profileBioUpload = multer({
  storage: profileBioStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

function profileBioImageUrl(userId, filename) {
  return `/api/profile/bio/images/${userId}/${encodeURIComponent(filename)}`;
}

function resolveProfileBioImagePath(userId, filename) {
  const safeName = path.basename(filename);
  const absolute = path.resolve(profileBioDir(userId), safeName);
  if (!absolute.startsWith(path.resolve(profileBioDir(userId)))) return null;
  return absolute;
}

function profileAvatarDir(userId) {
  const dir = path.join(UPLOADS_ROOT, 'avatars', String(userId));
  ensureDir(dir);
  return dir;
}

const profileAvatarStorage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      cb(null, profileAvatarDir(req.user.id));
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `avatar-${unique}${safeExt}`);
  },
});

const profileAvatarUpload = multer({
  storage: profileAvatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, GIF or WebP images are allowed'));
  },
});

function resolveProfileAvatarPath(userId, filename) {
  const safeName = path.basename(filename);
  const absolute = path.resolve(profileAvatarDir(userId), safeName);
  if (!absolute.startsWith(path.resolve(profileAvatarDir(userId)))) return null;
  return absolute;
}

function newsletterImagesDir() {
  const dir = path.join(UPLOADS_ROOT, 'newsletter');
  ensureDir(dir);
  return dir;
}

const newsletterImageStorage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      cb(null, newsletterImagesDir());
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${unique}-${safeFilename(file.originalname)}`);
  },
});

const newsletterImageUpload = multer({
  storage: newsletterImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images are allowed'));
  },
});

function newsletterImageUrl(filename) {
  return `/api/newsletter/images/${encodeURIComponent(filename)}`;
}

function resolveNewsletterImagePath(filename) {
  const safeName = path.basename(filename);
  const absolute = path.resolve(newsletterImagesDir(), safeName);
  if (!absolute.startsWith(path.resolve(newsletterImagesDir()))) return null;
  return absolute;
}

module.exports = {
  UPLOADS_ROOT,
  upload,
  profileBioUpload,
  profileAvatarUpload,
  newsletterImageUpload,
  deleteStoredFile,
  materialFileUrl,
  profileBioImageUrl,
  resolveProfileBioImagePath,
  resolveProfileAvatarPath,
  profileAvatarDir,
  newsletterImageUrl,
  resolveNewsletterImagePath,
  formatBytes,
  ensureDir,
  courseTypeDir,
  safeFilename,
};
