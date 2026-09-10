import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/site/PageShell";
import { faqs } from "@/data/quantum";
import { seo } from "@/lib/seo";

/**
 * FAQ. Collapsed by default, one open at a time is not enforced — people
 * comparing two answers should be able to hold both open.
 *
 * Also emitted as FAQPage structured data, because these are the queries
 * that actually bring people to a fest site from search.
 */
export const Route = createFileRoute("/faq")({
  head: () =>
    seo({
      title: "FAQ",
      description:
        "Who can enter Quantum V2.0, whether you can do more than one event, fees, what to bring, and how winners are decided.",
      path: "/faq",
    }),
  component: Faq,
});

function Faq() {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <PageShell
      title="FAQ"
      lede="The questions we get most. If yours is not here, the organising team is on the Contact page."
    >
      <ul className="faq">
        {faqs.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <li key={item.q} className="faq-item">
              <h2>
                <button
                  type="button"
                  className="faq-trigger"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-trigger-${i}`}
                  onClick={() => toggle(i)}
                >
                  <span>{item.q}</span>
                  <span className="faq-mark" aria-hidden="true">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
              </h2>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                className="faq-panel"
                hidden={!isOpen}
              >
                <p>{item.a}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </PageShell>
  );
}
