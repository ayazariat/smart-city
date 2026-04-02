const normalizeMunicipality = (name) => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics (é→e, è→e, etc.)
    .replace(/[-''`]/g, ' ')            // hyphens/apostrophes → space
    .replace(/\s+/g, ' ')              // collapse multiple spaces
    .trim();
};

module.exports = { normalizeMunicipality };
