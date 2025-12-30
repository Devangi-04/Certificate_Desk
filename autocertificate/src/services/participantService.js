const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { saveBufferToStorage } = require('../utils/fileStorage');
const { query } = require('../config/database');

function parseCSV(buffer) {
  const csvText = buffer.toString('utf8');
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function normalizeKey(key = '') {
  return key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildNormalizedRow(row) {
  return Object.entries(row || {}).reduce((acc, [key, value]) => {
    if (!key) return acc;
    const normKey = normalizeKey(key);
    if (!normKey) return acc;
    acc[normKey] = value;
    return acc;
  }, {});
}

function pickFirstValue(row, normalizedRow, candidates = []) {
  for (const key of candidates) {
    if (key.includes('.')) {
      // dot notation handled separately if needed
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key]) {
      return row[key];
    }
  }
  for (const key of candidates) {
    const normalizedKey = normalizeKey(key);
    if (normalizedRow[normalizedKey]) {
      return normalizedRow[normalizedKey];
    }
  }
  return '';
}

async function importParticipantsFromWorkbook(buffer, originalName) {
  const saved = await saveBufferToStorage(buffer, 'data', path.extname(originalName));
  let rows = [];
  
  // Check file extension and parse accordingly
  const fileExtension = path.extname(originalName).toLowerCase();
  
  if (fileExtension === '.csv') {
    // Parse CSV file
    rows = parseCSV(buffer);
  } else {
    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  const created = [];
  let skipped = 0;
  for (const row of rows) {
    const normalizedRow = buildNormalizedRow(row);

    const name = (
      pickFirstValue(row, normalizedRow, [
        'name',
        'Name',
        'full_name',
        'Full Name',
        'fullName',
        'studentname',
        'student_name',
        'Participant Name',
      ]) || ''
    )
      .toString()
      .trim();

    const email = (
      pickFirstValue(row, normalizedRow, [
        'email',
        'Email',
        'E-mail',
        'EMAIL',
        'email_id',
        'Email ID',
        'mail',
        'contact_email',
      ]) || ''
    )
      .toString()
      .trim()
      .toLowerCase();

    if (!email || !name) {
      skipped += 1;
      continue;
    }

    const mesId = (
      pickFirstValue(row, normalizedRow, ['mes_id', 'MES ID', 'mesid', 'mes']) || null
    )
      ?.toString()
      .trim() || null;

    const extraData = row && Object.keys(row).length ? row : null;

    const existing = await query('SELECT id FROM participants WHERE email = $1', [email]);
    let participantId;
    if (existing.length) {
      participantId = existing[0].id;
      await query(
        `UPDATE participants
         SET full_name = $1, mes_id = $2, extra_data = $3, source = $4
         WHERE id = $5`,
        [name, mesId, extraData, fileExtension, participantId]
      );
    } else {
      const [inserted] = await query(
        `INSERT INTO participants (full_name, email, mes_id, extra_data, source)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [name, email, mesId, extraData, fileExtension]
      );
      participantId = inserted.id;
    }
    created.push(participantId);
  }

  return {
    storedFile: saved,
    participantsProcessed: created.length,
    participantsSkipped: skipped,
  };
}

async function listParticipants() {
  return query('SELECT * FROM participants ORDER BY created_at DESC');
}

async function getParticipantsByIds(ids = []) {
  if (!ids.length) return [];
  return query('SELECT * FROM participants WHERE id = ANY($1::bigint[])', [ids]);
}

async function createParticipant({ full_name, email, mes_id = null, extra_data = null, source = 'manual' }) {
  if (!full_name || !email) {
    throw new Error('Full name and email are required');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query('SELECT id FROM participants WHERE email = $1', [normalizedEmail]);
  if (existing.length) {
    const error = new Error('Participant with this email already exists');
    error.status = 409;
    throw error;
  }
  const [inserted] = await query(
    `INSERT INTO participants (full_name, email, mes_id, extra_data, source)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [full_name.trim(), normalizedEmail, mes_id || null, extra_data ?? null, source]
  );
  return inserted;
}

async function updateParticipant(participantId, { full_name, email, mes_id = null, extra_data = null }) {
  const participant = await query('SELECT * FROM participants WHERE id = $1', [participantId]);
  if (!participant.length) {
    const error = new Error('Participant not found');
    error.status = 404;
    throw error;
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : participant[0].email;
  if (normalizedEmail !== participant[0].email) {
    const existing = await query('SELECT id FROM participants WHERE email = $1 AND id <> $2', [
      normalizedEmail,
      participantId,
    ]);
    if (existing.length) {
      const error = new Error('Another participant already uses this email');
      error.status = 409;
      throw error;
    }
  }

  const [updated] = await query(
    `UPDATE participants
     SET full_name = $1, email = $2, mes_id = $3, extra_data = $4, source = 'manual'
     WHERE id = $5
     RETURNING *`,
    [
      full_name ? full_name.trim() : participant[0].full_name,
      normalizedEmail,
      mes_id ?? participant[0].mes_id,
      extra_data ?? participant[0].extra_data,
      participantId,
    ]
  );

  return updated;
}

async function deleteParticipant(participantId) {
  await query('DELETE FROM participants WHERE id = $1', [participantId]);
  return { id: participantId };
}

module.exports = {
  importParticipantsFromWorkbook,
  listParticipants,
  getParticipantsByIds,
  createParticipant,
  updateParticipant,
  deleteParticipant,
};
