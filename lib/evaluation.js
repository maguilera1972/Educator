const DEFAULT_EVALUATION_FORM_URL = 'https://forms.cloud.microsoft/e/RFjBKzfwQQ';

function normalizeEvaluationUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return DEFAULT_EVALUATION_FORM_URL;
  if (!/^https?:\/\//i.test(url)) return DEFAULT_EVALUATION_FORM_URL;
  return url;
}

function withEvaluationUrl(course) {
  if (!course) return course;
  return {
    ...course,
    evaluation_url: normalizeEvaluationUrl(course.evaluation_url),
  };
}

module.exports = {
  DEFAULT_EVALUATION_FORM_URL,
  normalizeEvaluationUrl,
  withEvaluationUrl,
};
