import { config } from '../config/index.js';

/**
 * Notification tier names — must match keys in config.notificationTiers.
 */
const TIER = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

/**
 * Determine the alert tier for a report based on its type and attributes.
 *
 * @param {object} report
 * @param {string} report.type - 'missing_person' | 'lost_item' | 'found_item' | 'intel'
 * @param {number} [report.age] - Age of the person (for missing_person type)
 * @param {boolean} [report.hasReward] - Whether a reward is offered (for lost_item type)
 * @param {string} [report.severity] - 'urgent' | 'high' | 'medium' | 'low' (for intel type)
 * @param {boolean} [report.isMatch] - Whether this is a match notification (for found_item type)
 * @returns {string} One of the TIER values
 */
export function getAlertTier(report) {
  if (!report || !report.type) {
    return TIER.LOW;
  }

  switch (report.type) {
    case 'missing_person': {
      const age = report.age;
      if (typeof age === 'number' && age < 13) return TIER.CRITICAL;
      if (typeof age === 'number' && age < 18) return TIER.HIGH;
      return TIER.MEDIUM;
    }

    case 'lost_item':
      return report.hasReward ? TIER.MEDIUM : TIER.LOW;

    case 'found_item':
      return report.isMatch ? TIER.HIGH : TIER.LOW;

    case 'intel':
      return report.severity === 'urgent' ? TIER.HIGH : TIER.LOW;

    default:
      return TIER.LOW;
  }
}

/**
 * Localized notification strings keyed by tier, then by locale.
 * Each entry is a function that receives report data and returns { title, body }.
 */
const NOTIFICATION_TEMPLATES = {
  [TIER.CRITICAL]: {
    en: (r) => ({
      title: 'URGENT: Missing Child Alert',
      body: `URGENT: ${r.name || 'Unknown'}, age ${r.age ?? '?'}, missing near ${r.address || 'unknown location'}`,
    }),
    ar: (r) => ({
      title: '\u062A\u0646\u0628\u064A\u0647 \u0639\u0627\u062C\u0644: \u0637\u0641\u0644 \u0645\u0641\u0642\u0648\u062F',
      body: `\u0639\u0627\u062C\u0644: ${r.name || '\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641'}\u060C \u0627\u0644\u0639\u0645\u0631 ${r.age ?? '?'}\u060C \u0645\u0641\u0642\u0648\u062F \u0628\u0627\u0644\u0642\u0631\u0628 \u0645\u0646 ${r.address || '\u0645\u0648\u0642\u0639 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641'}`,
    }),
    ru: (r) => ({
      title: '\u0421\u0420\u041E\u0427\u041D\u041E: \u041F\u0440\u043E\u043F\u0430\u043B \u0440\u0435\u0431\u0451\u043D\u043E\u043A',
      body: `\u0421\u0420\u041E\u0427\u041D\u041E: ${r.name || '\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439'}, \u0432\u043E\u0437\u0440\u0430\u0441\u0442 ${r.age ?? '?'}, \u043F\u0440\u043E\u043F\u0430\u043B \u0432\u043E\u0437\u043B\u0435 ${r.address || '\u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u043C\u0435\u0441\u0442\u043E'}`,
    }),
  },
  [TIER.HIGH]: {
    en: (r) => ({
      title: 'Missing Person Alert',
      body: `Missing person alert: ${r.name || 'Unknown'} near ${r.address || 'your area'}`,
    }),
    ar: (r) => ({
      title: '\u062A\u0646\u0628\u064A\u0647 \u0634\u062E\u0635 \u0645\u0641\u0642\u0648\u062F',
      body: `\u062A\u0646\u0628\u064A\u0647: ${r.name || '\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641'} \u0628\u0627\u0644\u0642\u0631\u0628 \u0645\u0646 ${r.address || '\u0645\u0646\u0637\u0642\u062A\u0643'}`,
    }),
    ru: (r) => ({
      title: '\u041F\u0440\u043E\u043F\u0430\u043B \u0447\u0435\u043B\u043E\u0432\u0435\u043A',
      body: `\u0422\u0440\u0435\u0432\u043E\u0433\u0430: ${r.name || '\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439'} \u0432\u043E\u0437\u043B\u0435 ${r.address || '\u0432\u0430\u0448\u0435\u0433\u043E \u0440\u0430\u0439\u043E\u043D\u0430'}`,
    }),
  },
  [TIER.MEDIUM]: {
    en: (r) => ({
      title: 'Nearby Report',
      body: `${r.typeLabel || 'Report'} reported nearby`,
    }),
    ar: (r) => ({
      title: '\u0628\u0644\u0627\u063A \u0642\u0631\u064A\u0628',
      body: `${r.typeLabel || '\u0628\u0644\u0627\u063A'} \u062A\u0645 \u0627\u0644\u0625\u0628\u0644\u0627\u063A \u0639\u0646\u0647 \u0628\u0627\u0644\u0642\u0631\u0628`,
    }),
    ru: (r) => ({
      title: '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043F\u043E\u0431\u043B\u0438\u0437\u043E\u0441\u0442\u0438',
      body: `${r.typeLabel || '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435'} \u043F\u043E\u0431\u043B\u0438\u0437\u043E\u0441\u0442\u0438`,
    }),
  },
  [TIER.LOW]: {
    en: () => ({ title: '', body: '' }),
    ar: () => ({ title: '', body: '' }),
    ru: () => ({ title: '', body: '' }),
  },
};

/**
 * Human-readable type labels per locale (used in MEDIUM-tier messages).
 */
const TYPE_LABELS = {
  missing_person: { en: 'Missing person', ar: '\u0634\u062E\u0635 \u0645\u0641\u0642\u0648\u062F', ru: '\u041F\u0440\u043E\u043F\u0430\u0432\u0448\u0438\u0439 \u0447\u0435\u043B\u043E\u0432\u0435\u043A' },
  lost_item: { en: 'Lost item', ar: '\u063A\u0631\u0636 \u0645\u0641\u0642\u0648\u062F', ru: '\u041F\u043E\u0442\u0435\u0440\u044F\u043D\u043D\u0430\u044F \u0432\u0435\u0449\u044C' },
  found_item: { en: 'Found item', ar: '\u063A\u0631\u0636 \u0645\u0648\u062C\u0648\u062F', ru: '\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u0430\u044F \u0432\u0435\u0449\u044C' },
  intel: { en: 'Intel report', ar: '\u062A\u0642\u0631\u064A\u0631 \u0627\u0633\u062A\u062E\u0628\u0627\u0631\u0627\u062A\u064A', ru: '\u0421\u0432\u043E\u0434\u043A\u0430' },
};

const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = new Set(['en', 'ar', 'ru']);

/**
 * Format a notification payload based on report data, tier, and locale.
 *
 * @param {object} report - Report data containing name, age, address, type, etc.
 * @param {string} tierName - One of CRITICAL, HIGH, MEDIUM, LOW
 * @param {string} [locale='en'] - Language code: en, ar, or ru
 * @returns {object} { title, body, data, tier: { ttl, priority, sound, vibrate } }
 */
export function formatNotification(report, tierName, locale = DEFAULT_LOCALE) {
  const effectiveLocale = SUPPORTED_LOCALES.has(locale) ? locale : DEFAULT_LOCALE;
  const tier = tierName in TIER ? tierName : TIER.LOW;
  const tierConfig = config.notificationTiers[tier];
  const templates = NOTIFICATION_TEMPLATES[tier];
  const template = templates[effectiveLocale] || templates[DEFAULT_LOCALE];

  const typeLabel = TYPE_LABELS[report.type]?.[effectiveLocale]
    || TYPE_LABELS[report.type]?.[DEFAULT_LOCALE]
    || report.type;

  const { title, body } = template({ ...report, typeLabel });

  return {
    title,
    body,
    data: {
      reportId: report.id || '',
      reportType: report.type || '',
      tier,
    },
    tier: {
      ttl: tierConfig.ttl,
      priority: tierConfig.priority,
      sound: tierConfig.sound,
      vibrate: tierConfig.vibrate,
    },
  };
}

export { TIER };
