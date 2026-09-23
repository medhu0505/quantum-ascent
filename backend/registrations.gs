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
 *
 * Where the site is configured for Firebase, Firestore takes the entry first
 * and this script receives a copy, so the sheet stays the surface the
 * organisers actually work in. Those copies arrive carrying the id Firestore
 * already issued, which suppliedId_ accepts so one registration does not end
 * up with two different ids in two places. A request without one is minted an
 * id here exactly as before, which is what happens when Firebase is not
 * configured and this script is the whole backend.
 *
 * Every accepted new entry is also confirmed by email to the address on the
 * form, carrying the id and everything that was submitted. That is sent from
 * here rather than from the site because this is the only part of the path
 * that runs on a server the organisers control. It is best-effort by design:
 * a row already in the sheet is a registration, so a mail failure is logged
 * and never turned into an error the entrant sees.
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

/* ------------------------------------------------------------------ *
 * Confirmation email
 *
 * Sent from this script rather than from the site, because this is the only
 * part of the registration path that runs on a server the organisers own.
 * The browser cannot send mail without shipping a provider's key in the
 * bundle, and the Firebase "Trigger Email" extension and Cloud Functions both
 * require the Blaze plan, which this project is deliberately not on.
 *
 * Display names and team sizes mirror `events` in src/data/quantum.ts. They
 * are repeated here because a bound Apps Script cannot import from the repo —
 * the same reason EVENTS above repeats the ids. Change one, change both.
 * ------------------------------------------------------------------ */

const FEST_NAME = 'Quantum V2.0';
const HOST_SCHOOL = 'Air Force Bal Bharati School';
const HOST_CITY = 'Lodhi Road, New Delhi';

/** Shown as the sender's name. The address itself is the script owner's. */
const MAIL_FROM_NAME = 'Quantum V2.0 Registrations';

/**
 * Where replies should land. Empty means replies go to the script owner,
 * which is correct until the fest has its own address — set it then, and set
 * `contact.email` in src/data/quantum.ts at the same time.
 */
const MAIL_REPLY_TO = '';

const EVENT_INFO = {
  'quiz': { name: 'Quiz', team: 'Solo or team of 2' },
  'film-making': { name: 'Film Making', team: 'Team of 3-5' },
  'ad-shoot': { name: 'Ad Shoot', team: 'Team of 2-4' },
  'surprise': { name: 'Surprise', team: 'Announced on the day' },
  'online-gaming': { name: 'Online Gaming', team: 'Solo or squad' },
  'pitch': { name: 'Pitch', team: 'Team of 2-3' }
};

// The site's own palette, converted from its oklch tokens in src/styles.css.
const INK = '#03050f';
const CYAN = '#4ae0ff';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

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
 * The registration id the caller already issued, if it is one.
 *
 * Only the exact QV2-XXXXXXXX shape is taken; anything else is discarded and
 * an id is minted below. The value is written to a cell, so it is length- and
 * pattern-checked here rather than trusted, same as every other field.
 */
function suppliedId_(body) {
  const id = text_(body && body.id).toUpperCase();
  return /^QV2-[0-9A-F]{8}$/.test(id) ? id : '';
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

/* ------------------------------------------------------------------ *
 * The confirmation email itself.
 * ------------------------------------------------------------------ */

/**
 * Escape for HTML. Every value below is entrant-supplied and lands inside
 * markup, so it is escaped rather than trusted — the same reasoning as
 * escape_() above, for a different sink. A name containing "&" or "<" would
 * otherwise break the layout at best.
 */
function html_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function eventName_(id) {
  return (EVENT_INFO[id] && EVENT_INFO[id].name) || id;
}

function eventTeam_(id) {
  return (EVENT_INFO[id] && EVENT_INFO[id].team) || '';
}

/** One label/value pair. An empty value renders nothing at all. */
function mailRow_(label, value) {
  if (!value) return '';
  return '<tr>' +
    '<td style="padding:11px 0;border-bottom:1px solid #e8eaf1;font:400 13px/1.45 ' + SANS +
      ';color:#5c6275;vertical-align:top;width:34%">' + html_(label) + '</td>' +
    '<td style="padding:11px 0 11px 18px;border-bottom:1px solid #e8eaf1;font:600 14px/1.5 ' + SANS +
      ';color:#11131c;vertical-align:top">' + html_(value) + '</td>' +
  '</tr>';
}

/** "Class 11 · 9876543210 · someone@example.com", skipping what is blank. */
function memberLine_(m) {
  const bits = [];
  if (m.grade) bits.push('Class ' + m.grade);
  if (m.phone) bits.push(m.phone);
  if (m.discord) bits.push(m.discord);
  if (m.email) bits.push(m.email);
  return bits.join(' · ');
}

function confirmationSubject_(id) {
  return FEST_NAME + ' — registration confirmed (' + id + ')';
}

/**
 * The plain-text alternative. Not a courtesy: a message with no text part
 * reads as spam to several filters, and this one has to survive whatever a
 * school laptop's mail client is.
 */
function confirmationText_(lead, members, id, when) {
  const L = [];
  L.push(FEST_NAME + ' — registration confirmed');
  L.push('');
  L.push('Your registration ID is ' + id);
  L.push('Keep it. The organisers will ask for it at the desk.');
  L.push('');
  L.push('EVENTS');
  lead.events.forEach(function (e) {
    const team = eventTeam_(e);
    L.push('  - ' + eventName_(e) + (team ? ' (' + team + ')' : ''));
  });
  L.push('');
  L.push('YOUR DETAILS');
  L.push('  Entered as   ' + (lead.type === 'school' ? 'School entry' : 'Individual or team'));
  L.push('  Team lead    ' + lead.student);
  L.push('  School       ' + lead.school);
  L.push('  Class        ' + lead.grade);
  L.push('  Email        ' + lead.email);
  L.push('  Phone        ' + lead.phone);
  if (lead.discord) L.push('  Discord      ' + lead.discord);
  L.push('  Team size    ' + (members.length + 1));
  L.push('  Submitted    ' + when);
  if (members.length) {
    L.push('');
    L.push('TEAM');
    members.forEach(function (m, i) {
      const line = memberLine_(m);
      L.push('  ' + (i + 2) + '. ' + m.name + (line ? ' — ' + line : ''));
    });
  }
  L.push('');
  L.push('WHAT HAPPENS NEXT');
  L.push('  Reporting times and venue details follow on this address closer to');
  L.push('  the fest. Anything above wrong, or your team changed? Reply to this');
  L.push('  email with your registration ID and we will correct it.');
  L.push('');
  L.push(HOST_SCHOOL + ', ' + HOST_CITY);
  L.push('This is an automated confirmation — replies reach the organisers.');
  return L.join('\n');
}

/**
 * The HTML part: one 600px table, inline styles, no external images and no
 * dependence on a <style> block, because Gmail, Outlook and the rest each
 * discard a different subset of those. Dark band, light body — a light body
 * survives a client's own dark-mode inversion far better than a dark one.
 */
function confirmationHtml_(lead, members, id, when) {
  const eventRows = lead.events.map(function (e) {
    const team = eventTeam_(e);
    return '<tr><td style="padding:9px 0;border-bottom:1px solid #e8eaf1">' +
      '<span style="font:600 15px/1.4 ' + SANS + ';color:#11131c">' + html_(eventName_(e)) + '</span>' +
      (team ? '<span style="font:400 13px/1.4 ' + SANS + ';color:#5c6275"> · ' + html_(team) + '</span>' : '') +
      '</td></tr>';
  }).join('');

  const memberRows = members.map(function (m, i) {
    const line = memberLine_(m);
    return '<tr><td style="padding:9px 0;border-bottom:1px solid #e8eaf1">' +
      '<span style="font:400 12px/1.4 ' + MONO + ';color:#8b90a3">' + (i + 2) + '</span>&nbsp;&nbsp;' +
      '<span style="font:600 14px/1.5 ' + SANS + ';color:#11131c">' + html_(m.name) + '</span>' +
      (line ? '<div style="padding-left:22px;font:400 13px/1.5 ' + SANS + ';color:#5c6275">' +
        html_(line) + '</div>' : '') +
      '</td></tr>';
  }).join('');

  const section = function (title, inner) {
    return '<tr><td style="padding:26px 32px 0 32px">' +
      '<div style="font:700 11px/1 ' + SANS + ';letter-spacing:.12em;text-transform:uppercase;color:#8b90a3;padding-bottom:6px">' +
        title + '</div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' + inner + '</table>' +
    '</td></tr>';
  };

  return [
'<!DOCTYPE html>',
'<html lang="en"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">',
'<title>' + html_(confirmationSubject_(id)) + '</title></head>',
'<body style="margin:0;padding:0;background:#f4f5f9">',
// Preview line, shown in the inbox list and nowhere else.
'<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">',
'Registration ID ' + html_(id) + ' — keep it for the desk.',
'&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f4f5f9" style="background:#f4f5f9">',
'<tr><td align="center" style="padding:28px 12px">',
// width="100%" with a max-width, not width="600": a fixed 600 wins over
// max-width in every engine tried and leaves a phone scrolling sideways.
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e6ef">',

// Masthead.
'<tr><td bgcolor="' + INK + '" style="background:' + INK + ';padding:26px 32px">',
'<div style="font:700 19px/1.2 ' + SANS + ';letter-spacing:.04em;color:#ffffff">',
'QUANTUM <span style="color:' + CYAN + '">V2.0</span></div>',
'<div style="font:400 13px/1.5 ' + SANS + ';color:#9aa1b8;padding-top:3px">',
html_(HOST_SCHOOL) + '</div></td></tr>',

// Headline.
'<tr><td style="padding:30px 32px 0 32px">',
'<div style="font:700 23px/1.3 ' + SANS + ';color:#11131c">Registration confirmed</div>',
'<div style="font:400 15px/1.6 ' + SANS + ';color:#4b5162;padding-top:8px">',
'Thanks, ' + html_(lead.student) + '. Your entry is in. Everything you submitted is ',
'below — check it over, and keep the ID for the registration desk.</div></td></tr>',

// The code.
'<tr><td style="padding:22px 32px 0 32px">',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
'<tr><td bgcolor="' + INK + '" align="center" style="background:' + INK + ';border-radius:10px;padding:20px 12px">',
'<div style="font:700 10px/1 ' + SANS + ';letter-spacing:.16em;text-transform:uppercase;color:#8b90a3">',
'Registration ID</div>',
// 24px rather than 26: twelve monospace characters at 26 overflow a 320px
// phone once the card's own padding is taken off.
'<div style="font:700 24px/1.3 ' + MONO + ';letter-spacing:.05em;color:' + CYAN + ';padding-top:8px">',
html_(id) + '</div></td></tr></table></td></tr>',

section('Events entered', eventRows),
section('Your details', [
  mailRow_('Entered as', lead.type === 'school' ? 'School entry' : 'Individual or team'),
  mailRow_('Team lead', lead.student),
  mailRow_('School', lead.school),
  mailRow_('Class', lead.grade),
  mailRow_('Email', lead.email),
  mailRow_('Phone', lead.phone),
  mailRow_('Discord', lead.discord),
  mailRow_('Team size', String(members.length + 1)),
  mailRow_('Submitted', when)
].join('')),
members.length ? section('Team', memberRows) : '',

// Next steps.
'<tr><td style="padding:26px 32px 0 32px">',
'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
'<tr><td bgcolor="#f6f8fd" style="background:#f6f8fd;border-radius:10px;padding:18px 20px">',
'<div style="font:700 11px/1 ' + SANS + ';letter-spacing:.12em;text-transform:uppercase;color:#8b90a3;padding-bottom:8px">',
'What happens next</div>',
'<div style="font:400 14px/1.65 ' + SANS + ';color:#4b5162">',
'Reporting times and venue details follow on this address closer to the fest. ',
'Anything above wrong, or your team changed? Reply to this email with your ',
'registration ID and we will correct it.</div>',
'</td></tr></table></td></tr>',

// Footer.
'<tr><td style="padding:24px 32px 30px 32px">',
'<div style="border-top:1px solid #e8eaf1;padding-top:18px;font:400 12px/1.6 ' + SANS + ';color:#8b90a3">',
html_(HOST_SCHOOL) + ' · ' + html_(HOST_CITY) + '<br>',
'This is an automated confirmation — replies reach the organisers.</div>',
'</td></tr>',

'</table></td></tr></table></body></html>'
  ].join('');
}

/**
 * Best-effort confirmation. Never throws into the caller: an entry that is
 * already in the sheet is registered whether or not the mail went out, and
 * reporting it as a failure would send the entrant round again to make a
 * duplicate. Failures land in the execution log instead.
 *
 * Consumer Gmail allows 100 recipients a day. Past that MailApp throws, so
 * the quota is checked first and a exhausted quota is logged loudly — the
 * row is safe, but somebody has to send that day's confirmations by hand.
 */
function sendConfirmation_(lead, members, id, when) {
  try {
    if (!EMAIL.test(lead.email)) return;
    if (MailApp.getRemainingDailyQuota() < 1) {
      console.error('mail quota exhausted; no confirmation sent for ' + id + ' (' + lead.email + ')');
      return;
    }
    const message = {
      to: lead.email,
      subject: confirmationSubject_(id),
      name: MAIL_FROM_NAME,
      htmlBody: confirmationHtml_(lead, members, id, when),
      body: confirmationText_(lead, members, id, when)
    };
    if (MAIL_REPLY_TO) message.replyTo = MAIL_REPLY_TO;
    MailApp.sendEmail(message);
  } catch (err) {
    console.error('confirmation email failed for ' + id + ': ' + err);
  }
}

/**
 * Sends one specimen to whoever runs it, from the editor. Nothing here is
 * reachable over the web — it exists so the template can be checked in a real
 * client after an edit, without putting a test row in the organisers' sheet.
 */
function previewConfirmationEmail() {
  const lead = {
    type: 'individual',
    student: 'Preview Entrant',
    school: HOST_SCHOOL,
    grade: '11',
    email: Session.getEffectiveUser().getEmail(),
    phone: '9876543210',
    discord: 'preview#0001',
    events: ['quiz', 'pitch']
  };
  const members = [
    { name: 'Second Member', grade: '11', phone: '9876543211', discord: '', email: '' },
    { name: 'Third Member', grade: '12', phone: '', discord: 'third#0003', email: 'third@example.com' }
  ];
  sendConfirmation_(lead, members, 'QV2-PREVIEW', stamp_(new Date()));
}

/** One format for the email, so it reads the same as the sheet's cell. */
function stamp_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "d MMM yyyy 'at' h:mm a");
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

    const id = suppliedId_(body) || 'QV2-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    const submittedAt = new Date();
    const row = [submittedAt, id, lead.events.join(', '), lead.student, lead.school, lead.grade,
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

    // Only a genuinely new row gets a confirmation. The duplicate branch
    // above returns before reaching here, which is deliberate: a resubmit
    // must not send a second copy, and since anyone can POST this endpoint
    // repeatedly, sending on duplicates would turn it into a way to flood
    // somebody else's inbox. Firestore's mirrored copies land here exactly
    // once per new registration, so they are covered by the same line.
    sendConfirmation_(lead, members, id, stamp_(submittedAt));

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
