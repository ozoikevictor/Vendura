import type { ReactNode } from "react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export type PolicySection = { title: string; content: ReactNode };

export function PolicyPage({
  eyebrow,
  title,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: PolicySection[];
}) {
  return (
    <div className="flex min-h-screen flex-col lagoon-wash">
      <MarketplaceHeader publicMode />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">{summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">Last updated: 25 September 2026</p>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {sections.map((section) => (
            <section key={section.title} className="py-7">
              <h2 className="font-display text-xl font-bold text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
