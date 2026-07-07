const express = require('express');
const { config } = require('../config');
const {
  handleInboundMessage,
  readInboundMessage,
  sendWhatsAppText,
} = require('../services/whatsappBot');

const router = express.Router();

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

router.post('/webhook', async (req, res, next) => {
  try {
    const message = readInboundMessage(req.body);
    if (!message) {
      res.json({ status: 'ignored', reason: 'No inbound WhatsApp message found' });
      return;
    }

    const replies = await handleInboundMessage(message);
    const delivery = [];

    for (const reply of replies) {
      delivery.push(await sendWhatsAppText(message.from, reply));
    }

    res.json({
      status: 'processed',
      to: message.from,
      replies,
      delivery,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
