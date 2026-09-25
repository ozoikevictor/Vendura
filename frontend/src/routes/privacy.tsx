import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/support/PolicyPage";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains how Vendura collects, uses, protects, and shares information when customers and sellers use our marketplace."
      sections={[
        {
          title: "Information we collect",
          content: (
            <>
              <p>
                We collect account details such as your name, email address, telephone number,
                delivery address, store information, and the content you submit to Vendura.
              </p>
              <p>
                We also receive transaction, device, security, and usage information needed to
                operate the marketplace and prevent fraud.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <p>
              We use information to create accounts, process orders and payments, deliver products,
              operate seller tools, provide support, send service notifications, improve Vendura,
              and protect users and the platform.
            </p>
          ),
        },
        {
          title: "Payments and service providers",
          content: (
            <p>
              Payment details are handled by approved payment providers such as Paystack. Vendura
              may use infrastructure and security providers including Supabase, Render, Vercel, and
              Cloudflare. These providers process only the information needed to deliver their
              services.
            </p>
          ),
        },
        {
          title: "Sharing and disclosure",
          content: (
            <p>
              We share necessary order information between customers, sellers, delivery partners,
              and payment providers. We may disclose information where required by Nigerian law, to
              enforce our terms, or to protect people from fraud or harm.
            </p>
          ),
        },
        {
          title: "Retention and security",
          content: (
            <p>
              We retain information for as long as needed to provide Vendura, resolve disputes, meet
              financial and legal obligations, and prevent abuse. We use access controls, encryption
              in transit, rate limits, and human-verification controls, but no online service can
              promise absolute security.
            </p>
          ),
        },
        {
          title: "Your choices and rights",
          content: (
            <p>
              You may review or update your account information and request account deletion or a
              copy of your information by contacting Vendura. Some records may be retained when
              required for payments, fraud prevention, disputes, or legal compliance.
            </p>
          ),
        },
        {
          title: "Cookies and verification",
          content: (
            <p>
              Vendura uses local storage, cookies, and similar technology to keep sessions active,
              preserve carts, remember preferences, and protect forms. Cloudflare Turnstile
              processes limited browser and device signals to distinguish people from automated
              abuse.
            </p>
          ),
        },
        {
          title: "Contact",
          content: (
            <p>
              Questions about privacy can be submitted through the Contact Vendura page. We will
              publish a dedicated privacy email when the company email domain is active.
            </p>
          ),
        },
      ]}
    />
  );
}
