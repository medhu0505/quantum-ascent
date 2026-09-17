/**
 * Quantum V2.0 registration backend.
 *
 * Bound to the "Quantum V2.0 Registrations" Google Sheet (Extensions > Apps
 * Script) and deployed as a web app: Execute as Me, access Anyone. The sheet
 * is the database; every accepted entry is one row.
 *
 * The site POSTs JSON with Content-Type text/plain so the browser skips the
 * CORS preflight, which Apps Script cannot answer. Everything the browser
 * checked is checked again here, because the endpoint is public and anyone
 * can call it without going through the form.
 */

const SHEET_NAME = 'Registrations';
const EVENTS = ['quiz', 'film-making', 'ad-shoot', 'surprise', 'online-gaming', 'pitch'];
const CLASSES = ['9', '10', '11', '12'];
const MAX_MEMBERS = 5;
const LEAD_KEYS = ['student', 'school', 'grade', 'email', 'phone', 'discord', 'event'];
const MEMBER_KEYS = ['name', 'grade', 'phone', 'discord', 'email'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISCORD = /^\S{2,37}$/;
const MAX_LEN = 120;
const MAX_BODY = 10000;

function header_() {
  const h = ['Submitted at', 'Registration ID', 'Event', 'Team lead', 'School', 'Class',
    'Email', 'Phone', 'Discord', 'Team size'];
  for (let n = 2; n <= MAX_MEMBERS + 1; n++) {
    h.push('P' + n + ' name', 'P' + n + ' class', 'P' + n + ' phone',
      'P' + n + ' discord', 'P' + n + ' email');
  }
  return h;
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    const h = header_();
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Run once from the editor: creates the tab and header, and triggers the auth prompt. */
function setup() {
  sheet_();
}

function Invalid(field) {
  this.field = field;
}

function text_(v) {
  return String(v == null ? '' : v).trim().slice(0, MAX_LEN);
}

/** Neutralise formula / DDE injection for anyone who opens or exports the sheet. */
function escape_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function shortPhone_(s) {
  return s.replace(/\D/g, '').length < 10;
}

function validate_(body) {
  const lead = {};
  LEAD_KEYS.forEach(function (k) { lead[k] = text_(body[k]); });
  if (!lead.student) throw new Invalid('student');
  if (!lead.school) throw new Invalid('school');
  if (CLASSES.indexOf(lead.grade) < 0) throw new Invalid('grade');
  if (!EMAIL.test(lead.email)) throw new Invalid('email');
  if (shortPhone_(lead.phone)) throw new Invalid('phone');
  if (lead.discord && !DISCORD.test(lead.discord)) throw new Invalid('discord');
  if (EVENTS.indexOf(lead.event) < 0) throw new Invalid('event');

  const raw = Array.isArray(body.members) ? body.members : [];
  if (raw.length > MAX_MEMBERS) throw new Invalid('members');
  const members = raw
    .map(function (m) {
      const o = {};
      MEMBER_KEYS.forEach(function (k) { o[k] = text_(m && m[k]); });
      return o;
    })
    .filter(function (m) { return MEMBER_KEYS.some(function (k) { return m[k]; }); });

  members.forEach(function (m) {
    if (!m.name) throw new Invalid('members');
    if (m.grade && CLASSES.indexOf(m.grade) < 0) throw new Invalid('members');
    if (m.email && !EMAIL.test(m.email)) throw new Invalid('members');
    if (m.phone && shortPhone_(m.phone)) throw new Invalid('members');
    if (m.discord && !DISCORD.test(m.discord)) throw new Invalid('members');
  });
  return { lead: lead, members: members };
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, service: 'quantum-v2-registrations' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_BODY) return json_({ ok: false, error: 'too_large' });
    const body = JSON.parse(raw);

    // Honeypot: a field real visitors never see. Bots get a quiet fake success.
    if (body.website) return json_({ ok: true, id: 'QV2-RECEIVED' });

    const v = validate_(body);
    const lead = v.lead;
    const members = v.members;

    lock.waitLock(20000);
    const sh = sheet_();

    // One entry per email per event. A resubmit returns the original ID.
    const last = sh.getLastRow();
    if (last > 1) {
      const rows = sh.getRange(2, 2, last - 1, 6).getValues(); // ID .. Email
      const email = lead.email.toLowerCase();
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1] === lead.event && String(rows[i][5]).toLowerCase() === email) {
          return json_({ ok: true, id: rows[i][0], duplicate: true });
        }
      }
    }

    const id = 'QV2-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    const row = [new Date(), id, lead.event, lead.student, lead.school, lead.grade,
      lead.email, lead.phone, lead.discord, members.length + 1];
    for (let i = 0; i < MAX_MEMBERS; i++) {
      const m = members[i] || {};
      MEMBER_KEYS.forEach(function (k) { row.push(m[k] || ''); });
    }
    const out = row.map(function (val, i) { return i === 0 ? val : escape_(val); });
    const range = sh.getRange(last + 1, 1, 1, out.length);
    range.setNumberFormats([out.map(function (_, i) { return i === 0 ? 'yyyy-mm-dd hh:mm:ss' : '@'; })]);
    range.setValues([out]);
    SpreadsheetApp.flush();

    return json_({ ok: true, id: id });
  } catch (err) {
    if (err instanceof Invalid) return json_({ ok: false, error: 'invalid', field: err.field });
    if (err instanceof SyntaxError) return json_({ ok: false, error: 'bad_json' });
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}
