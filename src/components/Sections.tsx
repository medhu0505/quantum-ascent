import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { contact, events, faqs, team } from "@/data/quantum";

function SectionHead({ label, title, lead }: { label: string; title: string; lead?: string }) {
  return (
    <div className="max-w-2xl">
      <span className="eyebrow">{label}</span>
      <h2 className="mt-4 text-4xl font-bold sm:text-5xl">{title}</h2>
      {lead ? <p className="mt-4 text-base leading-relaxed text-muted-foreground">{lead}</p> : null}
    </div>
  );
}

export function TeamSection() {
  return (
    <section id="team" className="border-t border-border bg-ink/60 px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          label="Meet the team"
          title="The crew behind the descent"
          lead="Quantum is student-run end to end — events, tech, design, media and logistics. The full roster is announced closer to the fest."
        />
        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member, i) => (
            <div key={i} className="bg-card p-6">
              <div className="h-10 w-10 rounded-sm bg-gradient-to-br from-cyan/70 to-magenta/70" />
              <p className="mt-5 font-display text-lg font-semibold">{member.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EventsSection() {
  return (
    <section id="events" className="px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          label="Six events"
          title="Pick your arena"
          lead="Every event carries equal weight toward the overall school championship. Enter one, or enter all six."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const external = event.routing.mode === "brochure";
            return (
              <a
                key={event.id}
                href={event.routing.target}
                {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                className="group relative flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-cyan/60"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-70"
                  style={{
                    background:
                      event.accent === "cyan"
                        ? "var(--neon-cyan)"
                        : event.accent === "magenta"
                          ? "var(--neon-magenta)"
                          : "var(--neon-violet)",
                  }}
                />
                <span className="eyebrow">{event.team}</span>
                <h3 className="mt-3 text-2xl font-bold">{event.name}</h3>
                <p className="mt-1 text-sm text-cyan">{event.tagline}</p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </p>
                <ul className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                  {event.format.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="text-magenta">—</span>
                      {line}
                    </li>
                  ))}
                </ul>
                <span className="mt-6 font-display text-sm tracking-widest text-foreground uppercase transition-colors group-hover:text-cyan">
                  Register →
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-border px-6 py-24 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.3fr]">
        <SectionHead label="FAQ" title="Before you register" />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-display text-base">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export function ContactFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-card/40 px-6 py-20 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl font-bold">Quantum V2.0</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Inter-school tech &amp; culture fest
            <br />
            {contact.school}
          </p>
        </div>
        <div>
          <h2 className="font-display text-sm tracking-[0.25em] uppercase">Contact us</h2>
          <p className="mt-3 text-sm text-muted-foreground">{contact.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">{contact.phone}</p>
        </div>
        <div>
          <h2 className="font-display text-sm tracking-[0.25em] uppercase">Venue</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {contact.school}
            <br />
            {contact.address}
          </p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <h2 className="font-display text-sm tracking-[0.25em] uppercase">Sections</h2>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <a href="#events" className="hover:text-foreground">
                Events
              </a>
            </li>
            <li>
              <a href="#team" className="hover:text-foreground">
                Meet the team
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:text-foreground">
                FAQ
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-14 max-w-6xl border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Quantum V2.0 · {contact.school}
      </div>
    </footer>
  );
}
