/**
 * Backend i18n utility for notification messages
 * Supports English (en), French (fr), and Arabic (ar)
 */

const fs = require('fs');
const path = require('path');

// Translation cache
const translations = {};

// Load translation files
const loadTranslations = () => {
  const locales = ['en', 'fr', 'ar'];
  const localesDir = path.join(__dirname, '../locales');

  locales.forEach(locale => {
    const filePath = path.join(localesDir, `${locale}.json`);
    try {
      if (fs.existsSync(filePath)) {
        translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        // Create default file if it doesn't exist
        translations[locale] = {};
        fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
      }
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:`, error.message);
      translations[locale] = {};
    }
  });
};

// Initialize translations
loadTranslations();

/**
 * Get translated message
 * @param {string} key - Translation key (e.g., 'notifications.complaintValidated')
 * @param {string} locale - Locale (en, fr, ar)
 * @param {object} params - Parameters for interpolation (e.g., { complaintTitle: '...' })
 * @returns {string} Translated message
 */
const t = (key, locale = 'en', params = {}) => {
  const keys = key.split('.');
  let value = translations[locale] || translations['en'];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = translations['en'];
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2];
        } else {
          // Return key if translation not found
          return key;
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Interpolate parameters
  let result = value;
  Object.keys(params).forEach(param => {
    result = result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  });

  return result;
};

/**
 * Format date/time based on locale
 * @param {Date} date - Date object
 * @param {string} locale - Locale (en, fr, ar)
 * @returns {string} Formatted date/time string
 */
const formatDateTime = (date, locale = 'en') => {
  if (!date) return '';
  
  const d = new Date(date);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  try {
    return d.toLocaleDateString(locale === 'ar' ? 'ar-TN' : locale === 'fr' ? 'fr-TN' : 'en-TN', options);
  } catch (error) {
    return d.toLocaleDateString('en-US', options);
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date - Date object
 * @param {string} locale - Locale (en, fr, ar)
 * @returns {string} Relative time string
 */
const formatRelativeTime = (date, locale = 'en') => {
  if (!date) return '';
  
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return t('timeAgo.now', locale);
  } else if (diffMins < 60) {
    return t('timeAgo.minutes', locale, { n: diffMins });
  } else if (diffHours < 24) {
    return t('timeAgo.hours', locale, { n: diffHours });
  } else {
    return t('timeAgo.days', locale, { n: diffDays });
  }
};

module.exports = {
  t,
  formatDateTime,
  formatRelativeTime,
  loadTranslations
};
