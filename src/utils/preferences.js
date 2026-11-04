export const defaults = { fontScale: 1, themeMode: 'light', highContrast: false, simplifiedMode: false, colorVisionMode: 'standard' };
export function sanitizePreferences(value) {
  const v = value && typeof value === 'object' ? value : {};
  return {
    fontScale: typeof v.fontScale === 'number' && Number.isFinite(v.fontScale) ? Math.min(1.4, Math.max(0.9, v.fontScale)) : 1,
    themeMode: ['light','dark'].includes(v.themeMode) ? v.themeMode : 'light',
    highContrast: v.highContrast === true,
    simplifiedMode: v.simplifiedMode === true,
    colorVisionMode: ['standard','protanopia','deuteranopia','tritanopia'].includes(v.colorVisionMode) ? v.colorVisionMode : 'standard',
  };
}
export function loadPreferences() {
  try { return sanitizePreferences(JSON.parse(localStorage.getItem('visioaccess.preferences'))); }
  catch { return { ...defaults }; }
}
