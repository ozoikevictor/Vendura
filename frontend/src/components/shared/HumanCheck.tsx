import { useEffect, useId, useRef } from "react";
const SCRIPT_ID = "cloudflare-turnstile-script";
const TEST_SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function HumanCheck({
  onToken,
  refreshKey = 0,
}: {
  onToken: (token: string) => void;
  refreshKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);
  const instanceId = useId();
  const siteKey = import.meta.env.DEV
    ? TEST_SITE_KEY
    : import.meta.env["VITE_TURNSTILE_SITE_KEY"] || "";

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !container.current || !window.turnstile || widgetId.current) return;
      const compact = container.current.clientWidth < 300;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        theme: "auto",
        size: compact ? "compact" : "flexible",
        appearance: "always",
        execution: "render",
        retry: "auto",
        "retry-interval": 3000,
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [instanceId, siteKey]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onTokenRef.current("");
    }
  }, [refreshKey]);

  if (!siteKey) {
    return (
      <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        Security verification is not configured.
      </p>
    );
  }

  return (
    <div
      ref={container}
      className="flex min-h-[65px] w-full justify-center overflow-hidden sm:block"
    />
  );
}
