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
const TYPES = ['individual', 'school'];
const MAX_MEMBERS = 5;
const LEAD_KEYS = ['type', 'student', 'school', 'grade', 'email', 'phone', 'discord'];
const MEMBER_KEYS = ['name', 'grade', 'phone', 'discord', 'email'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DISCORD = /^\S{2,37}$/;
const MAX_LEN = 120;
const MAX_BODY = 10000;

// 'Type' is appended after the member columns, not inserted up front with
// the rest of the lead fields — the sheet may already carry real rows from
// before this field existed, and inserting a column in the middle would
// misalign every one of them against the new header. Appending only adds a
// blank cell to old rows, which is what a schema addition is supposed to do.
function header_() {
  const h = ['Submitted at', 'Registration ID', 'Event', 'Team lead', 'School', 'Class',
    'Email', 'Phone', 'Discord', 'Team size'];
  for (let n = 2; n <= MAX_MEMBERS + 1; n++) {
    h.push('P' + n + ' name', 'P' + n + ' class', 'P' + n + ' phone',
      'P' + n + ' discord', 'P' + n + ' email');
  }
  h.push('Type');
  return h;
}

function ensureSheet_(ss, name) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    const h = header_();
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function sheet_() {
  return ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAME);
}

/**
 * Sheet tab names cannot hold [ ] * ? / \ : , must be non-empty, and Sheets
 * itself caps them at 100 characters — trimmed here well under that so a
 * long school name never collides with Google's own limit. Same school
 * name always sanitises to the same tab, which is what makes getSheetByName
 * find the existing one instead of spawning a duplicate per submission.
 */
function schoolSheetName_(school) {
  let name = String(school || '').replace(/[[\]*?/\\:]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!name) name = 'Unknown school';
  if (name.length > 95) name = name.slice(0, 95);
  if (name === SHEET_NAME) name = name + ' (school)';
  return name;
}

function schoolSheet_(school) {
  return ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), schoolSheetName_(school));
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

/**
 * An entry can entertain more than one event, so the form sends a list.
 * Older payloads sent a single `event` string; both are accepted, and both
 * come out as one canonically ordered list so the same selection always
 * writes the same cell and the duplicate check below can compare them.
 */
function events_(body) {
  const raw = Array.isArray(body.events)
    ? body.events
    : (body.event ? [body.event] : []);
  const seen = {};
  const picked = [];
  raw.forEach(function (value) {
    const id = text_(value);
    if (EVENTS.indexOf(id) < 0 || seen[id]) return;
    seen[id] = true;
    picked.push(id);
  });
  // Canonical order: the order EVENTS declares, not the order they arrived.
  return EVENTS.filter(function (id) { return seen[id]; });
}

function validate_(body) {
  const lead = {};
  LEAD_KEYS.forEach(function (k) { lead[k] = text_(body[k]); });
  if (TYPES.indexOf(lead.type) < 0) throw new Invalid('type');
  if (!lead.student) throw new Invalid('student');
  if (!lead.school) throw new Invalid('school');
  if (CLASSES.indexOf(lead.grade) < 0) throw new Invalid('grade');
  if (!EMAIL.test(lead.email)) throw new Invalid('email');
  if (shortPhone_(lead.phone)) throw new Invalid('phone');
  if (lead.discord && !DISCORD.test(lead.discord)) throw new Invalid('discord');
  lead.events = events_(body);
  if (lead.events.length === 0) throw new Invalid('events');

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
      const eventCell = lead.events.join(', ');
      for (let i = 0; i < rows.length; i++) {
        if (rows[i][1] === eventCell && String(rows[i][5]).toLowerCase() === email) {
          return json_({ ok: true, id: rows[i][0], duplicate: true });
        }
      }
    }

    const id = 'QV2-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    const row = [new Date(), id, lead.events.join(', '), lead.student, lead.school, lead.grade,
      lead.email, lead.phone, lead.discord, members.length + 1];
    for (let i = 0; i < MAX_MEMBERS; i++) {
      const m = members[i] || {};
      MEMBER_KEYS.forEach(function (k) { row.push(m[k] || ''); });
    }
    row.push(lead.type);
    const out = row.map(function (val, i) { return i === 0 ? val : escape_(val); });
    const formats = [out.map(function (_, i) { return i === 0 ? 'yyyy-mm-dd hh:mm:ss' : '@'; })];
    const range = sh.getRange(last + 1, 1, 1, out.length);
    range.setNumberFormats(formats);
    range.setValues([out]);
    SpreadsheetApp.flush();

    // Every entry names a school whether it is filed as individual or
    // school, so every entry gets a copy on that school's own tab -- the
    // master sheet above stays the record of truth and the only thing the
    // duplicate check reads, so a school-tab hiccup here must not turn an
    // already-saved registration into a reported failure.
    try {
      const schoolSh = schoolSheet_(lead.school);
      const schoolRange = schoolSh.getRange(schoolSh.getLastRow() + 1, 1, 1, out.length);
      schoolRange.setNumberFormats(formats);
      schoolRange.setValues([out]);
    } catch (schoolErr) {
      console.error('school sheet write failed: ' + schoolErr);
    }

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
