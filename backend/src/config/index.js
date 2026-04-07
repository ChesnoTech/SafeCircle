// All configurable values in one place — no magic numbers in route files

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Geo
  geoGridSize: parseFloat(process.env.GEO_GRID_SIZE || '0.01'),
  defaultRadiusKm: parseInt(process.env.DEFAULT_RADIUS_KM || '10'),
  maxRadiusKm: parseInt(process.env.MAX_RADIUS_KM || '50'),
  maxAlertResults: parseInt(process.env.MAX_ALERT_RESULTS || '50'),

  // Rate limits
  globalRateLimit: parseInt(process.env.GLOBAL_RATE_LIMIT || '100'),
  uploadRateLimit: parseInt(process.env.UPLOAD_RATE_LIMIT || '10'),
  authRateLimit: parseInt(process.env.AUTH_RATE_LIMIT || '5'),
  intelRateLimit: parseInt(process.env.INTEL_RATE_LIMIT || '5'),

  // Upload
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),

  // Validation
  maxStringLength: parseInt(process.env.MAX_STRING_LENGTH || '2000'),
  minPasswordLength: parseInt(process.env.MIN_PASSWORD_LENGTH || '8'),

  // Push notifications
  fcmServerKey: process.env.FCM_SERVER_KEY || '',
  fcmProjectId: process.env.FCM_PROJECT_ID || '',
  fcmApiUrl: process.env.FCM_API_URL || 'https://fcm.googleapis.com/v1',
  fcmBatchSize: parseInt(process.env.FCM_BATCH_SIZE || '500'),

  // Notification tiers
  notificationTiers: {
    CRITICAL: { ttl: 0, priority: 'high', sound: 'critical', vibrate: true },
    HIGH: { ttl: 300, priority: 'high', sound: 'default', vibrate: true },
    MEDIUM: { ttl: 3600, priority: 'normal', sound: 'default', vibrate: false },
    LOW: { ttl: 86400, priority: 'normal', sound: null, vibrate: false },
  },

  // Alert urgency rules
  maxDailyNotifications: parseInt(process.env.MAX_DAILY_NOTIFICATIONS || '10'),

  // User roles (for role-based access: citizens, moderators, police, authority/Interpol)
  userRoles: ['citizen', 'moderator', 'officer', 'authority', 'admin'],

  // Supported languages (ISO 639-1)
  supportedLanguages: ['en', 'ar', 'ru', 'es', 'fr', 'tr', 'pt'],
  defaultLanguage: 'en',

  // Coordinates
  latitudeRange: { min: -90, max: 90 },
  longitudeRange: { min: -180, max: 180 },

  // Verification quiz
  verificationQuestionsCount: parseInt(process.env.VERIFICATION_QUESTIONS_COUNT || '3'),
  verificationPassThreshold: parseInt(process.env.VERIFICATION_PASS_THRESHOLD || '2'),
  verificationClaimExpiryHours: parseInt(process.env.VERIFICATION_CLAIM_EXPIRY_HOURS || '48'),

  // Stories pagination
  storiesPageSize: parseInt(process.env.STORIES_PAGE_SIZE || '20'),
  storyMaxLength: parseInt(process.env.STORY_MAX_LENGTH || '5000'),
};
