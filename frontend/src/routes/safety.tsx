import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/support/PolicyPage";
import { canonicalLink, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: seoMeta({
      title: "Safety Center | Vendraza",
      description:
        "Learn how to shop and sell safely on Vendraza using messages, checkout, marketplace protections, and account safety checks.",
      path: "/safety",
    }),
    links: canonicalLink("/safety"),
  }),
  component: SafetyPage,
});
function SafetyPage() {
  return (
    <PolicyPage
      eyebrow="Trust"
      title="Safety Center"
      summary="Use Vendraza's built-in tools and a few practical checks to shop and sell with confidence."
      sections={[
        {
          title: "Keep activity on Vendraza",
          content: (
            <p>
              Use Vendraza messages, checkout, and payment options. Be cautious when someone
              pressures you to move a conversation or payment to an unrelated account or
              application.
            </p>
          ),
        },
        {
          title: "Protect your account",
          content: (
            <p>
              Use a unique password, never share verification codes, and sign out of shared devices.
              Vendraza staff will never ask for your password or complete card details.
            </p>
          ),
        },
        {
          title: "Check products and sellers",
          content: (
            <p>
              Review product descriptions, prices, seller information, return terms, and customer
              feedback. Prices that are dramatically below normal market value deserve extra
              caution.
            </p>
          ),
        },
        {
          title: "Recognize suspicious behavior",
          content: (
            <p>
              Report requests for advance transfers outside checkout, fake payment confirmations,
              threats, counterfeit products, identity misuse, or attempts to obtain private
              financial information.
            </p>
          ),
        },
        {
          title: "Report a concern",
          content: (
            <p>
              Do not continue a suspicious transaction. Preserve messages and payment evidence, then{" "}
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                contact Vendraza support
              </Link>{" "}
              with the order or conversation details.
            </p>
          ),
        },
      ]}
    />
  );
}
