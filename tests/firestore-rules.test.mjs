/**
 * firestore.rules, run against the emulator.
 *
 * The rules are the only server-side check a public registration form gets,
 * so they are tested the way a server would be: every field rejected on its
 * own, the duplicate limit exercised, and the derived document id proved to
 * be enforced rather than trusted. The happy path passing tells you almost
 * nothing — a rule that allows everything also passes it.
 *
 *   npx firebase emulators:exec --only firestore "node --test tests/"
 */

import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "quantum-rules-test";
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8181").split(":");

let testEnv;
let db;

/** The same derivation src/lib/registrations.ts performs in the browser. */
function keyFor(email, events) {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${events.join(",")}`)
    .digest("hex");
}

function idFor(key) {
  return `QV2-${key.slice(0, 8).toUpperCase()}`;
}

function member(overrides = {}) {
  return { name: "Ravi Menon", grade: "10", phone: "", discord: "", email: "", ...overrides };
}

/** A valid entry, with a unique email so each test writes its own document. */
function entry(overrides = {}) {
  const email = overrides.email ?? `lead-${randomUUID()}@example.com`;
  const events = overrides.events ?? ["quiz"];
  const members = overrides.members ?? [];
  const key = overrides.key ?? keyFor(email, events);
  const data = {
    id: idFor(key),
    type: "individual",
    student: "Aarav Sharma",
    school: "Air Force Bal Bharati School",
    grade: "11",
    email,
    emailLower: email.toLowerCase(),
    phone: "+91 98100 12345",
    discord: "",
    events,
    members,
    teamSize: members.length + 1,
    createdAt: serverTimestamp(),
    ...overrides.data,
  };
  return { key, data };
}

function write({ key, data }) {
  return setDoc(doc(db, "registrations", key), data);
}

/**
 * One valid entry with a single field replaced, and the document id
 * recomputed so the key binding still holds. Without that, a test for "this
 * email is rejected" would also be failing the hash check, and would still
 * pass if the email rule were deleted.
 */
function withField(field, value) {
  const base = entry();
  const data = { ...base.data, [field]: value };
  if (field === "email") {
    data.emailLower = String(value).toLowerCase();
  }
  const rebindable = field === "email" || field === "emailLower" || field === "events";
  if (!rebindable) return { key: base.key, data };
  const events = Array.isArray(data.events) ? data.events : [];
  const key = keyFor(String(data.emailLower ?? ""), events);
  return { key, data: { ...data, id: idFor(key) } };
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
  db = testEnv.unauthenticatedContext().firestore();
});

after(async () => {
  await testEnv?.cleanup();
});

describe("a valid registration", () => {
  it("is accepted from an unauthenticated client", async () => {
    await assertSucceeds(write(entry()));
  });

  /**
   * The worst case the form can produce, and the one that matters: rules are
   * capped at 1000 expression evaluations per request, and every optional
   * field left blank short-circuits its check. A team of five with nothing
   * blank, entering all six events, is the most expensive write there is. An
   * earlier draft of the rules passed every other test in this file and
   * failed only this one.
   */
  it("accepts the most expensive entry the form can produce", async () => {
    const full = (name, n) => ({
      name: name.padEnd(120, "."),
      grade: "12",
      phone: `+91 98${n}00 12345`,
      discord: `handle_${n}`.padEnd(37, "x"),
      email: `${name.toLowerCase()}.${n}@example.com`,
    });

    await assertSucceeds(
      write(
        entry({
          events: ["quiz", "film-making", "ad-shoot", "surprise", "online-gaming", "pitch"],
          members: [
            full("Ishita", 1),
            full("Dev", 2),
            full("Nikhil", 3),
            full("Sara", 4),
            full("Ravi", 5),
          ],
          data: {
            student: "A".repeat(120),
            school: "B".repeat(120),
            discord: "c".repeat(37),
          },
        }),
      ),
    );
  });
});

/** Every field at its limit, all six events, a teacher, and `members` full members. */
function worstCase({ members }) {
  const full = (name, n) => ({
    name: name.padEnd(120, "."),
    grade: "12",
    phone: `+91 98${n}00 12345`,
    discord: `handle_${n}`.padEnd(37, "x"),
    email: `${name.toLowerCase()}.${n}@example.com`,
  });
  return entry({
    events: ["quiz", "film-making", "ad-shoot", "surprise", "online-gaming", "pitch"],
    members: ["Ishita", "Dev", "Nikhil", "Sara", "Ravi"]
      .slice(0, members)
      .map((n, i) => full(n, i + 1)),
    data: {
      type: "school",
      teacher: "T".repeat(120),
      teacherPhone: "9".repeat(120),
      teacherEmail: `${"t".repeat(107)}@example.com`,
      student: "A".repeat(120),
      school: "B".repeat(120),
      discord: "c".repeat(37),
    },
  });
}

/**
 * An entry that names the school's teacher in-charge: their name, phone and
 * email beside the contact the confirmation goes to. Both forms send all
 * three; the rules take any of them on its own, so an entry from a page that
 * was open before they existed still goes through, and check each one that is
 * there.
 */
describe("a teacher in-charge's entry", () => {
  const teacher = {
    teacher: "Meera Iyer",
    teacherPhone: "+91 98100 54321",
    teacherEmail: "meera.iyer@example.com",
  };
  const teacherEntry = (overrides = {}) =>
    entry({
      ...overrides,
      members: overrides.members ?? [member({ name: "Rohan Gupta", grade: "11" })],
      data: { type: "school", ...teacher, discord: "", ...overrides.data },
    });

  it("is accepted with the teacher's name, phone and email", async () => {
    await assertSucceeds(write(teacherEntry()));
  });

  it("is accepted for the largest team an event takes", async () => {
    const team = ["Nitya", "Kabir", "Ishaan"].map((name) => member({ name, grade: "12" }));
    await assertSucceeds(write(teacherEntry({ events: ["film-making"], members: team })));
  });

  it("still accepts an entry with no teacher at all", async () => {
    await assertSucceeds(write(entry()));
  });

  it("still accepts a teacher's name on its own", async () => {
    const { key, data } = teacherEntry();
    const { teacherPhone: _phone, teacherEmail: _email, ...nameOnly } = data;
    await assertSucceeds(write({ key, data: nameOnly }));
  });

  it("takes the same email once per event", async () => {
    const email = `contact-${randomUUID()}@example.com`;
    await assertSucceeds(write(teacherEntry({ email, events: ["quiz"] })));
    await assertSucceeds(write(teacherEntry({ email, events: ["pitch"] })));
    await assertFails(write(teacherEntry({ email, events: ["quiz"] })));
  });

  const rejected = {
    "an empty teacher": { teacher: "" },
    "an over-long teacher": { teacher: "x".repeat(121) },
    "a teacher that is not a string": { teacher: 42 },
    "a teacher that is a list": { teacher: ["Meera Iyer"] },
    "a teacher phone with too few digits": { teacherPhone: "98100" },
    "a teacher phone that is words": { teacherPhone: "call the school" },
    "a teacher phone that is a number": { teacherPhone: 9810054321 },
    "an over-long teacher phone": { teacherPhone: "9".repeat(121) },
    "a teacher email with no domain": { teacherEmail: "meera@localhost" },
    "a teacher email with a space": { teacherEmail: "meera iyer@example.com" },
    "a teacher email that is a list": { teacherEmail: ["meera@example.com"] },
    "an over-long teacher email": { teacherEmail: `${"x".repeat(120)}@example.com` },
  };
  for (const [label, fields] of Object.entries(rejected)) {
    it(`rejects ${label}`, async () => {
      await assertFails(write(teacherEntry({ data: fields })));
    });
  }

  it("rejects a field the rules do not know, beside the teacher's", async () => {
    await assertFails(write(teacherEntry({ data: { teacherRole: "Principal" } })));
  });

  /**
   * The same worst case as above, with the teacher's three fields at their
   * limits too, and four members, a team of five. The largest team any event
   * takes is four, so a form never sends more than three members.
   */
  it("accepts the most expensive entry the form can produce, with a teacher", async () => {
    await assertSucceeds(write(worstCase({ members: 4 })));
  });

  /**
   * The edge of the 1000-evaluation cap, written down so nobody finds it by
   * accident: a full teacher costs enough that a lead and five full members
   * no longer fit under it. That is a team of six, which no event takes, so
   * no form sends one. If the rules are ever made cheaper this will start to
   * pass, and the test can go.
   */
  it("refuses a lead and five full members beside a full teacher, which no form sends", async () => {
    await assertFails(write(worstCase({ members: 5 })));
  });
});

describe("the collection is closed", () => {
  it("cannot be read", async () => {
    const { key, data } = entry();
    await assertSucceeds(write({ key, data }));
    await assertFails(getDoc(doc(db, "registrations", key)));
  });

  it("cannot be updated once written", async () => {
    const { key, data } = entry();
    await assertSucceeds(write({ key, data }));
    await assertFails(updateDoc(doc(db, "registrations", key), { school: "Somewhere else" }));
  });

  it("cannot be deleted", async () => {
    const { key, data } = entry();
    await assertSucceeds(write({ key, data }));
    await assertFails(deleteDoc(doc(db, "registrations", key)));
  });

  it("closes every other collection", async () => {
    await assertFails(setDoc(doc(db, "anything", "at-all"), { hello: "world" }));
  });
});

describe("the duplicate limit", () => {
  it("rejects the same email and events twice", async () => {
    const written = entry({ events: ["quiz", "pitch"] });
    await assertSucceeds(write(written));
    await assertFails(write(written));
  });

  it("allows the same email for a different set of events", async () => {
    const email = `lead-${randomUUID()}@example.com`;
    await assertSucceeds(write(entry({ email, events: ["quiz"] })));
    await assertSucceeds(write(entry({ email, events: ["pitch"] })));
  });

  it("cannot be sidestepped by choosing a different document id", async () => {
    const base = entry();
    await assertFails(write({ key: randomUUID().replace(/-/g, ""), data: base.data }));
  });

  it("cannot be sidestepped by reordering the events", async () => {
    // ["pitch", "quiz"] hashes elsewhere, so without the canonical-order rule
    // it would be a second document for the same entrant and the same events.
    const email = `lead-${randomUUID()}@example.com`;
    const events = ["pitch", "quiz"];
    await assertFails(write(entry({ email, events, key: keyFor(email, events) })));
  });

  it("cannot be sidestepped by repeating an event", async () => {
    const email = `lead-${randomUUID()}@example.com`;
    const events = ["quiz", "quiz"];
    await assertFails(write(entry({ email, events, key: keyFor(email, events) })));
  });
});

describe("the visible id", () => {
  it("must be the first eight digits of the key", async () => {
    await assertFails(write(withField("id", "QV2-DEADBEEF")));
  });

  it("must be uppercase", async () => {
    const base = entry();
    await assertFails(
      write({ key: base.key, data: { ...base.data, id: idFor(base.key).toLowerCase() } }),
    );
  });
});

describe("field validation", () => {
  const rejected = {
    "an unknown type": ["type", "teacher"],
    "an empty name": ["student", ""],
    "an over-long name": ["student", "x".repeat(121)],
    "an empty school": ["school", ""],
    "a class the fest does not take": ["grade", "8"],
    "a class as a number": ["grade", 11],
    "an address with no domain": ["email", "aarav@localhost"],
    "an address with a space": ["email", "aarav sharma@example.com"],
    "a phone number with too few digits": ["phone", "98100"],
    "a phone number that is words": ["phone", "call the school"],
    "a discord handle with a space": ["discord", "aarav sharma"],
    "no events": ["events", []],
    "an event that does not exist": ["events", ["archery"]],
    "events as a string": ["events", "quiz"],
    "a team size that does not match": ["teamSize", 9],
    "members as a string": ["members", "Ravi"],
    "a seventh person": ["members", [member(), member(), member(), member(), member(), member()]],
    "a member with no name": ["members", [member({ name: "" })]],
    "a member with a bad email": ["members", [member({ email: "ravi@" })]],
    "a member with a bad phone": ["members", [member({ phone: "12" })]],
    "a member with a bad class": ["members", [member({ grade: "7" })]],
    "a member with an extra field": ["members", [{ ...member(), nickname: "Rav" }]],
    "a member missing a field": ["members", [{ name: "Ravi Menon", grade: "10" }]],
  };

  for (const [label, [field, value]] of Object.entries(rejected)) {
    it(`rejects ${label}`, async () => {
      await assertFails(write(withField(field, value)));
    });
  }

  it("rejects a mismatched lowercase email", async () => {
    const base = entry();
    await assertFails(
      write({ key: base.key, data: { ...base.data, emailLower: "someone.else@example.com" } }),
    );
  });

  it("rejects an extra field", async () => {
    const base = entry();
    await assertFails(write({ key: base.key, data: { ...base.data, admin: true } }));
  });

  it("rejects a missing field", async () => {
    const base = entry();
    const { discord: _discord, ...rest } = base.data;
    await assertFails(write({ key: base.key, data: rest }));
  });

  it("rejects the honeypot field reaching the database at all", async () => {
    const base = entry();
    await assertFails(write({ key: base.key, data: { ...base.data, website: "http://spam" } }));
  });

  it("rejects a client-chosen timestamp", async () => {
    await assertFails(write(withField("createdAt", new Date("2020-01-01"))));
  });
});

describe("the key derivation the browser uses", () => {
  it("matches what the rules recompute", async () => {
    // Belt and braces: if this ever drifts, every submit fails in production
    // and the emulator is the only place it shows up first.
    const email = "Aarav.Sharma@Example.com";
    const events = ["quiz", "pitch"];
    const key = keyFor(email, events);
    assert.equal(key.length, 64);
    await assertSucceeds(write(entry({ email, events, key })));
  });
});
