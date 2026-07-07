const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, readInboundMessage } = require('../src/services/whatsappBot');
const { pool } = require('../src/db');

after(() => pool.end());

test('reads the local webhook test payload', () => {
  const message = readInboundMessage({ from: '0810 099 9000', text: 'REGISTER' });
  assert.equal(message.from, '+2348100999000');
  assert.equal(message.text, 'REGISTER');
});

test('reads a Meta Cloud API text message', () => {
  const payload = {
    entry: [{ changes: [{ value: { messages: [{ from: '2348100999000', type: 'text', text: { body: 'MENU' } }] } }] }],
  };

  const message = readInboundMessage(payload);
  assert.equal(message.from, '+2348100999000');
  assert.equal(message.text, 'MENU');
});

test('reads a Meta interactive consent button reply', () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '2348100999000',
            type: 'interactive',
            interactive: { type: 'button_reply', button_reply: { id: 'YES', title: 'Yes, I consent' } },
          }],
        },
      }],
    }],
  };

  const message = readInboundMessage(payload);
  assert.equal(message.from, '+2348100999000');
  assert.equal(message.text, 'YES');
});

test('normalizes Nigerian local and international phone numbers', () => {
  assert.equal(normalizePhone('08100999000'), '+2348100999000');
  assert.equal(normalizePhone('2348100999000'), '+2348100999000');
});
