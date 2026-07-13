const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, readInboundMessage, handleRegister } = require('../src/services/whatsappBot');
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

test('asks for a password after consent before creating the user', async () => {
  const session = {
    step: 'consent',
    data: {
      full_name: 'Ada Lovelace',
      phone: '+2348100999001',
      primary_role: 'SHF',
      gender: 'Female',
      lga: 'Chikun',
    },
  };

  const responses = await handleRegister('+2348100999001', 'YES', session);

  assert.deepEqual(responses, ['Choose a password for your account (minimum 8 characters).']);
  assert.equal(session.step, 'password');
});
