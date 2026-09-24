import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { MarketplaceHeader } from "@/components/layout/MarketplaceHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { verifyPaystackPayment } from "@/services/paymentService";
import { getErrorMessage } from "@/services/api";
import { useCartStore } from "@/store/cart";

export const Route = createFileRoute("/payment/callback")({
  validateSearch: z.object({ reference: z.string().optional(), trxref: z.string().optional() }),
  head: () => ({ meta: [{ title: "Confirming Payment - Vendura" }] }),
  component: PaymentCallbackPage,
});

function PaymentCallbackPage() {
  const search = Route.useSearch();
  const clearCart = useCartStore((state) => state.clear);
  const [result, setResult] = useState<{ state: "checking" | "success" | "error"; message: string; orderId?: string }>({ state: "checking", message: "Confirming your payment with Paystack..." });

  useEffect(() => {
    const reference = search.reference ?? search.trxref ?? window.sessionStorage.getItem("vendura-pending-payment") ?? undefined;
    if (!reference) { setResult({ state: "error", message: "The payment reference is missing. Please open your orders to check the payment." }); return; }
    let active = true;
    verifyPaystackPayment(reference).then((payment) => {
      if (!active) return;
      window.sessionStorage.removeItem("vendura-pending-payment");
      window.sessionStorage.removeItem("vendura-paystack-attempt");
      clearCart();
      const orderId = payment.orders[0]?.id;
      setResult({ state: "success", message: "Your payment was verified and the seller has been notified.", ...(orderId ? { orderId } : {}) });
    }).catch((error) => {
      if (active) setResult({ state: "error", message: getErrorMessage(error, "We could not verify this payment yet.") });
    });
    return () => { active = false; };
  }, [clearCart, search.reference, search.trxref]);

  const Icon = result.state === "checking" ? LoaderCircle : result.state === "success" ? CheckCircle2 : XCircle;
  return <div className="min-h-screen lagoon-wash"><MarketplaceHeader /><main className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-16"><div className="w-full text-center">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-card"><Icon className={`h-8 w-8 ${result.state === "checking" ? "animate-spin text-primary" : result.state === "success" ? "text-success" : "text-destructive"}`} /></div>
    <h1 className="mt-4 text-2xl font-bold text-foreground">{result.state === "checking" ? "Confirming payment" : result.state === "success" ? "Payment successful" : "Payment not confirmed"}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{result.message}</p>
    {result.state !== "checking" && <div className="mt-6 flex justify-center gap-3">{result.orderId && <Link to="/customer/orders/$orderId" params={{ orderId: result.orderId }} className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">View order</Link>}<Link to="/customer/orders" className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground">All orders</Link></div>}
  </div></main><SiteFooter /></div>;
}
