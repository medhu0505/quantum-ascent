import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { Value } from "@/components/site/Bits";
import { contact, isTodo, school } from "@/data/quantum";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () =>
    seo({
      title: "Contact",
      description: `Reach the Quantum V2.0 organising team at ${school.name}, ${school.city}.`,
      path: "/contact",
    }),
  component: Contact,
});

function Contact() {
  const rows = [
    { label: "Email", value: contact.email, href: (v: string) => `mailto:${v}` },
    { label: "Phone", value: contact.phone, href: (v: string) => `tel:${v.replace(/\s/g, "")}` },
    {
      label: "Instagram",
      value: contact.instagram,
      href: (v: string) => `https://instagram.com/${v.replace(/^@/, "")}`,
    },
  ];

  return (
    <PageShell
      title="Contact"
      lede="Questions about entry, scheduling or anything on the day go to the organising team."
    >
      <dl className="contact-list">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {isTodo(row.value) ? (
                <Value value={row.value} label={row.label} />
              ) : (
                <a href={row.href(row.value)}>{row.value}</a>
              )}
            </dd>
          </div>
        ))}
        <div>
          <dt>Venue</dt>
          <dd>
            {school.name}
            <br />
            {school.city}
          </dd>
        </div>
      </dl>
    </PageShell>
  );
}
