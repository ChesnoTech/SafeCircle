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

  // Coordinates
  latitudeRange: { min: -90, max: 90 },
  longitudeRange: { min: -180, max: 180 },
};
