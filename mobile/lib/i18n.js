import * as SecureStore from 'expo-secure-store';

/**
 * SafeCircle i18n engine
 *
 * Detects device locale via expo-localization (optional peer dep),
 * persists language preference in SecureStore, and provides
 * string interpolation via `t(key, params)`.
 *
 * Fallback chain: stored preference -> device locale -> DEFAULT_LANGUAGE
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'safecircle_language';
const DEFAULT_LANGUAGE = 'en';

/**
 * All languages the app ships with.
 * label  = native-script display name shown in the language picker.
 * rtl    = whether the language is written right-to-left.
 */
export const SUPPORTED_LANGUAGES = Object.freeze({
  en: { label: 'English', rtl: false },
  ar: { label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', rtl: true },
  ru: { label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', rtl: false },
  es: { label: 'Espa\u00F1ol', rtl: false },
  fr: { label: 'Fran\u00E7ais', rtl: false },
  tr: { label: 'T\u00FCrk\u00E7e', rtl: false },
  pt: { label: 'Portugu\u00EAs', rtl: false },
});

const SUPPORTED_CODES = Object.keys(SUPPORTED_LANGUAGES);

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _currentLanguage = DEFAULT_LANGUAGE;
let _strings = {};
let _initialized = false;
let _initPromise = null;

// ---------------------------------------------------------------------------
// Locale bundles (lazy-loaded)
// ---------------------------------------------------------------------------

const LOCALE_LOADERS = {
  en: () => require('../locales/en.json'),
  ar: () => require('../locales/ar.json'),
  ru: () => require('../locales/ru.json'),
  // Future locales: add a loader here when the JSON file is created.
  // es: () => require('../locales/es.json'),
  // fr: () => require('../locales/fr.json'),
  // tr: () => require('../locales/tr.json'),
  // pt: () => require('../locales/pt.json'),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated key against a nested object.
 * e.g. resolve('auth.signIn', obj) -> obj.auth.signIn
 */
function resolve(key, obj) {
  return key.split('.').reduce((acc, part) => (acc != null ? acc[part] : undefined), obj);
}

/**
 * Replace `{{param}}` placeholders with values from `params`.
 * Unmatched placeholders are left as-is so they are visible during dev.
 */
function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

/**
 * Normalise a BCP-47 tag (e.g. "ar-EG", "ru-RU") to our short code.
 * Returns `undefined` if the language is not supported.
 */
function normaliseLocale(tag) {
  if (!tag) return undefined;
  const lower = tag.toLowerCase().replace('_', '-');
  // Exact match first (unlikely but handle "en", "ar", etc.)
  if (SUPPORTED_CODES.includes(lower)) return lower;
  // Match by primary subtag
  const primary = lower.split('-')[0];
  if (SUPPORTED_CODES.includes(primary)) return primary;
  return undefined;
}

/**
 * Try to detect the device locale using expo-localization.
 * Returns a supported code or undefined.
 */
function detectDeviceLocale() {
  try {
    // expo-localization is an optional peer dependency
    // eslint-disable-next-line global-require
    const Localization = require('expo-localization');

    // SDK 52+: getLocales() returns an array; fall back to .locale for older SDKs.
    if (typeof Localization.getLocales === 'function') {
      const locales = Localization.getLocales();
      if (Array.isArray(locales)) {
        for (const loc of locales) {
          const code = normaliseLocale(loc.languageTag || loc.languageCode);
          if (code) return code;
        }
      }
    }

    // Legacy path
    if (Localization.locale) {
      return normaliseLocale(Localization.locale);
    }
  } catch (_) {
    // expo-localization not installed -- fall through
  }
  return undefined;
}

/**
 * Load the JSON strings for a given language code.
 */
function loadStrings(code) {
  const loader = LOCALE_LOADERS[code];
  if (loader) {
    try {
      return loader();
    } catch (_) {
      // locale file missing at runtime -- fall back to default
    }
  }
  // Always guarantee English strings exist
  if (code !== DEFAULT_LANGUAGE) {
    return loadStrings(DEFAULT_LANGUAGE);
  }
  return {};
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the i18n engine. Call once at app startup (e.g. in _layout.js).
 *
 * Resolution order:
 *   1. Stored preference (SecureStore)
 *   2. Device locale (expo-localization)
 *   3. DEFAULT_LANGUAGE ('en')
 *
 * Returns the resolved language code.
 */
export async function initI18n() {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    let stored;
    try {
      stored = await SecureStore.getItemAsync(STORAGE_KEY);
    } catch (_) {
      // SecureStore unavailable (e.g. Expo Go web) -- ignore
    }

    const storedCode = normaliseLocale(stored);
    const deviceCode = detectDeviceLocale();

    _currentLanguage = storedCode || deviceCode || DEFAULT_LANGUAGE;
    _strings = loadStrings(_currentLanguage);
    _initialized = true;

    return _currentLanguage;
  })();

  return _initPromise;
}

/**
 * Translate a key, with optional interpolation.
 *
 * @param {string} key   Dot-separated path, e.g. 'auth.signIn'
 * @param {object} [params]  Interpolation values, e.g. { name: 'Ayoub' }
 * @returns {string}  Translated string, or the raw key if not found.
 *
 * @example
 *   t('common.appName')                       // 'SafeCircle'
 *   t('home.kmAway', { distance: 2.4 })       // '2.4 km away'
 *   t('common.greeting', { name: 'Ayoub' })   // 'Hello, Ayoub'
 */
export function t(key, params) {
  if (!_initialized) {
    // Graceful degradation before init completes
    return params ? interpolate(key, params) : key;
  }

  const value = resolve(key, _strings);
  if (value === undefined) {
    // In dev, returning the raw key makes missing translations obvious.
    return params ? interpolate(key, params) : key;
  }

  return params ? interpolate(value, params) : value;
}

/**
 * Change the active language and persist the choice.
 *
 * @param {string} code  One of SUPPORTED_CODES (e.g. 'ar', 'ru').
 * @returns {Promise<string>} The code that was set.
 */
export async function setLanguage(code) {
  const normalised = normaliseLocale(code);
  if (!normalised) {
    throw new Error(`Unsupported language code: "${code}"`);
  }

  _currentLanguage = normalised;
  _strings = loadStrings(normalised);

  try {
    await SecureStore.setItemAsync(STORAGE_KEY, normalised);
  } catch (_) {
    // persist best-effort
  }

  return normalised;
}

/**
 * Return the current active language code.
 * @returns {string}
 */
export function getLanguage() {
  return _currentLanguage;
}

/**
 * Check whether the current language is RTL.
 * Useful for styling and layout direction.
 * @returns {boolean}
 */
export function isRTL() {
  const lang = SUPPORTED_LANGUAGES[_currentLanguage];
  return lang ? lang.rtl : false;
}
