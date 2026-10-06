/**
 * The registration path, end to end, in a real browser against a real
 * Firestore emulator.
 *
 * The rules tests next door prove the rules; this proves the rest of it — that
 * the SDK stays off every route it is not needed on, that a filled-in form
 * reaches Firestore, that the write passes those rules, and that the id on the
 * receipt is the id in the database. None of that is answerable without a
 * browser, because all of it depends on code that only runs in one.
 *
 * Playwright is not a dependency of this project: a browser download is a
 * heavy thing to put in a school fest's install, and this is run by hand
 * before a release rather than in a loop. Install it where you need it.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *
 *   # terminal 1
 *   npx firebase emulators:start --only firestore --project demo-quantum
 *
 *   # terminal 2 — VITE_REGISTRATION_MIRROR=false is not optional. Without
 *   # it every test submit is also POSTed to the organisers' live sheet.
 *   cat > .env.local <<'EOF'
 *   VITE_FIREBASE_API_KEY=demo-key
 *   VITE_FIREBASE_PROJECT_ID=demo-quantum
 *   VITE_FIREBASE_APP_ID=1:000000000000:web:demo
 *   VITE_FIREBASE_EMULATOR_HOST=127.0.0.1:8181
 *   VITE_REGISTRATION_MIRROR=false
 *   EOF
 *   npm run dev
 *
 *   # terminal 3
 *   node tests/registration-e2e.mjs
 *
 * CHROME overrides the browser binary; BASE_URL the dev server.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8080";
const failures = [];

function check(label, ok, detail = "") {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

const browser = await chromium.launch({
  ...(process.env.CHROME ? { executablePath: process.env.CHROME } : {}),
  args: ["--no-sandbox"],
});
const context = await browser.newContext();

/** Every URL the page asked for, per navigation. */
function recorder(page) {
  const urls = [];
  page.on("request", (r) => urls.push(r.url()));
  return urls;
}

console.log("\n1. Routes other than the form must not touch Firebase or any third party\n");

for (const path of ["/", "/events", "/team", "/resources", "/register"]) {
  const page = await context.newPage();
  const urls = recorder(page);
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  check(`${path} returns 200`, response.status() === 200, String(response.status()));
  const offOrigin = urls.filter(
    (u) => !u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:"),
  );
  const sdk = urls.filter((u) =>
    /index\.esm|firebase|firestore|googleapis|gstatic|recaptcha/i.test(u),
  );
  check(`${path} makes no off-origin request`, offOrigin.length === 0, offOrigin.join(" "));
  check(`${path} loads no Firebase chunk`, sdk.length === 0, sdk.join(" "));
  await page.close();
}

console.log("\n2. The form route itself must not load the SDK until it is submitted\n");

const page = await context.newPage();
const urls = recorder(page);
page.on("console", (m) => {
  if (m.type() === "error") console.log("      [console]", m.text());
});
page.on("pageerror", (e) => console.log("      [pageerror]", e.message));
const formResponse = await page.goto(`${BASE}/register/form`, {
  waitUntil: "networkidle",
});
check("the form route returns 200", formResponse.status() === 200, String(formResponse.status()));
check(
  "the form renders with entries open",
  (await page.locator("button[type=submit]").innerText()).includes("Submit registration"),
);
check(
  "no Firestore traffic before submit",
  urls.filter((u) => u.includes("127.0.0.1:8181")).length === 0,
);

console.log(
  "\n3. A real submit must reach the emulator, pass the rules and return an id per team\n",
);

const EMAIL = `coordinator.${Date.now()}@example.com`;

/** The teacher in-charge, who every entry carries. */
async function fillTeacher() {
  await page.fill("#field-teacher", "Meera Iyer");
  await page.fill("#field-teacherPhone", "+91 98100 54321");
  await page.fill("#field-teacherEmail", "meera.iyer@example.com");
}

/** A school entering two events, each with its own team and Discord IDs. */
async function fillForm() {
  await page.fill("#field-school", "Air Force Bal Bharati School");
  await page.fill("#field-email", EMAIL);
  await page.fill("#field-phone", "+91 98100 12345");
  await fillTeacher();
  await page.check("#field-event-quiz");
  await page.check("#field-event-pitch");
  await page.fill("#field-team-quiz-0-name", "Aarav Sharma");
  await page.selectOption("#field-team-quiz-0-grade", "11");
  await page.fill("#field-team-quiz-0-discord", "aarav_s");
  await page.fill("#field-team-quiz-1-name", "Ishita Rao");
  await page.selectOption("#field-team-quiz-1-grade", "10");
  await page.fill("#field-team-quiz-1-discord", "ishita.rao");
  await page.fill("#field-team-pitch-0-name", "Kabir Mehta");
  await page.selectOption("#field-team-pitch-0-grade", "12");
  await page.fill("#field-team-pitch-1-name", "Sara Ali");
  await page.selectOption("#field-team-pitch-1-grade", "12");
}

/** The receipt's ids, one per team, in the order the events are listed. */
const receiptIds = () =>
  page.locator(".receipt-id").evaluateAll((els) => els.map((el) => el.textContent.trim()));

await fillForm();
await page.click("button[type=submit]");
await page.waitForSelector(".notice-ok", { timeout: 25_000 });

const receipt = await page.locator(".notice-ok").innerText();
const ids = await receiptIds();
check(
  "the receipt carries an id for each team",
  ids.length === 2 && ids.every((i) => /^QV2-[0-9A-F]{8}$/.test(i)) && ids[0] !== ids[1],
  ids.join(" "),
);
check("the receipt reports new registrations", receipt.includes("Registrations received"));
check(
  "the request went to the emulator",
  urls.some((u) => u.includes("127.0.0.1:8181")),
);

console.log("\n4. The same teams submitted twice must come back as the same ids, once\n");

await page.goto(`${BASE}/register/form`, { waitUntil: "networkidle" });
await fillForm();
await page.click("button[type=submit]");
await page.waitForSelector(".notice-ok", { timeout: 25_000 });
const second = await page.locator(".notice-ok").innerText();
check(
  "the duplicates are recognised",
  second.includes("already registered"),
  second.split("\n")[0],
);
check(
  "the duplicates return the original ids",
  JSON.stringify(await receiptIds()) === JSON.stringify(ids),
  ids.join(" "),
);

const REST =
  "http://127.0.0.1:8181/v1/projects/demo-quantum/databases/(default)/documents/registrations";
const ADMIN = { headers: { Authorization: "Bearer owner" } };

check(
  "an anonymous REST read of the collection is refused",
  !(await fetch(REST).then((r) => r.ok)),
);

const docs = (await fetch(REST, ADMIN).then((r) => r.json())).documents ?? [];
check(
  "the emulator holds exactly one entry per team",
  docs.length === 2,
  `${docs.length} document(s)`,
);
const byEvent = Object.fromEntries(
  docs.map((d) => [d.fields.events.arrayValue.values.map((v) => v.stringValue).join(","), d]),
);
const quiz = byEvent["quiz"]?.fields;
const pitch = byEvent["pitch"]?.fields;
check(
  "each entry names exactly one event",
  Boolean(quiz && pitch),
  Object.keys(byEvent).join(" | "),
);
if (quiz && pitch) {
  check(
    "the stored ids match the receipt",
    quiz.id.stringValue === ids[0] && pitch.id.stringValue === ids[1],
  );
  check(
    "the document ids are sha-256 keys",
    docs.every((d) => /^[0-9a-f]{64}$/.test(d.name.split("/").pop())),
  );
  check(
    "each team's size was recorded",
    quiz.teamSize.integerValue === "2" && pitch.teamSize.integerValue === "2",
  );
  check(
    "the team lead and the rest of the team were recorded with their Discord IDs",
    quiz.student.stringValue === "Aarav Sharma" &&
      quiz.discord.stringValue === "aarav_s" &&
      quiz.members.arrayValue.values[0].mapValue.fields.name.stringValue === "Ishita Rao" &&
      quiz.members.arrayValue.values[0].mapValue.fields.discord.stringValue === "ishita.rao",
  );
  check(
    "a team with no Discord IDs is stored with them empty",
    pitch.student.stringValue === "Kabir Mehta" && pitch.discord.stringValue === "",
  );
  check(
    "every entry carries the teacher in-charge's name, phone and email",
    [quiz, pitch].every(
      (f) =>
        f.teacher?.stringValue === "Meera Iyer" &&
        f.teacherPhone?.stringValue === "9810054321" &&
        f.teacherEmail?.stringValue === "meera.iyer@example.com",
    ),
  );
}

console.log("\n5. Without the teacher in-charge, nothing is sent\n");

await page.goto(`${BASE}/register/form`, { waitUntil: "networkidle" });
await page.fill("#field-school", "Nowhere");
await page.fill("#field-email", `noteacher.${Date.now()}@example.com`);
await page.fill("#field-phone", "9810012345");
await page.check("#field-event-online-gaming");
await page.fill("#field-team-online-gaming-0-name", "Kiran");
await page.selectOption("#field-team-online-gaming-0-grade", "9");
await page.click("button[type=submit]");
const summary = await page.locator(".form-summary").innerText();
check(
  "the form asks for all three of the teacher's details",
  /teacher in-charge's name/i.test(summary) &&
    /teacher in-charge's phone/i.test(summary) &&
    /teacher in-charge's email/i.test(summary),
);
check(
  "and nothing reached the database",
  ((await fetch(REST, ADMIN).then((r) => r.json())).documents ?? []).length === 2,
);

console.log("\n6. The honeypot must never reach the database\n");

await page.goto(`${BASE}/register/form`, { waitUntil: "networkidle" });
await page.fill("#field-school", "Nowhere");
await page.fill("#field-email", `bot.${Date.now()}@example.com`);
await page.fill("#field-phone", "9810012345");
await fillTeacher();
await page.check("#field-event-online-gaming");
await page.fill("#field-team-online-gaming-0-name", "Bot");
await page.selectOption("#field-team-online-gaming-0-grade", "9");
await page.evaluate(() => {
  const input = document.querySelector("#field-website");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "http://spam.example");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.click("button[type=submit]");
await page.waitForSelector(".notice-ok", { timeout: 25_000 });
check("the bot is answered", (await receiptIds()).includes("QV2-RECEIVED"));

const after = await fetch(REST, ADMIN).then((r) => r.json());
check("nothing was written", (after.documents ?? []).length === 2);

await browser.close();

console.log(
  `\n${failures.length === 0 ? "all checks passed" : `${failures.length} FAILED: ${failures.join(", ")}`}\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
