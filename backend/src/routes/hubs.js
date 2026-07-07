const express = require('express');
const { query } = require('../db');
const { requireBdsp } = require('../middleware/auth');
const { badRequest } = require('../httpError');
const {
  VALID_CATEGORIES,
  assertOneOf,
  asPositiveNumber,
  asStringArray,
  requireFields,
} = require('../validation');

const router = express.Router();

router.get('/', requireBdsp, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT hub_id, formed_by_bdsp_id, category, item_name, member_user_ids,
              logistics_user_id, total_quantity, status
       FROM hubs
       WHERE formed_by_bdsp_id = $1
       ORDER BY hub_id DESC`,
      [req.user.user_id],
    );
    res.json({ hubs: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireBdsp, async (req, res, next) => {
  try {
    requireFields(req.body, ['hub_id', 'category', 'item_name', 'member_user_ids', 'total_quantity']);
    assertOneOf(req.body.category, VALID_CATEGORIES, 'category');
    const memberUserIds = asStringArray(req.body.member_user_ids, 'member_user_ids');
    if (memberUserIds.length === 0) {
      throw badRequest('member_user_ids must contain at least one user id');
    }
    if (req.body.status) {
      assertOneOf(req.body.status, ['Formed', 'Logistics-Assigned', 'Completed'], 'status');
    }

    const result = await query(
      `INSERT INTO hubs (
        hub_id, formed_by_bdsp_id, category, item_name, member_user_ids,
        logistics_user_id, total_quantity, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'Formed'))
      RETURNING hub_id, formed_by_bdsp_id, category, item_name, member_user_ids,
                logistics_user_id, total_quantity, status`,
      [
        req.body.hub_id,
        req.user.user_id,
        req.body.category,
        req.body.item_name,
        memberUserIds,
        req.body.logistics_user_id || null,
        asPositiveNumber(req.body.total_quantity, 'total_quantity'),
        req.body.status || null,
      ],
    );

    res.locals.auditAction = `Formed hub ${result.rows[0].hub_id}`;
    res.status(201).json({ hub: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
