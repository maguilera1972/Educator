const { sendMail, escapeHtml, isMailConfigured, mailConfig } = require('./mail');
const { getSubjectLabel, getSubjectIcon } = require('./subjects');
const { sanitizeNewsletterIntro } = require('./profile-bio');

function getPublicBaseUrl() {
  return (process.env.PUBLIC_URL || 'https://lms-educator.eureka-training.online').replace(/\/$/, '');
}

function getAppName() {
  return process.env.MAIL_APP_NAME?.trim() || 'LMS-Educator';
}

function getLogoUrl() {
  return `${getPublicBaseUrl()}/images/logo-emblem.png`;
}

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi, (_, __, h1, h2, h3, label) => {
      const href = h1 || h2 || h3 || '';
      const text = String(label || '').replace(/<[^>]+>/g, '').trim();
      return href ? `${text} (${href})` : text;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatIntroHtmlForEmail(intro) {
  const clean = sanitizeNewsletterIntro(intro);
  if (!clean) return '';
  const base = getPublicBaseUrl();

  return clean
    .replace(/<p>/gi, '<p style="margin:0 0 12px;padding:0;color:#334e68;font-size:15px;line-height:1.65;">')
    .replace(/<div>/gi, '<div style="margin:0 0 12px;color:#334e68;font-size:15px;line-height:1.65;">')
    .replace(/<ul>/gi, '<ul style="margin:0 0 12px;padding-left:20px;color:#334e68;font-size:15px;line-height:1.65;">')
    .replace(/<ol>/gi, '<ol style="margin:0 0 12px;padding-left:20px;color:#334e68;font-size:15px;line-height:1.65;">')
    .replace(/<li>/gi, '<li style="margin:0 0 6px;">')
    .replace(/<a\s+href=/gi, '<a style="color:#F0781A;text-decoration:underline;" href=')
    .replace(/<strong>/gi, '<strong style="color:#1B3A5C;">')
    .replace(/<b>/gi, '<b style="color:#1B3A5C;">')
    .replace(/<img\b([^>]*)>/gi, (_match, rawAttrs) => {
      const srcMatch = String(rawAttrs).match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const altMatch = String(rawAttrs).match(/\salt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const widthMatch = String(rawAttrs).match(/\swidth\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      let src = srcMatch?.[2] || srcMatch?.[3] || srcMatch?.[4] || '';
      if (!src) return '';
      if (src.startsWith('/')) src = `${base}${src}`;
      const alt = escapeHtml(altMatch?.[2] || altMatch?.[3] || altMatch?.[4] || '');
      let width = parseInt(widthMatch?.[2] || widthMatch?.[3] || widthMatch?.[4] || '320', 10);
      if (!Number.isFinite(width) || width < 80) width = 160;
      if (width > 560) width = 560;
      return `<img src="${escapeHtml(src)}" alt="${alt}" width="${width}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;margin:12px 0;border-radius:8px;">`;
    });
}

function emailButton({ href, label, bg, radius = 999 }) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  // Bulletproof rounded button (VML for Outlook desktop)
  return `
    <td align="center" valign="middle" style="border-radius:${radius}px;background:${bg};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref}" style="height:44px;v-text-anchor:middle;width:180px;" arcsize="50%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${safeHref}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:${radius}px;line-height:1.2;background:${bg};mso-hide:all;">${safeLabel}</a>
      <!--<![endif]-->
    </td>`;
}

function listApprovedLearners(db) {
  return db.prepare(`
    SELECT id, email, name
    FROM users
    WHERE role = 'learner'
      AND approved = 1
      AND email IS NOT NULL
      AND TRIM(email) != ''
    ORDER BY name ASC, email ASC
  `).all();
}

function getCoursesForNewsletter(db, courseIds) {
  if (!Array.isArray(courseIds) || !courseIds.length) return [];

  const uniqueIds = [...new Set(courseIds.map((id) => parseInt(id, 10)).filter(Boolean))];
  if (!uniqueIds.length) return [];

  const placeholders = uniqueIds.map(() => '?').join(',');
  return db.prepare(`
    SELECT id, title, description, subject, subsection, exam_code, duration_days, created_at
    FROM courses
    WHERE id IN (${placeholders})
    ORDER BY created_at DESC, title ASC
  `).all(...uniqueIds).map((course) => ({
    ...course,
    subject_label: getSubjectLabel(course.subject),
    subject_icon: getSubjectIcon(course.subject),
    catalog_url: `${getPublicBaseUrl()}/courses.html`,
  }));
}

function buildNewsletterEmail({
  recipientName = 'Apprenant',
  subject,
  intro,
  courses,
  loginUrl,
  catalogUrl,
  appName,
}) {
  const safeName = escapeHtml(recipientName);
  const introHtmlBody = formatIntroHtmlForEmail(intro);
  const introPlain = htmlToPlainText(introHtmlBody) || String(intro || '').trim();
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeCatalogUrl = escapeHtml(catalogUrl);
  const safeAppName = escapeHtml(appName);
  const safeLogoUrl = escapeHtml(getLogoUrl());
  const emailSubject = (subject || '').trim() || `Nouveautés formations — ${appName}`;

  const coursesHtml = courses.length
    ? courses.map((course, index) => {
      const desc = course.description
        ? `<p style="margin:10px 0 0;padding:0;color:#5a6f85;font-size:14px;line-height:1.55;">${escapeHtml(course.description).slice(0, 220)}${course.description.length > 220 ? '…' : ''}</p>`
        : '';
      const metaParts = [
        course.subject_label,
        course.exam_code || null,
        course.duration_days ? `${course.duration_days} jour(s)` : null,
      ].filter(Boolean);
      const chips = metaParts.map((chip, i) => (
        `<td style="padding:0 ${i === metaParts.length - 1 ? '0' : '6px'} 0 0;font-family:Arial,Helvetica,sans-serif;">
          <span style="display:inline-block;padding:5px 11px;background:#E8EEF4;color:#1B3A5C;font-size:12px;font-weight:600;border-radius:999px;line-height:1.3;white-space:nowrap;">${escapeHtml(chip)}</span>
        </td>`
      )).join('');
      const topPad = index === 0 ? '0' : '14';

      return `
        <tr>
          <td style="padding:${topPad}px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:#ffffff;border:1px solid #e4ebf3;border-radius:12px;">
              <tr>
                <td style="width:5px;background:#F0781A;border-radius:12px 0 0 12px;font-size:0;line-height:0;">&nbsp;</td>
                <td style="padding:18px 18px 18px 16px;font-family:Arial,Helvetica,sans-serif;">
                  <p style="margin:0;padding:0;color:#1B3A5C;font-size:16px;font-weight:700;line-height:1.35;">${escapeHtml(course.title)}</p>
                  ${chips ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:10px 0 0;"><tr>${chips}</tr></table>` : ''}
                  ${desc}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    }).join('')
    : `
        <tr>
          <td style="padding:16px 18px;background:#E8EEF4;border-radius:12px;color:#5a6f85;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
            Aucune formation sélectionnée pour cette édition.
          </td>
        </tr>`;

  const introHtml = introHtmlBody
    ? `<div style="margin:0;padding:0;color:#334e68;font-size:15px;line-height:1.65;">${introHtmlBody}</div>`
    : `<p style="margin:0;padding:0;color:#334e68;font-size:15px;line-height:1.65;">Découvrez les nouvelles formations disponibles sur <strong style="color:#1B3A5C;">${safeAppName}</strong>.</p>`;

  const preheader = introPlain
    ? escapeHtml(introPlain).slice(0, 110)
    : 'Nouveautés du catalogue Eureka Training';
  const html = `
<!DOCTYPE html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(emailSubject)}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:#eef2f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#eef2f6;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;">
          <tr>
            <td style="background:#ffffff;border-radius:16px 16px 0 0;padding:20px 32px 18px;border:1px solid #e4ebf3;border-bottom:none;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
                <tr>
                  <td width="56" valign="middle" style="width:56px;padding:0 14px 0 0;">
                    <a href="${safeCatalogUrl}" style="text-decoration:none;">
                      <img src="${safeLogoUrl}" width="56" height="56" alt="" style="display:block;border:0;outline:none;text-decoration:none;width:56px;height:56px;">
                    </a>
                  </td>
                  <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;padding:0;">
                    <a href="${safeCatalogUrl}" style="text-decoration:none;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;">
                        <span style="color:#F0781A;">LMS</span><span style="color:#1B3A5C;">-Educator</span>
                      </span>
                    </a>
                    <p style="margin:6px 0 0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.3;color:#5a6f85;">
                      Eureka Training
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#1B3A5C;padding:0;border-left:1px solid #1B3A5C;border-right:1px solid #1B3A5C;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
                <tr>
                  <td style="height:4px;background:#F0781A;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="padding:26px 32px 24px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0;padding:0;color:#FAC898;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">Newsletter</p>
                    <h1 style="margin:10px 0 0;padding:0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:700;">Formations à découvrir</h1>
                    <p style="margin:12px 0 0;padding:0;color:#c5d4e4;font-size:14px;line-height:1.5;">Votre sélection du catalogue LMS-Educator</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px 32px 8px;font-family:Arial,Helvetica,sans-serif;border-left:1px solid #e4ebf3;border-right:1px solid #e4ebf3;">
              <p style="margin:0 0 14px;padding:0;color:#1B3A5C;font-size:16px;line-height:1.5;">Bonjour <strong>${safeName}</strong>,</p>
              ${introHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:22px 32px 8px;font-family:Arial,Helvetica,sans-serif;border-left:1px solid #e4ebf3;border-right:1px solid #e4ebf3;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 14px;">
                    <p style="margin:0;padding:0;color:#1B3A5C;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Nouveautés du catalogue</p>
                  </td>
                </tr>
                ${coursesHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:28px 32px 32px;font-family:Arial,Helvetica,sans-serif;border-left:1px solid #e4ebf3;border-right:1px solid #e4ebf3;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:0 auto;">
                <tr>
                  ${emailButton({ href: catalogUrl, label: 'Voir le catalogue', bg: '#F0781A' })}
                  <td style="width:12px;font-size:0;line-height:0;">&nbsp;</td>
                  ${emailButton({ href: loginUrl, label: 'Se connecter', bg: '#1B3A5C' })}
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border:1px solid #e4ebf3;border-top:1px solid #e4ebf3;border-radius:0 0 16px 16px;padding:20px 32px 22px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0;padding:0;color:#5a6f85;font-size:12px;line-height:1.6;text-align:center;">
                Si les boutons ne s’affichent pas :<br>
                <a href="${safeCatalogUrl}" style="color:#F0781A;text-decoration:underline;">Ouvrir le catalogue</a>
                &nbsp;·&nbsp;
                <a href="${safeLoginUrl}" style="color:#F0781A;text-decoration:underline;">Se connecter</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 8px 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#7a8ea3;">
              ${safeAppName} — Eureka Training
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const coursesText = courses.length
    ? courses.map((c) => {
      const meta = [c.subject_label, c.exam_code, c.duration_days ? `${c.duration_days} j` : null]
        .filter(Boolean).join(' · ');
      return `- ${c.title}${meta ? ` (${meta})` : ''}`;
    }).join('\n')
    : '- Aucune formation sélectionnée';

  const text = [
    `Bonjour ${recipientName},`,
    '',
    introPlain || `Découvrez les nouvelles formations disponibles sur ${appName}.`,
    '',
    'Nouveautés du catalogue :',
    coursesText,
    '',
    `Catalogue : ${catalogUrl}`,
    `Connexion : ${loginUrl}`,
    '',
    `${appName} — Eureka Training`,
  ].join('\n');

  return { subject: emailSubject, html, text };
}

function assertMailReady() {
  if (!isMailConfigured()) {
    return { ok: false, error: 'Microsoft 365 non configuré. Complétez la configuration e-mail.' };
  }
  if (mailConfig().enabled === false) {
    return { ok: false, error: 'L\'envoi d\'e-mails est désactivé.' };
  }
  return { ok: true };
}

async function sendNewsletterTest(db, { subject, intro, course_ids: courseIds, to, recipientName }) {
  const ready = assertMailReady();
  if (!ready.ok) return ready;

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: 'Adresse e-mail de test invalide' };
  }

  const courses = getCoursesForNewsletter(db, courseIds);
  const loginUrl = `${getPublicBaseUrl()}/login.html`;
  const catalogUrl = `${getPublicBaseUrl()}/courses.html`;
  const payload = buildNewsletterEmail({
    recipientName: recipientName || 'Apprenant',
    subject,
    intro,
    courses,
    loginUrl,
    catalogUrl,
    appName: getAppName(),
  });

  const result = await sendMail({
    to: { address: to, name: recipientName || undefined },
    subject: `[TEST] ${payload.subject}`,
    html: payload.html,
    text: payload.text,
  });

  return {
    ok: true,
    message: `Newsletter de test envoyée à ${to}`,
    result,
    preview: payload,
  };
}

async function sendNewsletterToLearners(db, { subject, intro, course_ids: courseIds }) {
  const ready = assertMailReady();
  if (!ready.ok) return ready;

  const courses = getCoursesForNewsletter(db, courseIds);
  if (!courses.length) {
    return { ok: false, error: 'Sélectionnez au moins une formation à mettre en avant.' };
  }

  const learners = listApprovedLearners(db);
  if (!learners.length) {
    return { ok: false, error: 'Aucun apprenant validé à contacter.' };
  }

  const loginUrl = `${getPublicBaseUrl()}/login.html`;
  const catalogUrl = `${getPublicBaseUrl()}/courses.html`;
  const appName = getAppName();

  let sent = 0;
  const failures = [];

  for (const learner of learners) {
    try {
      const payload = buildNewsletterEmail({
        recipientName: learner.name || 'Apprenant',
        subject,
        intro,
        courses,
        loginUrl,
        catalogUrl,
        appName,
      });
      const result = await sendMail({
        to: { address: learner.email, name: learner.name },
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      if (result.sent) sent += 1;
      else failures.push({ email: learner.email, error: result.reason || 'skipped' });
    } catch (err) {
      failures.push({ email: learner.email, error: err.message || 'échec' });
    }
  }

  return {
    ok: true,
    message: `Newsletter envoyée à ${sent}/${learners.length} apprenant(s).`,
    sent,
    total: learners.length,
    failed: failures.length,
    failures: failures.slice(0, 20),
  };
}

function previewNewsletter(db, { subject, intro, course_ids: courseIds, recipientName }) {
  const courses = getCoursesForNewsletter(db, courseIds);
  const payload = buildNewsletterEmail({
    recipientName: recipientName || 'Apprenant',
    subject,
    intro,
    courses,
    loginUrl: `${getPublicBaseUrl()}/login.html`,
    catalogUrl: `${getPublicBaseUrl()}/courses.html`,
    appName: getAppName(),
  });
  return {
    ...payload,
    course_count: courses.length,
    recipient_count: listApprovedLearners(db).length,
  };
}

module.exports = {
  listApprovedLearners,
  getCoursesForNewsletter,
  buildNewsletterEmail,
  previewNewsletter,
  sendNewsletterTest,
  sendNewsletterToLearners,
};
