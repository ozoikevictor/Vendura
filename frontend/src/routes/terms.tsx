import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/support/PolicyPage";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern access to Vendura by customers, sellers, and visitors. By using the platform, you agree to follow them."
      sections={[
        {
          title: "Accounts",
          content: (
            <p>
              You must provide accurate information, protect your login details, and use Vendura
              only for lawful purposes. You are responsible for activity performed through your
              account unless you promptly report unauthorized access.
            </p>
          ),
        },
        {
          title: "Marketplace role",
          content: (
            <p>
              Vendura provides technology that connects independent sellers with customers. Unless a
              product is explicitly sold by Vendura, the seller is responsible for product accuracy,
              quality, legality, availability, and fulfilment.
            </p>
          ),
        },
        {
          title: "Seller responsibilities",
          content: (
            <p>
              Sellers must publish truthful listings, maintain accurate stock and prices, fulfil
              accepted orders, communicate professionally, and comply with Nigerian consumer, tax,
              product, and advertising requirements.
            </p>
          ),
        },
        {
          title: "Customer responsibilities",
          content: (
            <p>
              Customers must provide correct delivery and payment information, inspect orders
              promptly, use messaging and dispute tools honestly, and avoid abusive, fraudulent, or
              unlawful activity.
            </p>
          ),
        },
        {
          title: "Payments, fees, and subscriptions",
          content: (
            <p>
              Applicable prices, delivery fees, platform fees, and subscription charges are shown
              before confirmation. Seller subscription plans renew according to the selected monthly
              plan. Payment-provider processing rules may also apply.
            </p>
          ),
        },
        {
          title: "Prohibited activity",
          content: (
            <p>
              Users may not list illegal, counterfeit, unsafe, stolen, or restricted products;
              manipulate reviews; impersonate others; evade fees; scrape the service; distribute
              malware; or use Vendura to threaten, deceive, or exploit anyone.
            </p>
          ),
        },
        {
          title: "Suspension and termination",
          content: (
            <p>
              Vendura may restrict or suspend accounts, listings, payments, or access when
              reasonably necessary to investigate abuse, comply with law, protect users, or enforce
              these terms.
            </p>
          ),
        },
        {
          title: "Disputes and liability",
          content: (
            <p>
              Users should first use Vendura support and dispute tools. Vendura is not responsible
              for indirect losses or matters outside reasonable control. Nothing in these terms
              removes rights that cannot legally be excluded.
            </p>
          ),
        },
      ]}
    />
  );
}
