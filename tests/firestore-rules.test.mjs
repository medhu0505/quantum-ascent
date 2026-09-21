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
