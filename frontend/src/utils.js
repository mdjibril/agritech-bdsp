// All commodity measures in kg
const CATEGORY_UNITS = { Crop: 'kg', Livestock: 'kg', Input: 'kg' };

export function displayUnit(category) {
  return CATEGORY_UNITS[category] || 'kg';
}

export function formatQuantity(qty, category) {
  return `${Number(qty || 0).toLocaleString()} ${displayUnit(category)}`;
}
