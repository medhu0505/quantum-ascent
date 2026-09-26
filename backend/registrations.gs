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

/* ------------------------------------------------------------------ *
 * Guardrails on the sheet
 *
 * What is actually enforceable, stated plainly, because the difference
 * matters when somebody is relying on it:
 *
 *   - Collaborators can be stopped. A protected sheet refuses edits from
 *     everyone this script does not name, so an organiser given Editor
 *     access cannot clear a row or drop a tab.
 *   - The file's owner cannot be stopped. Google gives the owner authority
 *     over every protection in their own file; anything claiming otherwise
 *     is decoration. The owner gets a confirmation prompt instead, which is
 *     what actually catches the realistic failure — a stray select-all and
 *     Delete, not malice.
 *   - Deletions are detected either way. onChangeGuard runs on every
 *     structural change and mails the owner when rows, columns or a whole
 *     tab disappear, with the before and after counts.
 *
 * None of that is the real safety net. Firestore is: every entry is written
 * there first, under rules that deny delete to every client, so the sheet is
 * a convenience copy and losing it loses nothing but the organisers'
 * annotations. See the README.
 * ------------------------------------------------------------------ */

/** Marks the protections this script manages, so it never removes yours. */
const PROTECT_TAG = 'Quantum V2.0 registrations —';
const GUARD_TRIGGER = 'onChangeGuard';
const GUARD_PROP_ROWS = 'guard.registrationRows';

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

/**
 * Run from the editor: creates the master tab and the six event tabs,
 * backfills them, installs the guardrails, and triggers the auth prompt.
 * Re-running is harmless — every step is idempotent.
 *
 * Deliberately the first function in the file. The editor's Run button
 * defaults to the first one declared, and this is the one anybody opening
 * the project should be running; everything below it is called from here or
 * from the web app.
 */
function setup() {
  sheet_();
  console.log(rebuildEventTabs());
  console.log(installGuards());
}

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
  const existing = ss.getSheetByName(name);
  const sh = existing || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    const h = header_();
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  // A per-school tab created mid-fest would otherwise be the one unguarded
  // surface in the file. Only on creation: protecting on every call would
  // rewrite the protection on every single registration.
  if (!existing && name !== SHEET_NAME) {
    try {
      protectSheet_(sh, true);
    } catch (err) {
      console.error('could not protect new tab ' + name + ': ' + err);
    }
  }
  return sh;
}

function sheet_() {
  return ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_NAME);
}

/**
 * One tab per event, not per school.
 *
 * The six are fixed and known in advance, so the file has a stable shape
 * from the first registration to the last: the same seven tabs all fest,
 * rather than a new one appearing every time an unfamiliar school enters.
 * They are also the unit the day is actually run in — the person running
 * the quiz wants the quiz list, and does not care which schools are in it.
 *
 * An entry in three events is copied to three tabs. That is the point: each
 * tab is a complete list for whoever is running that event, not a slice
 * somebody has to reassemble. The master tab above stays the record of
 * truth and the only thing the duplicate check reads.
 *
 * Names come from EVENT_INFO, so they match the site and the email. They
 * contain none of [ ] * ? / \ : , which Sheets forbids in a tab name.
 */
function eventSheet_(ss, eventId) {
  return ensureSheet_(ss, eventName_(eventId));
}

/* ------------------------------------------------------------------ *
 * The guardrails themselves.
 * ------------------------------------------------------------------ */

/**
 * Protect one tab, idempotently.
 *
 * Re-running must not stack protections, and must not touch a protection
 * somebody added by hand — hence the tag on the description, which is the
 * only thing this removes.
 *
 * `warningOnly` is not a weaker version of the same thing, it is a different
 * control: a hard protection stops other editors and is invisible to the
 * owner, a warning stops nobody but asks everybody "are you sure". The
 * record of truth gets the first. The tabs organisers actually work in get
 * the second, because a tab you cannot write in is a tab somebody copies out
 * to work around, and then the copy is what gets updated.
 */
function protectSheet_(sh, warningOnly) {
  if (!sh) return;
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) {
    if (p.canEdit() && String(p.getDescription() || '').indexOf(PROTECT_TAG) === 0) p.remove();
  });

  const p = sh.protect().setDescription(
    PROTECT_TAG + (warningOnly ? ' warn before editing' : ' record of truth, do not edit by hand'));

  if (warningOnly) {
    p.setWarningOnly(true);
    return;
  }
  // Strip every named editor. The owner stays regardless — Google does not
  // allow a file's owner to be locked out of their own sheet — so this is a
  // guard against collaborators, and the alert below is the guard against
  // the owner.
  const editors = p.getEditors();
  if (editors.length) p.removeEditors(editors);
  if (p.canDomainEdit()) p.setDomainEdit(false);
}

/** Records how many entries the sheet holds, so a later loss is measurable. */
function noteRowCount_(sh) {
  try {
    const rows = Math.max(sh.getLastRow() - 1, 0);
    PropertiesService.getScriptProperties().setProperty(GUARD_PROP_ROWS, String(rows));
  } catch (err) {
    console.error('could not record row count: ' + err);
  }
}

/**
 * Installable onChange trigger: mails the owner when anything is removed.
 *
 * onChange fires after the fact and cannot veto, so this is detection, not
 * prevention — the point is that a deletion is never silent. It reports the
 * entry count before and after, which is what tells you whether to reach for
 * File > Version history.
 */
function onChangeGuard(e) {
  const type = (e && e.changeType) || '';
  if (['REMOVE_ROW', 'REMOVE_COLUMN', 'REMOVE_GRID'].indexOf(type) < 0) return;

  try {
    const props = PropertiesService.getScriptProperties();
    const before = Number(props.getProperty(GUARD_PROP_ROWS) || '0');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME);
    const after = sh ? Math.max(sh.getLastRow() - 1, 0) : -1;
    const lost = after < 0 ? before : Math.max(before - after, 0);

    const lines = [
      'Something was removed from the Quantum V2.0 registrations sheet.',
      '',
      '  Change      ' + type + (type === 'REMOVE_GRID' ? '  (a whole tab was deleted)' : ''),
      '  When        ' + stamp_(new Date()),
      '  Entries     ' + before + ' before, ' +
        (after < 0 ? 'the Registrations tab is GONE' : after + ' now'),
      ''
    ];
    if (lost > 0 || after < 0) {
      lines.push('That is a loss of ' + (after < 0 ? before : lost) + ' entr' +
        ((after < 0 ? before : lost) === 1 ? 'y' : 'ies') + '.');
    } else {
      lines.push('No entries were lost — the change was somewhere else in the file.');
    }
    lines.push('');
    lines.push('TO RECOVER');
    lines.push('  1. File > Version history > See version history, and restore the');
    lines.push('     last version from before ' + stamp_(new Date()) + '.');
    lines.push('  2. Nothing is actually lost either way. Every entry is in Firestore,');
    lines.push('     which denies delete to every client, so the sheet can be rebuilt');
    lines.push('     from it. Only organiser annotations live solely in the sheet.');
    lines.push('');
    lines.push(ss.getUrl());

    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: 'Quantum V2.0 — data removed from the registrations sheet',
      name: MAIL_FROM_NAME,
      body: lines.join('\n')
    });

    props.setProperty(GUARD_PROP_ROWS, String(Math.max(after, 0)));
  } catch (err) {
    console.error('deletion guard failed: ' + err);
  }
}

/**
 * Idempotent. Safe to run as often as you like, and worth re-running after
 * sharing the sheet with anybody new.
 */
function installGuards() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === GUARD_TRIGGER) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(GUARD_TRIGGER).forSpreadsheet(ss).onChange().create();

  const master = ensureSheet_(ss, SHEET_NAME);
  protectSheet_(master, false);
  ss.getSheets().forEach(function (sh) {
    if (sh.getName() !== SHEET_NAME) protectSheet_(sh, true);
  });

  noteRowCount_(master);
  return 'Guards installed: ' + ss.getSheets().length + ' tabs protected, ' +
    'deletion alerts on, ' + PropertiesService.getScriptProperties()
      .getProperty(GUARD_PROP_ROWS) + ' entries recorded.';
}

/**
 * Creates all six event tabs and copies every existing entry into the tabs
 * of the events it entered.
 *
 * Append-only and idempotent: it reads the Registration IDs already on each
 * event tab and adds only the rows that are missing, so it never clears or
 * rewrites anything — which also means it never trips the deletion alert,
 * and running it twice changes nothing the second time.
 */
function rebuildEventTabs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const master = ensureSheet_(ss, SHEET_NAME);
  const width = header_().length;
  const format = header_().map(function (_, i) { return i === 0 ? 'yyyy-mm-dd hh:mm:ss' : '@'; });
  const last = master.getLastRow();
  const rows = last > 1 ? master.getRange(2, 1, last - 1, width).getValues() : [];
  const added = {};

  EVENTS.forEach(function (eventId) {
    const tab = eventSheet_(ss, eventId);
    const tabLast = tab.getLastRow();
    const have = {};
    if (tabLast > 1) {
      tab.getRange(2, 2, tabLast - 1, 1).getValues().forEach(function (r) {
        have[String(r[0])] = true;
      });
    }

    // Column C holds the entry's event ids, joined — "quiz, pitch".
    const missing = rows.filter(function (r) {
      const ids = String(r[2] || '').split(',').map(function (s) { return s.trim(); });
      return r[1] && ids.indexOf(eventId) >= 0 && !have[String(r[1])];
    }).map(function (r) {
      return r.map(function (v, i) { return i === 0 ? v : escape_(v); });
    });

    if (missing.length) {
      const range = tab.getRange(tabLast + 1, 1, missing.length, width);
      range.setNumberFormats(missing.map(function () { return format; }));
      range.setValues(missing);
    }
    added[tab.getName()] = missing.length;
  });

  orderTabs_(ss);
  return 'Event tabs ready. Rows copied: ' + JSON.stringify(added);
}

/**
 * Registrations first, then the six events in the order the site lists them,
 * then anything else — and Registrations left as the open tab.
 *
 * Moves, never deletes. It exists because the file used to open on Google's
 * empty default tab, where an organiser looking for entries finds a blank
 * grid and reasonably concludes registrations are broken. Leftover tabs
 * (that default, the old per-school copies) are pushed to the end rather
 * than removed; deleting them is a decision for a person, not a script.
 */
function orderTabs_(ss) {
  const wanted = [SHEET_NAME].concat(EVENTS.map(eventName_));
  wanted.forEach(function (name, i) {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
  });
  const master = ss.getSheetByName(SHEET_NAME);
  if (master) ss.setActiveSheet(master);
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

/**
 * One label/value pair.
 *
 * An empty optional field prints "N/A" rather than dropping its row. A row
 * that vanishes leaves the entrant unable to tell whether they left the field
 * blank or the form lost it, and makes two confirmations of the same entry
 * shape differently for no reason a reader can see.
 */
function mailRow_(label, value) {
  const blank = !value;
  return '<tr>' +
    '<td style="padding:11px 0;border-bottom:1px solid #e8eaf1;font:400 13px/1.45 ' + SANS +
      ';color:#5c6275;vertical-align:top;width:34%">' + html_(label) + '</td>' +
    '<td style="padding:11px 0 11px 18px;border-bottom:1px solid #e8eaf1;font:' +
      (blank ? '400' : '600') + ' 14px/1.5 ' + SANS + ';color:' + (blank ? '#8b90a3' : '#11131c') +
      ';vertical-align:top">' + (blank ? 'N/A' : html_(value)) + '</td>' +
  '</tr>';
}

/**
 * "Class 11 · 9876543210 · someone@example.com", skipping what is blank —
 * every field under a member's name is optional, so a name on its own is a
 * complete entry rather than a missing one, and says so.
 */
function memberLine_(m) {
  const bits = [];
  if (m.grade) bits.push('Class ' + m.grade);
  if (m.phone) bits.push(m.phone);
  if (m.discord) bits.push(m.discord);
  if (m.email) bits.push(m.email);
  return bits.length ? bits.join(' · ') : 'No other details given';
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
  L.push('  Team lead    ' + lead.student);
  L.push('  School       ' + lead.school);
  L.push('  Class        ' + lead.grade);
  L.push('  Email        ' + lead.email);
  L.push('  Phone        ' + lead.phone);
  L.push('  Discord      ' + (lead.discord || 'N/A'));
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
// No "Entered as" row: individual-vs-school is how the organisers file an
// entry, not anything the entrant chose a word for or needs read back.
section('Your details', [
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

    // The baseline the deletion guard measures against. Updated here rather
    // than only at install time, so the count it reports is never stale.
    noteRowCount_(sh);

    // A copy on the tab of every event the entry is in. Each write is on its
    // own: the master row above is already saved and is the registration, so
    // one event tab failing must neither stop the others nor turn a saved
    // entry into a reported failure the entrant would resubmit over.
    const ss = sh.getParent();
    lead.events.forEach(function (eventId) {
      try {
        const eventSh = eventSheet_(ss, eventId);
        const eventRange = eventSh.getRange(eventSh.getLastRow() + 1, 1, 1, out.length);
        eventRange.setNumberFormats(formats);
        eventRange.setValues([out]);
      } catch (eventErr) {
        console.error('event sheet write failed for ' + eventId + ': ' + eventErr);
      }
    });

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
