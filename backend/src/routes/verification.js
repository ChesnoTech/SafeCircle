import { randomUUID } from 'crypto';
import { config } from '../config/index.js';

/**
 * Generate verification questions from an item's hidden details.
 * Questions are drawn from fields NOT shown publicly to verify true ownership.
 */
function generateQuestions(item, itemType) {
  const candidates = [];

  // Common fields across item types
  if (item.description) {
    const desc = typeof item.description === 'string'
      ? item.description
      : JSON.stringify(item.description);
    if (desc && desc.length > 0 && desc !== '{}') {
      candidates.push({
        id: randomUUID(),
        question: 'Describe the item in detail (brand, model, distinguishing features)',
        field: 'description',
        answer: desc,
      });
    }
  }

  if (item.category) {
    candidates.push({
      id: randomUUID(),
      question: 'What is the exact category or type of this item?',
      field: 'category',
      answer: item.category,
    });
  }

  // Lost/found item specific fields
  if (itemType === 'lost_item' || itemType === 'found_item') {
    if (item.photo_url) {
      candidates.push({
        id: randomUUID(),
        question: 'Describe the primary color(s) and any visible markings on the item',
        field: 'color_marks',
        answer: null, // Freeform - checked against description
      });
    }

    if (item.reward && item.reward > 0) {
      candidates.push({
        id: randomUUID(),
        question: 'What reward amount (if any) was originally set for this item?',
        field: 'reward',
        answer: String(item.reward),
      });
    }

    const addressField = itemType === 'lost_item' ? 'lost_address' : 'found_address';
    if (item[addressField]) {
      candidates.push({
        id: randomUUID(),
        question: 'What is the approximate address or location where this was last seen?',
        field: addressField,
        answer: item[addressField],
      });
    }

    if (item.lost_time_from) {
      candidates.push({
        id: randomUUID(),
        question: 'Approximately when was the item lost? (date and time)',
        field: 'lost_time_from',
        answer: item.lost_time_from,
      });
    }
  }

  // Missing person report specific fields
  if (itemType === 'missing_report') {
    if (item.clothing_description) {
      candidates.push({
        id: randomUUID(),
        question: 'Describe the clothing the person was last seen wearing',
        field: 'clothing_description',
        answer: item.clothing_description,
      });
    }

    if (item.circumstances) {
      candidates.push({
        id: randomUUID(),
        question: 'Describe the circumstances of the disappearance',
        field: 'circumstances',
        answer: item.circumstances,
      });
    }

    if (item.age) {
      candidates.push({
        id: randomUUID(),
        question: 'What is the age of the missing person?',
        field: 'age',
        answer: String(item.age),
      });
    }

    if (item.hair_color) {
      candidates.push({
        id: randomUUID(),
        question: 'What is the hair color of the missing person?',
        field: 'hair_color',
        answer: item.hair_color,
      });
    }

    if (item.height_min_cm || item.height_max_cm) {
      candidates.push({
        id: randomUUID(),
        question: 'What is the approximate height of the missing person (in cm)?',
        field: 'height',
        answer: item.height_min_cm && item.height_max_cm
          ? `${item.height_min_cm}-${item.height_max_cm}`
          : String(item.height_min_cm || item.height_max_cm),
      });
    }

    if (item.last_seen_address) {
      candidates.push({
        id: randomUUID(),
        question: 'Where was the person last seen? (address or location)',
        field: 'last_seen_address',
        answer: item.last_seen_address,
      });
    }
  }

  // Shuffle and pick the configured number of questions
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, config.verificationQuestionsCount);
}

/**
 * Fuzzy match scoring between a user answer and the expected answer.
 * Case-insensitive, trimmed, allows partial match.
 * Returns a score between 0 and 1.
 */
function fuzzyScore(userAnswer, expectedAnswer) {
  if (!userAnswer || !expectedAnswer) return 0;

  const normalize = (s) => String(s).toLowerCase().trim().replace(/\s+/g, ' ');
  const user = normalize(userAnswer);
  const expected = normalize(expectedAnswer);

  // Exact match
  if (user === expected) return 1;

  // One contains the other (partial match)
  if (user.includes(expected) || expected.includes(user)) return 0.8;

  // Word overlap scoring
  const userWords = new Set(user.split(' ').filter(w => w.length > 1));
  const expectedWords = new Set(expected.split(' ').filter(w => w.length > 1));

  if (expectedWords.size === 0) return 0;

  let matchCount = 0;
  for (const word of userWords) {
    for (const expWord of expectedWords) {
      if (word === expWord || word.includes(expWord) || expWord.includes(word)) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount / expectedWords.size;
}

/** Map item_type to the corresponding database table and owner column. */
const ITEM_TYPE_MAP = {
  lost_item: { table: 'lost_items', ownerCol: 'reporter_id' },
  found_item: { table: 'found_items', ownerCol: 'finder_id' },
  missing_report: { table: 'missing_reports', ownerCol: 'reporter_id' },
};

const VALID_ITEM_TYPES = Object.keys(ITEM_TYPE_MAP);
const MATCH_THRESHOLD = 0.5;

export async function verificationRoutes(fastify) {
  // --- Start ownership claim ---
  fastify.post('/items/:id/claim', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['item_type'],
        properties: {
          item_type: { type: 'string', enum: VALID_ITEM_TYPES },
        },
      },
    },
  }, async (request, reply) => {
    const { id: itemId } = request.params;
    const { item_type: itemType } = request.body;
    const claimantId = request.user.id;

    const mapping = ITEM_TYPE_MAP[itemType];
    if (!mapping) {
      return reply.code(400).send({ error: 'Invalid item type' });
    }

    // Fetch the item
    const itemResult = await fastify.db.query(
      `SELECT * FROM ${mapping.table} WHERE id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Item not found' });
    }

    const item = itemResult.rows[0];

    // Cannot claim your own item
    if (item[mapping.ownerCol] === claimantId) {
      return reply.code(400).send({ error: 'Cannot claim your own item' });
    }

    // Check for existing pending claim by this user
    const existingClaim = await fastify.db.query(
      `SELECT id FROM verification_claims
       WHERE item_type = $1 AND item_id = $2 AND claimant_id = $3 AND status = 'pending'`,
      [itemType, itemId, claimantId]
    );

    if (existingClaim.rows.length > 0) {
      return reply.code(409).send({ error: 'You already have a pending claim on this item' });
    }

    // Generate verification questions
    const questions = generateQuestions(item, itemType);

    if (questions.length === 0) {
      return reply.code(422).send({ error: 'Not enough item details to generate verification questions' });
    }

    // Store claim with questions (including answers stored server-side)
    const claimResult = await fastify.db.query(
      `INSERT INTO verification_claims (item_type, item_id, claimant_id, questions)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [itemType, itemId, claimantId, JSON.stringify(questions)]
    );

    const claim = claimResult.rows[0];

    // Return questions WITHOUT answers
    const safeQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
    }));

    reply.code(201);
    return {
      claimId: claim.id,
      questions: safeQuestions,
    };
  });

  // --- Submit answers to verification quiz ---
  fastify.post('/claims/:id/verify', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['answers'],
        properties: {
          answers: {
            type: 'array',
            items: {
              type: 'object',
              required: ['questionId', 'answer'],
              properties: {
                questionId: { type: 'string', format: 'uuid' },
                answer: { type: 'string', maxLength: config.maxStringLength },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id: claimId } = request.params;
    const { answers } = request.body;
    const userId = request.user.id;

    // Fetch the claim
    const claimResult = await fastify.db.query(
      `SELECT * FROM verification_claims WHERE id = $1`,
      [claimId]
    );

    if (claimResult.rows.length === 0) {
      return reply.code(404).send({ error: 'Claim not found' });
    }

    const claim = claimResult.rows[0];

    // Must be the claimant
    if (claim.claimant_id !== userId) {
      return reply.code(403).send({ error: 'Not your claim' });
    }

    // Must be pending
    if (claim.status !== 'pending') {
      return reply.code(400).send({ error: `Claim is already ${claim.status}` });
    }

    // Check expiry
    const expiryMs = config.verificationClaimExpiryHours * 60 * 60 * 1000;
    const claimAge = Date.now() - new Date(claim.created_at).getTime();
    if (claimAge > expiryMs) {
      await fastify.db.query(
        `UPDATE verification_claims SET status = 'expired' WHERE id = $1`,
        [claimId]
      );
      return reply.code(410).send({ error: 'Claim has expired' });
    }

    // Score answers
    const questions = claim.questions;
    let correctCount = 0;
    const scoredAnswers = [];

    for (const ans of answers) {
      const question = questions.find(q => q.id === ans.questionId);
      if (!question) continue;

      const score = question.answer
        ? fuzzyScore(ans.answer, question.answer)
        : 0;

      const passed = score >= MATCH_THRESHOLD;
      if (passed) correctCount++;

      scoredAnswers.push({
        questionId: ans.questionId,
        userAnswer: ans.answer,
        score,
        passed,
      });
    }

    const totalQuestions = questions.length;
    const overallScore = totalQuestions > 0 ? correctCount / totalQuestions : 0;
    const verified = correctCount >= config.verificationPassThreshold;
    const newStatus = verified ? 'verified' : 'rejected';

    // Update claim
    await fastify.db.query(
      `UPDATE verification_claims
       SET answers = $1, score = $2, status = $3,
           verified_at = CASE WHEN $3 = 'verified' THEN NOW() ELSE NULL END
       WHERE id = $4`,
      [JSON.stringify(scoredAnswers), overallScore, newStatus, claimId]
    );

    // On success: update match status and notify
    if (verified) {
      const mapping = ITEM_TYPE_MAP[claim.item_type];
      if (mapping) {
        // Get the item owner for notification
        const itemResult = await fastify.db.query(
          `SELECT ${mapping.ownerCol} AS owner_id FROM ${mapping.table} WHERE id = $1`,
          [claim.item_id]
        );

        if (itemResult.rows.length > 0) {
          const ownerId = itemResult.rows[0].owner_id;

          // If there's a match entry, update it to confirmed
          if (claim.item_type === 'lost_item' || claim.item_type === 'found_item') {
            await fastify.db.query(
              `UPDATE matches SET status = 'confirmed'
               WHERE (lost_item_id = $1 OR found_item_id = $1) AND status = 'pending'`,
              [claim.item_id]
            );
          }

          // Notify both parties via Socket.IO
          fastify.io.emit('claim_verified', {
            claimId,
            itemType: claim.item_type,
            itemId: claim.item_id,
            claimantId: userId,
            ownerId,
          });
        }
      }
    }

    return {
      verified,
      score: `${correctCount}/${totalQuestions}`,
      message: verified
        ? 'Ownership verified successfully. Both parties have been notified.'
        : `Verification failed. You answered ${correctCount} of ${totalQuestions} correctly (need ${config.verificationPassThreshold}).`,
    };
  });

  // --- List claims on your item ---
  fastify.get('/items/:id/claims', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          item_type: { type: 'string', enum: VALID_ITEM_TYPES },
        },
      },
    },
  }, async (request, reply) => {
    const { id: itemId } = request.params;
    const { item_type: itemType } = request.query;
    const userId = request.user.id;

    // Verify the user owns this item across all possible tables if type not specified
    const typesToCheck = itemType ? [itemType] : VALID_ITEM_TYPES;
    let isOwner = false;
    let foundType = null;

    for (const type of typesToCheck) {
      const mapping = ITEM_TYPE_MAP[type];
      const ownerCheck = await fastify.db.query(
        `SELECT id FROM ${mapping.table} WHERE id = $1 AND ${mapping.ownerCol} = $2`,
        [itemId, userId]
      );
      if (ownerCheck.rows.length > 0) {
        isOwner = true;
        foundType = type;
        break;
      }
    }

    if (!isOwner) {
      return reply.code(403).send({ error: 'You do not own this item' });
    }

    const claims = await fastify.db.query(
      `SELECT vc.id, vc.claimant_id, vc.status, vc.score, vc.created_at, vc.verified_at,
              u.name AS claimant_name
       FROM verification_claims vc
       JOIN users u ON u.id = vc.claimant_id
       WHERE vc.item_type = $1 AND vc.item_id = $2
       ORDER BY vc.created_at DESC`,
      [foundType, itemId]
    );

    return { claims: claims.rows, count: claims.rows.length };
  });
}
