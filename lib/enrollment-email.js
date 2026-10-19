const { sendMail, escapeHtml, isMailConfigured, mailConfig } = require('./mail');
const { getSubjectLabel } = require('./subjects');
const { getSessionDates } = require('./schedule');

const DATE_FMT = new Intl.DateTimeFormat('fr-CH', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

function formatSessionDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return DATE_FMT.format(new Date(y, m - 1, d));
}

function getCourseDetailsForEmail(db, userId, courseIds, schedules = {}) {
  return courseIds.map((courseId) => {
    const course = db.prepare(
      'SELECT id, title, subject, duration_days FROM courses WHERE id = ?'
    ).get(courseId);

    if (!course) return null;

    const sessionDates = schedules[courseId]
      ?? schedules[String(courseId)]
      ?? getSessionDates(db, userId, courseId, 'enrollment');

    return {
      title: course.title,
      subject_label: getSubjectLabel(course.subject),
      duration_days: course.duration_days,
      session_dates: sessionDates,
    };
  }).filter(Boolean);
}

function buildEnrollmentConfirmationEmail({ user, courses, loginUrl, appName }) {
  const safeName = escapeHtml(user.name);
  const safeEmail = escapeHtml(user.email);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeAppName = escapeHtml(appName);

  const coursesHtml = courses.map((course) => {
    const datesHtml = course.session_dates.length
      ? `<ul style="margin:0.35rem 0 0;padding-left:1.1rem;color:#1B3A5C;">
          ${course.session_dates.map((date) => `<li>${escapeHtml(formatSessionDate(date))}</li>`).join('')}
        </ul>`
      : '<p style="margin:0.35rem 0 0;color:#5a6f85;font-size:14px;">Dates to confirm with your instructor.</p>';

    return `
      <li style="margin-bottom:1rem;padding:0.85rem 1rem;background:#FFF4E8;border:1px solid #FAC898;border-radius:8px;">
        <strong style="color:#1B3A5C;font-size:15px;">${escapeHtml(course.title)}</strong>
        <div style="margin-top:0.25rem;color:#5a6f85;font-size:14px;">${escapeHtml(course.subject_label)} · ${course.duration_days} jour(s)</div>
        <div style="margin-top:0.5rem;font-size:14px;color:#1B3A5C;"><strong>Jours de formation :</strong>${datesHtml}</div>
      </li>
    `;
  }).join('');

  const subject = `Your ${appName} enrollment is confirmed`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Montserrat,Arial,sans-serif;color:#1B3A5C;line-height:1.6;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    <div style="background:#1B3A5C;border-radius:12px 12px 0 0;padding:20px 24px;border:2px solid #F0781A;border-bottom:none;">
      <p style="margin:0;color:#FFF4E8;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">Eureka Training</p>
      <h1 style="margin:8px 0 0;color:#F0781A;font-size:22px;font-weight:700;">Register confirmée</h1>
    </div>
    <div style="background:#ffffff;border:2px solid #F0781A;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      <p style="margin:0 0 16px;">Bonjour <strong>${safeName}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte sur la plateforme <strong>${safeAppName}</strong> a été validé. Vous pouvez dès maintenant vous connecter avec l'identifiant ci-dessous (le mot de passe est celui choisi lors de votre inscription).</p>

      <div style="margin:20px 0;padding:16px 18px;background:#E8EEF4;border-radius:8px;border-left:4px solid #F0781A;">
        <p style="margin:0 0 6px;font-size:13px;color:#5a6f85;text-transform:uppercase;letter-spacing:0.03em;">Identifiant de connexion</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#1B3A5C;">${safeEmail}</p>
      </div>

      <p style="margin:0 0 10px;font-weight:700;color:#1B3A5C;">Courses confirmées</p>
      <ul style="margin:0 0 20px;padding:0;list-style:none;">${coursesHtml}</ul>

      <p style="margin:0 0 20px;text-align:center;">
        <a href="${safeLoginUrl}" style="display:inline-block;background:#F0781A;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px;">Accéder à la plateforme</a>
      </p>

      <p style="margin:0;font-size:14px;color:#5a6f85;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${safeLoginUrl}" style="color:#F0781A;">${safeLoginUrl}</a></p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#5a6f85;">${safeAppName} — Eureka Training</p>
  </div>
</body>
</html>`;

  const coursesText = courses.map((course) => {
    const dates = course.session_dates.length
      ? course.session_dates.map(formatSessionDate).join(', ')
      : 'Dates to confirm';
    return `- ${course.title} (${course.subject_label}, ${course.duration_days} j) — ${dates}`;
  }).join('\n');

  const text = [
    `Bonjour ${user.name},`,
    '',
    `Your enrollment on ${appName} is confirmed.`,
    '',
    `Identifiant de connexion : ${user.email}`,
    'Password : celui choisi lors de votre inscription.',
    '',
    'Confirmed courses:',
    coursesText,
    '',
    `Platform access: ${loginUrl}`,
  ].join('\n');

  return { subject, html, text };
}

async function sendEnrollmentConfirmationEmail(db, userId, courseIds, schedules = {}) {
  if (!isMailConfigured() || mailConfig().enabled === false) {
    return { sent: false, skipped: true, reason: 'mail_not_configured' };
  }

  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  if (!user?.email) {
    throw new Error('User not found pour l\'send du mail de confirmation');
  }

  const courses = getCourseDetailsForEmail(db, userId, courseIds, schedules);
  if (!courses.length) {
    throw new Error('No courses to include in the confirmation email');
  }

  const loginUrl = `${(process.env.PUBLIC_URL || 'https://lms-educator.eureka-training.online').replace(/\/$/, '')}/login.html`;
  const appName = process.env.MAIL_APP_NAME?.trim() || 'LMS-Educator';

  const { subject, html, text } = buildEnrollmentConfirmationEmail({
    user,
    courses,
    loginUrl,
    appName,
  });

  return sendMail({
    to: { address: user.email, name: user.name },
    subject,
    html,
    text,
  });
}

module.exports = {
  buildEnrollmentConfirmationEmail,
  sendEnrollmentConfirmationEmail,
  getCourseDetailsForEmail,
};
