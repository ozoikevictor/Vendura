import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/support/PolicyPage";
export const Route = createFileRoute("/delivery-policy")({ component: DeliveryPolicyPage });
function DeliveryPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Orders"
      title="Delivery Policy"
      summary="Delivery options, estimates, and charges are shown during checkout and may vary by seller, product, and destination."
      sections={[
        {
          title: "Delivery estimates",
          content: (
            <p>
              Estimated delivery dates are not guarantees. Sellers and delivery partners should
              provide updates when delays occur. Weather, traffic, address issues, public holidays,
              and events outside reasonable control may affect timing.
            </p>
          ),
        },
        {
          title: "Delivery charges",
          content: (
            <p>
              Charges are calculated at checkout based on the products, seller locations,
              destination, and selected delivery method. Orders from multiple sellers may have
              separate delivery charges and arrival times.
            </p>
          ),
        },
        {
          title: "Receiving an order",
          content: (
            <p>
              Provide a reachable telephone number and complete address. Inspect the package before
              confirming receipt where possible, and never share payment passwords or one-time
              security codes with a courier.
            </p>
          ),
        },
        {
          title: "Failed delivery",
          content: (
            <p>
              If delivery fails because the address or contact details are incorrect or no
              authorized recipient is available, another delivery charge may apply. Contact support
              promptly to rearrange delivery.
            </p>
          ),
        },
        {
          title: "Pickup",
          content: (
            <p>
              Where seller pickup is offered, wait for confirmation before travelling. Bring the
              order reference and valid identification if requested.
            </p>
          ),
        },
      ]}
    />
  );
}
