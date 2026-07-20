const express = require('express');
const { query } = require('../../db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { notFound, badRequest } = require('../../httpError');

const router = express.Router();

const KBS_COURSES = [
  'Financial Literacy',
  'Climate-Smart Farming',
  'Good Agronomic Practices',
  'Digital Marketplace Skills',
];

// GET /api/v1/training-records/courses — available courses (any authenticated user)
router.get('/courses', requireAuth, async (req, res, next) => {
  try {
    const isAdmin = ['KBS', 'V4V_ADMIN'].includes(req.user.actor_type);
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

    // Always fill in all 4 KBS courses, even if no enrollments yet
    const myEnrollments = isAdmin
      ? { rows: [] }
      : await query(`SELECT course_name, status FROM training_records WHERE actor_id = $1`, [req.user.actor_id]);
    const enrolledMap = {};
    for (const r of myEnrollments.rows) enrolledMap[r.course_name] = r.status;

    const courses = KBS_COURSES.map((name) => {
      const stats = result.rows.find((r) => r.course_name === name) || {
        course_name: name,
        provider: 'KBS TRAINING HUB',
        total_enrolled: '0',
        completed: '0',
        enrolled: '0',
        failed: '0',
        male: '0',
        female: '0',
        other: '0',
      };
      const entry = { ...stats };
      if (!isAdmin) entry.my_status = enrolledMap[name] || null;
      return entry;
    });
    res.json({ courses });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/training-records/enroll — enroll in a course
router.post('/enroll', requireAuth, async (req, res, next) => {
  try {
    const { course_name } = req.body;
    if (!course_name) return next(badRequest('course_name is required'));
    if (!KBS_COURSES.includes(course_name)) {
      return next(badRequest(`Invalid course. Available: ${KBS_COURSES.join(', ')}`));
    }

    const existing = await query(
      'SELECT record_id, status FROM training_records WHERE actor_id = $1 AND course_name = $2',
      [req.user.actor_id, course_name]
    );
    if (existing.rows.length) {
      return next(badRequest(`Already ${existing.rows[0].status.toLowerCase()} in this course`));
    }

    const result = await query(
      `INSERT INTO training_records (actor_id, course_name, provider)
       VALUES ($1, $2, 'KBS TRAINING HUB')
       RETURNING record_id, course_name, provider, status, created_at`,
      [req.user.actor_id, course_name]
    );

    res.locals.auditAction = `Enrolled in course: ${course_name}`;
    res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/training-records/my — current user's training records
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT record_id, course_name, provider, status, created_at, updated_at
       FROM training_records WHERE actor_id = $1
       ORDER BY created_at DESC`,
      [req.user.actor_id]
    );
    res.json({ records: result.rows });
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
