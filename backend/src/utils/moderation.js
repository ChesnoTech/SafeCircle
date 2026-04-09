/**
 * Moderation utilities — role constants and reusable access-control preHandler.
 */

/** Roles allowed to review flags and take moderation actions. */
export const MODERATOR_ROLES = ['moderator', 'officer', 'authority', 'admin'];

/** Valid content types that can be flagged. */
export const FLAG_CONTENT_TYPES = [
  'missing_report',
  'lost_item',
  'found_item',
  'intel_report',
  'sighting',
];

/** Valid flag reasons. */
export const FLAG_REASONS = [
  'false_info',
  'spam',
  'inappropriate',
  'duplicate',
  'dangerous',
  'other',
];

/** Valid flag statuses. */
export const FLAG_STATUSES = ['pending', 'reviewed', 'actioned', 'dismissed'];

/** Valid moderation action types. */
export const ACTION_TYPES = ['hide', 'warn', 'remove', 'ban_user'];

/**
 * Maps content_type to the database table and owner column.
 * Used for self-flag prevention and for applying hide/remove actions.
 */
export const CONTENT_TYPE_MAP = {
  missing_report: { table: 'missing_reports', ownerCol: 'reporter_id', statusCol: 'status' },
  lost_item:      { table: 'lost_items',      ownerCol: 'reporter_id', statusCol: 'status' },
  found_item:     { table: 'found_items',      ownerCol: 'finder_id',  statusCol: 'status' },
  intel_report:   { table: 'intel_reports',     ownerCol: null,         statusCol: null },
  sighting:       { table: 'sightings',         ownerCol: 'spotter_id', statusCol: null },
};

/**
 * Returns a Fastify preHandler that verifies the authenticated user has one of
 * the allowed roles.  Must be used AFTER fastify.authenticate in the
 * preHandler chain so that request.user is populated.
 *
 * @param {string[]} roles — allowed roles
 * @returns {(request, reply) => Promise<void>}
 */
export function requireRole(roles) {
  return async function checkRole(request, reply) {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Forbidden: insufficient role' });
    }
  };
}
