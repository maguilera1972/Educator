const { formatBytes } = require('./uploads');
const { canStreamMaterial } = require('./streaming');

const MATERIAL_TYPES = ['slides', 'videos', 'docs', 'labs'];

const MATERIAL_LABELS = {
  slides: 'Slides',
  videos: 'Vidéos',
  docs: 'Documents',
  labs: 'Labs',
};

const SECTIONED_TYPES = MATERIAL_TYPES;

const MATERIAL_COUNT_LABELS = {
  slides: ['slide', 'slides'],
  videos: ['vidéo', 'vidéos'],
  docs: ['document', 'documents'],
  labs: ['lab', 'labs'],
};

function emptyStructure() {
  return Object.fromEntries(MATERIAL_TYPES.map((t) => [t, []]));
}

function enrichMaterial(row, courseId, viewedIds = null) {
  if (!row) return row;
  const hasFile = !!row.file_path;
  const streamable = hasFile && canStreamMaterial(row);
  const learnerNoDirectDownload = hasFile && (row.type === 'slides' || row.type === 'videos');
  const item = {
    ...row,
    has_file: hasFile,
    download_url: hasFile && !learnerNoDirectDownload
      ? `/api/courses/${courseId}/materials/${row.id}/file`
      : null,
    stream_url: streamable
      ? `/api/courses/${courseId}/materials/${row.id}/stream`
      : null,
  };
  if (row.file_size) item.file_size_label = formatBytes(row.file_size);
  if (viewedIds) {
    item.viewed = viewedIds.has(row.id);
  }
  return item;
}

function groupMaterials(rows, courseId = null, viewedIds = null) {
  const structure = emptyStructure();
  for (const row of rows) {
    if (structure[row.type]) {
      const item = courseId ? enrichMaterial(row, courseId, viewedIds) : row;
      structure[row.type].push(item);
    }
  }
  return structure;
}

module.exports = {
  MATERIAL_TYPES,
  MATERIAL_LABELS,
  SECTIONED_TYPES,
  MATERIAL_COUNT_LABELS,
  emptyStructure,
  groupMaterials,
  enrichMaterial,
};
