import { POSE_LANDMARK_IDS } from './constants';

/**
 * Convierte un nombre como "LEFT_SHOULDER" a "Left Shoulder"
 * @param {string} name 
 * @returns {string}
 */
export function formatPointName(name) {
  if (!name) return '';
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

/**
 * Busca el nombre (e.g. "Left Shoulder") a partir del ID (e.g. 11)
 * @param {number} idx 
 * @returns {string}
 */
export function landmarkName(idx) {
  const entry = Object.entries(POSE_LANDMARK_IDS).find(([, v]) => v === idx);
  return entry ? formatPointName(entry[0]) : 'Punto ' + idx;
}
