const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img',
  'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'div', 'span',
]);

function isAllowedLinkUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return /^(https?:\/\/|mailto:)/i.test(trimmed);
}

function isAllowedImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/profile/bio/images/')) return true;
  if (trimmed.startsWith('/api/newsletter/images/')) return true;
  return /^https?:\/\//i.test(trimmed);
}

function sanitizeAttrs(tag, rawAttrs) {
  const attrs = rawAttrs || '';
  if (tag === 'a') {
    const hrefMatch = attrs.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const href = hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '';
    if (!isAllowedLinkUrl(href)) return '';
    return ` href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"`;
  }
  if (tag === 'img') {
    const srcMatch = attrs.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const altMatch = attrs.match(/\salt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const src = srcMatch?.[2] || srcMatch?.[3] || srcMatch?.[4] || '';
    if (!isAllowedImageUrl(src)) return '';
    const alt = (altMatch?.[2] || altMatch?.[3] || altMatch?.[4] || '').replace(/"/g, '&quot;');
    return ` src="${src.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy"`;
  }
  return '';
}

function sanitizeProfileBio(html) {
  if (!html || typeof html !== 'string') return '';
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  clean = clean.replace(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g, (match, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (match.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    return `<${tag}${sanitizeAttrs(tag, rawAttrs)}>`;
  });

  return clean.trim().slice(0, 50000);
}

const NEWSLETTER_ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img',
  'ul', 'ol', 'li', 'div', 'span',
]);

function sanitizeNewsletterImgAttrs(rawAttrs) {
  const attrs = rawAttrs || '';
  const srcMatch = attrs.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const altMatch = attrs.match(/\salt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const widthMatch = attrs.match(/\swidth\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const src = srcMatch?.[2] || srcMatch?.[3] || srcMatch?.[4] || '';
  if (!isAllowedImageUrl(src)) return '';
  const alt = (altMatch?.[2] || altMatch?.[3] || altMatch?.[4] || '').replace(/"/g, '&quot;');
  let width = parseInt(widthMatch?.[2] || widthMatch?.[3] || widthMatch?.[4] || '320', 10);
  if (!Number.isFinite(width) || width < 80) width = 160;
  if (width > 600) width = 600;
  return ` src="${src.replace(/"/g, '&quot;')}" alt="${alt}" width="${width}"`;
}

function sanitizeNewsletterIntro(html) {
  if (!html || typeof html !== 'string') return '';
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  clean = clean.replace(/<\/?([a-zA-Z][\w-]*)([^>]*)>/g, (match, tagName, rawAttrs) => {
    const tag = tagName.toLowerCase();
    if (!NEWSLETTER_ALLOWED_TAGS.has(tag)) return '';
    if (match.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';
    if (tag === 'a') return `<a${sanitizeAttrs(tag, rawAttrs)}>`;
    if (tag === 'img') {
      const imgAttrs = sanitizeNewsletterImgAttrs(rawAttrs);
      return imgAttrs ? `<img${imgAttrs}>` : '';
    }
    return `<${tag}>`;
  });

  const textOnly = clean
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  if (!textOnly && !/<img\b/i.test(clean)) return '';

  return clean.trim().slice(0, 20000);
}

module.exports = {
  sanitizeProfileBio,
  sanitizeNewsletterIntro,
  isAllowedImageUrl,
  isAllowedLinkUrl,
};
