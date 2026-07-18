const express = require('express');
const { query } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { notFound } = require('../../httpError');

const router = express.Router();

// GET /api/v1/training-records/courses
// Must be before /:course param route
router.get('/courses', requireAuth, requireRole('KBS', 'V4V_ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT tr.course_name, tr.provider,
              COUNT(*) AS total_enrolled,
              COUNT(*) FILTER (WHERE tr.status = 'COMPLETED') AS completed,
              COUNT(*) FILTER (WHERE tr.status = 'ENROLLED') AS enrolled,
              COUNT(*) FILTER (WHERE tr.status = 'FAILED') AS failed,
              COUNT(*) FILTER (WHERE a.gender = 'MALE') AS male,
              COUNT(*) FILTER (WHERE a.gender = 'FEMALE') AS female,
              COUNT(*) FILTER (WHERE a.gender = 'OTHER') AS other
       FROM training_records tr
       JOIN actors a ON a.actor_id = tr.actor_id
       GROUP BY tr.course_name, tr.provider
       ORDER BY tr.course_name`
    );
    res.json({ courses: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/training-records
router.get('/', requireAuth, requireRole('KBS', 'V4V_ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT tr.record_id, tr.actor_id, tr.course_name, tr.provider, tr.status,
              tr.created_at, tr.updated_at,
              a.full_name, a.phone, a.actor_type, a.gender, a.state, a.lga
       FROM training_records tr
       JOIN actors a ON a.actor_id = tr.actor_id
       ORDER BY tr.created_at DESC`
    );
    res.json({ records: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/training-records/:course
router.get('/:course', requireAuth, requireRole('KBS', 'V4V_ADMIN'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT tr.record_id, tr.actor_id, tr.course_name, tr.provider, tr.status,
              tr.created_at, tr.updated_at,
              a.full_name, a.phone, a.actor_type, a.gender, a.state, a.lga
       FROM training_records tr
       JOIN actors a ON a.actor_id = tr.actor_id
       WHERE tr.course_name = $1
       ORDER BY tr.created_at DESC`,
      [req.params.course]
    );
    if (!result.rows.length) return next(notFound('Course not found'));
    res.json({ records: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
