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
  (await page.locator(".notice-todo").count()) === 0 &&
    (await page.locator("button[type=submit]").innerText()).includes("Next"),
);
check(
  "no Firestore traffic before submit",
  urls.filter((u) => u.includes("127.0.0.1:8181")).length === 0,
);

console.log(
  "\n3. A real submit must reach the emulator, pass the rules and return an id per event\n",
);

const EMAIL = `teacher.${Date.now()}@example.com`;
/** A team per event, as many students as each event takes. */
const TEAMS = {
  quiz: [
    ["Aarav Sharma", "11"],
    ["Ishita Rao", "10"],
  ],
  pitch: [
    ["Kabir Das", "12"],
    ["Nitya Menon", "12"],
  ],
};

/** Teacher In-Charge and events, a team per event, then the review and submit. */
async function register() {
  await page.fill("#field-teacher", "Meera Iyer");
  await page.fill("#field-school", "Air Force Bal Bharati School");
  await page.fill("#field-phone", "+91 98100 12345");
  await page.fill("#field-email", EMAIL);
  for (const event of Object.keys(TEAMS)) await page.check(`#field-event-${event}`);
  await page.click("button[type=submit]");
  for (const [event, team] of Object.entries(TEAMS)) {
    await page.click(`#tab-${event}`);
    for (const [i, [name, grade]] of team.entries()) {
      await page.fill(`#field-student-${event}-${i}-name`, name);
      await page.selectOption(`#field-student-${event}-${i}-grade`, grade);
    }
  }
  await page.click("button:has-text('Review registration')");
  await page.click("button[type=submit]");
  await page.waitForSelector("#register-receipt", { timeout: 25_000 });
  return {
    notice: await page.locator("#register-receipt").innerText(),
    ids: await page
      .locator(".receipt-id")
      .evaluateAll((els) => els.map((el) => el.textContent.match(/QV2-[0-9A-F]{8}/)?.[0] ?? "")),
  };
}

const first = await register();
check(
  "the receipt carries an id per event",
  first.ids.length === 2 && first.ids.every(Boolean),
  first.ids.join(" "),
);
check("the receipt reports a new registration", first.notice.includes("Registration received"));
check(
  "the request went to the emulator",
  urls.some((u) => u.includes("127.0.0.1:8181")),
);

console.log("\n4. The same entries submitted twice must come back with the same ids, once\n");

await page.goto(`${BASE}/register/form`, { waitUntil: "networkidle" });
const second = await register();
check(
  "the duplicate is recognised",
  second.notice.includes("already registered"),
  second.notice.split("\n")[0],
);
check(
  "the duplicate returns the original ids",
  second.ids.join() === first.ids.join(),
  second.ids.join(" "),
);

const REST =
  "http://127.0.0.1:8181/v1/projects/demo-quantum/databases/(default)/documents/registrations";
const ADMIN = { headers: { Authorization: "Bearer owner" } };

check(
  "an anonymous REST read of the collection is refused",
  !(await fetch(REST).then((r) => r.ok)),
);

const mine = async () =>
  ((await fetch(`${REST}?pageSize=300`, ADMIN).then((r) => r.json())).documents ?? []).filter(
    (d) => d.fields.emailLower?.stringValue === EMAIL,
  );
const docs = await mine();
check("the emulator holds one entry per event", docs.length === 2, `${docs.length} document(s)`);
for (const [i, event] of Object.keys(TEAMS).entries()) {
  const doc = docs.find((d) => d.fields.events.arrayValue.values[0].stringValue === event);
  const f = doc?.fields;
  check(`${event}: the stored id matches the receipt`, f?.id.stringValue === first.ids[i]);
  check(
    `${event}: the document id is the sha-256 key`,
    /^[0-9a-f]{64}$/.test(doc?.name.split("/").pop() ?? ""),
  );
  check(`${event}: the team size was recorded`, f?.teamSize.integerValue === "2");
  check(`${event}: the teacher was recorded`, f?.teacher?.stringValue === "Meera Iyer");
}

console.log("\n5. The honeypot must never reach the database\n");

await page.goto(`${BASE}/register/form`, { waitUntil: "networkidle" });
await page.fill("#field-teacher", "Bot");
await page.fill("#field-school", "Nowhere");
await page.fill("#field-email", `bot.${Date.now()}@example.com`);
await page.fill("#field-phone", "9810012345");
await page.check("#field-event-online-gaming");
await page.click("button[type=submit]");
await page.fill("#field-student-online-gaming-0-name", "Bot");
await page.selectOption("#field-student-online-gaming-0-grade", "9");
await page.click("button:has-text('Review registration')");
await page.evaluate(() => {
  const input = document.querySelector("#field-website");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, "http://spam.example");
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.click("button[type=submit]");
await page.waitForSelector("#register-receipt", { timeout: 25_000 });
check(
  "the bot is answered",
  (await page.locator(".receipt-list").innerText()).includes("QV2-RECEIVED"),
);

const after = (await fetch(`${REST}?pageSize=300`, ADMIN).then((r) => r.json())).documents ?? [];
check("nothing was written", !after.some((d) => d.fields.school?.stringValue === "Nowhere"));

await browser.close();

console.log(
  `\n${failures.length === 0 ? "all checks passed" : `${failures.length} FAILED: ${failures.join(", ")}`}\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
