const bcrypt = require('bcryptjs');
const { query, transaction } = require('../db');
const { config } = require('../config');

const sessions = new Map();

const VALID_ROLES = ['SHF', 'Buyer', 'Input Dealer', 'Logistics'];
const VALID_GENDERS = ['Male', 'Female'];
const VALID_POST_TYPES = ['SELL', 'BUY'];
const VALID_CATEGORIES = ['Crop', 'Livestock', 'Input'];
const VALID_UNITS = ['MT', 'Bags', 'Heads'];

function normalizePhone(phone) {
  if (!phone) {
    return '';
  }
  const cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return `+234${cleaned.slice(1)}`;
  }
  return `+${cleaned}`;
}

function normalizeText(text) {
  return String(text || '').trim();
}

function readMetaMessage(payload) {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) {
    return null;
  }

  const interactive = message.interactive?.button_reply || message.interactive?.list_reply;
  return {
    from: normalizePhone(message.from),
    text: normalizeText(message.text?.body || interactive?.id || interactive?.title || ''),
    messageId: message.id,
    raw: message,
  };
}

function readLocalMessage(payload) {
  if (!payload?.from || payload.text === undefined) {
    return null;
  }
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
    '2. Reply POST to create a BUY or SELL listing.',
    '3. Reply MENU anytime to restart.',
  ].join('\n');
}

function rolePrompt() {
  return 'Select primary role: SHF, Buyer, Input Dealer, or Logistics.';
}

function categoryPrompt() {
  return 'Select category: Crop, Livestock, or Input.';
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
  const numberValue = Number(input);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function findUserByPhone(phone) {
  const result = await query(
    `SELECT user_id, phone, full_name, primary_role, secondary_roles, is_bdsp, gender, lga, ward
     FROM users
     WHERE phone = $1`,
    [phone],
  );
  return result.rows[0] || null;
}

async function createWhatsAppUser(data) {
  const temporaryPassword = `whatsapp:${data.phone}:${Date.now()}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO users (
        onboarded_by, full_name, phone, password_hash, primary_role, secondary_roles,
        is_bdsp, bdsp_certified_by, gender, lga, ndpc_consent
      )
      VALUES ('Self', $1, $2, $3, $4, ARRAY[]::text[], false, NULL, $5, 'Chikun', true)
      RETURNING user_id, phone, full_name, primary_role, gender, lga`,
      [data.full_name, data.phone, passwordHash, data.primary_role, data.gender],
    );

    await client.query('INSERT INTO activity_log (user_id, action) VALUES ($1, $2)', [
      result.rows[0].user_id,
      'Registered user via WhatsApp',
    ]);

    return result.rows[0];
  });
}

async function createWhatsAppPost(userId, data) {
  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO posts (
        user_id, post_type, category, item_name, quantity, unit, price_per_unit, lga
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Chikun')
      RETURNING post_id, post_type, category, item_name, quantity, unit, price_per_unit, status`,
      [
        userId,
        data.post_type,
        data.category,
        data.item_name,
        data.quantity,
        data.unit,
        data.price_per_unit,
      ],
    );

    await client.query('INSERT INTO activity_log (user_id, action) VALUES ($1, $2)', [
      userId,
      `Created WhatsApp ${data.post_type} post ${result.rows[0].post_id}`,
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
    const existingUser = await findUserByPhone(session.data.phone);
    if (existingUser) {
      clearSession(phone);
      return [`This phone is already registered as ${existingUser.full_name}. Reply POST to create a listing.`];
    }
    session.step = 'role';
    return [rolePrompt()];
  }

  if (session.step === 'role') {
    const role = parseChoice(text, VALID_ROLES);
    if (!role) {
      return [rolePrompt()];
    }
    session.data.primary_role = role;
    session.step = 'gender';
    return ['Select gender for KPI reporting: Male or Female.'];
  }

  if (session.step === 'gender') {
    const gender = parseChoice(text, VALID_GENDERS);
    if (!gender) {
      return ['Select gender: Male or Female.'];
    }
    session.data.gender = gender;
    session.step = 'lga';
    return ['Enter LGA. For this POC, only Chikun is accepted.'];
  }

  if (session.step === 'lga') {
    if (text.toLowerCase() !== 'chikun') {
      return ['This POC is restricted to Chikun LGA. Reply Chikun to continue.'];
    }
    session.data.lga = 'Chikun';
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

    const user = await createWhatsAppUser(session.data);
    clearSession(phone);
    return [
      `Registration complete. Your V4V ID is ${user.user_id}. Reply POST to create a BUY or SELL listing.`,
    ];
  }

  return [menuText()];
}

async function handlePost(phone, text, session) {
  if (session.step === 'start') {
    const user = await findUserByPhone(phone);
    if (!user) {
      clearSession(phone);
      return ['You need to register first. Reply REGISTER to start onboarding.'];
    }
    session.data.user_id = user.user_id;
    session.step = 'post_type';
    return ['Create listing. Reply SELL or BUY.'];
  }

  if (session.step === 'post_type') {
    const postType = parseChoice(text, VALID_POST_TYPES);
    if (!postType) {
      return ['Reply SELL or BUY.'];
    }
    session.data.post_type = postType;
    session.step = 'category';
    return [categoryPrompt()];
  }

  if (session.step === 'category') {
    const category = parseChoice(text, VALID_CATEGORIES);
    if (!category) {
      return [categoryPrompt()];
    }
    session.data.category = category;
    session.step = 'item_name';
    return ['Enter item name, e.g. Maize, Soybean, NPK, or Goats.'];
  }

  if (session.step === 'item_name') {
    session.data.item_name = text;
    session.step = 'quantity';
    return ['Enter quantity as a number.'];
  }

  if (session.step === 'quantity') {
    const quantity = parseNumber(text);
    if (!quantity || quantity <= 0) {
      return ['Quantity must be a positive number.'];
    }
    session.data.quantity = quantity;
    session.step = 'unit';
    return ['Enter unit: MT, Bags, or Heads.'];
  }

  if (session.step === 'unit') {
    const unit = parseChoice(text, VALID_UNITS);
    if (!unit) {
      return ['Enter unit: MT, Bags, or Heads.'];
    }
    session.data.unit = unit;
    session.step = 'price';
    return ['Enter price per unit in Naira.'];
  }

  if (session.step === 'price') {
    const price = parseNumber(text);
    if (price === null || price < 0) {
      return ['Price must be zero or a positive number.'];
    }
    session.data.price_per_unit = price;

    const post = await createWhatsAppPost(session.data.user_id, session.data);
    clearSession(phone);
    return [
      `Listing created: ${post.post_id} ${post.post_type} ${post.quantity} ${post.unit} of ${post.item_name} at NGN ${post.price_per_unit}/unit. Status: ${post.status}.`,
    ];
  }

  return [menuText()];
}

async function handleInboundMessage(message) {
  const phone = normalizePhone(message.from);
  const text = normalizeText(message.text);
  const command = text.toLowerCase();

  if (!phone || !text) {
    return ['Please send a text message.'];
  }

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
  if (!session) {
    return [menuText()];
  }

  if (session.mode === 'register') {
    return handleRegister(phone, text, session);
  }

  if (session.mode === 'post') {
    return handlePost(phone, text, session);
  }

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
