// Category-aware unit labels
const CATEGORY_UNITS = { Crop: 'kg', Livestock: 'heads', Input: 'bags' };

export function displayUnit(category) {
  return CATEGORY_UNITS[category] || 'kg';
}

export function formatQuantity(qty, category) {
  return `${Number(qty || 0).toLocaleString()} ${displayUnit(category)}`;
}
