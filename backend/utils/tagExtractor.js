function extractTagsFromDescription(text) {
  if (!text) return [];
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 5);
  return [...new Set(words)];
}

function extractTagsFromFilename(filename) {
  if (!filename) return [];
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const words = nameWithoutExt
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 3);
  return [...new Set(words)];
}

module.exports = {
  extractTagsFromDescription,
  extractTagsFromFilename
};