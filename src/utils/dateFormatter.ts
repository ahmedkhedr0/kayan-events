/**
 * Safe Arabic Date Formatter helper
 */
export const formatTripDateSafely = (dateStr?: string): string => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
    return 'سيتم التحديد لاحقاً';
  }

  try {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      // If it is not a valid ISO date, return the raw string if reasonable
      return dateStr;
    }
    return parsed.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr || 'سيتم التحديد لاحقاً';
  }
};
