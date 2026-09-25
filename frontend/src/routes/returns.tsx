import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/support/PolicyPage";
export const Route = createFileRoute("/returns")({ component: ReturnsPage });
function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Customer care"
      title="Returns and Refunds"
      summary="Our return process is designed to protect customers while giving sellers a fair opportunity to resolve order problems."
      sections={[
        {
          title: "Return eligibility",
          content: (
            <p>
              Contact Vendura within 7 days of delivery when an item is damaged, defective,
              materially different from its listing, counterfeit, incomplete, or incorrect. The item
              should remain unused and include its original packaging where reasonably possible.
            </p>
          ),
        },
        {
          title: "Items that may not be returnable",
          content: (
            <p>
              Opened personal-care items, perishable goods, customized products, digital items, and
              products damaged after delivery may not qualify unless they were defective or
              incorrectly supplied.
            </p>
          ),
        },
        {
          title: "How to request a return",
          content: (
            <p>
              Open the relevant order, describe the problem, and provide clear photos or video where
              appropriate. Keep the product and packaging until Vendura or the seller provides
              return instructions.
            </p>
          ),
        },
        {
          title: "Return delivery costs",
          content: (
            <p>
              The seller is generally responsible when the item is defective, incorrect,
              counterfeit, or significantly misdescribed. A customer may be responsible when a
              discretionary change-of-mind return is accepted.
            </p>
          ),
        },
        {
          title: "Refund timing",
          content: (
            <p>
              Approved refunds are sent to the original payment method or another agreed method
              after the returned item is received and assessed. Bank and payment-provider processing
              times may vary.
            </p>
          ),
        },
      ]}
    />
  );
}
