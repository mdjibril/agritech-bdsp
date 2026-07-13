const bcrypt = require('bcryptjs');
const { query, transaction } = require('../db');
const { config } = require('../config');

const sessions = new Map();

const VALID_ACTOR_TYPES = ['SHF', 'AGGREGATOR', 'INPUT_VENDOR', 'LOGISTICS', 'BDSP', 'KBS', 'AGRA', 'INVESTOR', 'V4V_ADMIN'];
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const VALID_CHANNELS = ['USSD', 'WHATSAPP', 'WEB', 'APP'];

function normalizePhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
  return `+${cleaned}`;
}

function normalizeText(text) {
  return String(text || '').trim();
}

function readMetaMessage(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return null;
  const interactive = message.interactive?.button_reply || message.interactive?.list_reply;
  return {
    from: normalizePhone(message.from),
    text: normalizeText(message.text?.body || interactive?.id || interactive?.title || ''),
    messageId: message.id,
    raw: message,
  };
}

function readLocalMessage(payload) {
  if (!payload?.from || payload.text === undefined) return null;
  return {
    from: normalizePhone(payload.from),
    text: normalizeText(payload.text),
    messageId: payload.message_id || `local-${Date.now()}`,
    raw: payload,
  };
}

function readInboundMessage(payload) {
  return readLocalMessage(payload) || readMetaMessage(payload);
}

function menuText() {
  return [
    'V4V Agritech menu:',
    '1. Reply REGISTER to onboard.',
    '2. Reply POST to create a SELL listing.',
    '3. Reply MENU anytime to restart.',
  ].join('\n');
}

function rolePrompt() {
  return 'Select role: SHF, AGGREGATOR, INPUT_VENDOR, LOGISTICS, BDSP, KBS, AGRA, INVESTOR, or V4V_ADMIN.';
}

function resetSession(phone, mode) {
  const session = { mode, step: 'start', data: {} };
  sessions.set(phone, session);
  return session;
}

function getSession(phone) {
  return sessions.get(phone);
}

function clearSession(phone) {
  sessions.delete(phone);
}

function parseChoice(input, validValues) {
  const normalized = input.toLowerCase();
  return validValues.find((value) => value.toLowerCase() === normalized);
}

function parseNumber(input) {
  const n = Number(input);
  return Number.isFinite(n) ? n : null;
}

async function findActorByPhone(phone) {
  const result = await query(
    `SELECT actor_id, phone, full_name, actor_type FROM actors WHERE phone = $1`,
    [phone],
  );
  return result.rows[0] || null;
}

async function createWhatsAppUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 12);

  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO actors (full_name, phone, password_hash, actor_type, channel, bank_name, account_number, gender, lga, state, kyc_status)
       VALUES ($1, $2, $3, $4, 'WHATSAPP', $5, $6, $7, 'Chikun', 'Kaduna', 'PENDING')
       RETURNING actor_id, phone, full_name, actor_type, channel, gender, lga, state`,
      [data.full_name, data.phone, passwordHash, data.actor_type, data.bank_name, data.account_number, data.gender],
    );

    await client.query('INSERT INTO activity_log (actor_id, action) VALUES ($1, $2)', [
      result.rows[0].actor_id,
      'Registered user via WhatsApp',
    ]);

    return result.rows[0];
  });
}

async function createWhatsAppPost(phone, data) {
  const actor = await findActorByPhone(phone);
  if (!actor) return null;

  // Create a simple transaction as a SELL listing
  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO transactions (buyer_id, seller_id, commodity, quantity_kg, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING tx_id, commodity, quantity_kg, unit_price, total_amount, status`,
      [1, actor.actor_id, data.item_name, data.quantity, data.price_per_unit]
    );

    await client.query('INSERT INTO activity_log (actor_id, action) VALUES ($1, $2)', [
      actor.actor_id,
      `Created WhatsApp SELL listing: ${data.quantity}kg ${data.item_name}`,
    ]);

    return result.rows[0];
  });
}

async function handleRegister(phone, text, session) {
  if (session.step === 'start') {
    session.step = 'name';
    return ['Welcome to V4V onboarding. What is your full name?'];
  }

  if (session.step === 'name') {
    session.data.full_name = text;
    session.step = 'phone';
    return ['Enter your phone number in international format, e.g. +2348102529947.'];
  }

  if (session.step === 'phone') {
    session.data.phone = normalizePhone(text);
    const existing = await findActorByPhone(session.data.phone);
    if (existing) {
      clearSession(phone);
      return [`This phone is already registered as ${existing.full_name}. Reply POST to create a listing.`];
    }
    session.step = 'role';
    return [rolePrompt()];
  }

  if (session.step === 'role') {
    const role = parseChoice(text, VALID_ACTOR_TYPES);
    if (!role) return [rolePrompt()];
    session.data.actor_type = role;
    session.step = 'gender';
    return ['Select gender for IFC KPI reporting: MALE, FEMALE, or OTHER.'];
  }

  if (session.step === 'gender') {
    const gender = parseChoice(text, VALID_GENDERS);
    if (!gender) return ['Select gender: MALE, FEMALE, or OTHER.'];
    session.data.gender = gender;
    session.step = 'bank_name';
    return ['Enter your bank name for payout routing (e.g., GTBank, Zenith, UBA).'];
  }

  if (session.step === 'bank_name') {
    session.data.bank_name = text;
    session.step = 'account_number';
    return ['Enter your bank account number for payouts.'];
  }

  if (session.step === 'account_number') {
    session.data.account_number = text;
    session.step = 'lga';
    return ['Enter LGA. For this POC, only Chikun is accepted.'];
  }

  if (session.step === 'lga') {
    if (text.toLowerCase() !== 'chikun') {
      return ['This POC is restricted to Chikun LGA. Reply Chikun to continue.'];
    }
    session.step = 'consent';
    return [
      'NDPC Consent Notice: V4V will store your identity, phone, role, location, and market activity for onboarding, marketplace matching, audit, and POC reporting. Reply YES to consent or NO to cancel.',
    ];
  }

  if (session.step === 'consent') {
    if (text.toLowerCase() !== 'yes') {
      clearSession(phone);
      return ['Registration cancelled. Your data was not saved. Reply REGISTER to start again.'];
    }
    session.step = 'password';
    return ['Choose a password for your account (minimum 8 characters).'];
  }

  if (session.step === 'password') {
    if (!text || String(text).trim().length < 8) {
      return ['Password must be at least 8 characters. Choose a password for your account.'];
    }
    session.data.password = String(text).trim();
    const actor = await createWhatsAppUser(session.data);
    clearSession(phone);
    return [
      `Registration complete. Your V4V ID is ACT_${String(actor.actor_id).padStart(3, '0')}. Reply POST to create a SELL listing.`,
    ];
  }

  return [menuText()];
}

async function handlePost(phone, text, session) {
  if (session.step === 'start') {
    const actor = await findActorByPhone(phone);
    if (!actor) {
      clearSession(phone);
      return ['You need to register first. Reply REGISTER to start onboarding.'];
    }
    session.step = 'item_name';
    return ['Enter item name, e.g. Maize, Soybean, Rice, or Cassava.'];
  }

  if (session.step === 'item_name') {
    session.data.item_name = text;
    session.step = 'quantity';
    return ['Enter quantity in kilograms as a number.'];
  }

  if (session.step === 'quantity') {
    const quantity = parseNumber(text);
    if (!quantity || quantity <= 0) return ['Quantity must be a positive number.'];
    session.data.quantity = quantity;
    session.step = 'price';
    return ['Enter price per kg in Naira (e.g., 450).'];
  }

  if (session.step === 'price') {
    const price = parseNumber(text);
    if (price === null || price < 0) return ['Price must be zero or a positive number.'];
    session.data.price_per_unit = price;

    const post = await createWhatsAppPost(phone, session.data);
    clearSession(phone);
    if (post) {
      return [
        `Listing created: ${post.quantity_kg}kg ${post.commodity} at ₦${post.unit_price}/kg. Total: ₦${post.total_amount}. Status: ${post.status}.`,
      ];
    }
    return ['Error creating listing. Try again.'];
  }

  return [menuText()];
}

async function handleInboundMessage(message) {
  const phone = normalizePhone(message.from);
  const text = normalizeText(message.text);
  const command = text.toLowerCase();

  if (!phone || !text) return ['Please send a text message.'];

  if (['menu', 'hi', 'hello', 'start'].includes(command)) {
    clearSession(phone);
    return [menuText()];
  }

  if (command === 'register') {
    return handleRegister(phone, text, resetSession(phone, 'register'));
  }

  if (command === 'post') {
    return handlePost(phone, text, resetSession(phone, 'post'));
  }

  const session = getSession(phone);
  if (!session) return [menuText()];

  if (session.mode === 'register') return handleRegister(phone, text, session);
  if (session.mode === 'post') return handlePost(phone, text, session);

  clearSession(phone);
  return [menuText()];
}

async function sendWhatsAppText(to, body) {
  if (!config.whatsappAccessToken || !config.whatsappPhoneNumberId) {
    return { skipped: true, reason: 'WhatsApp credentials are not configured' };
  }

  const isConsentPrompt = body.startsWith('NDPC Consent Notice:');
  const message = isConsentPrompt
    ? {
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: body },
          action: {
            buttons: [
              { type: 'reply', reply: { id: 'YES', title: 'Yes, I consent' } },
              { type: 'reply', reply: { id: 'NO', title: 'No' } },
            ],
          },
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: to.replace(/^\+/, ''),
        type: 'text',
        text: { body },
      };

  const response = await fetch(
    `https://graph.facebook.com/${config.whatsappApiVersion}/${config.whatsappPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

module.exports = {
  readInboundMessage,
  handleInboundMessage,
  sendWhatsAppText,
  normalizePhone,
};
