import { useEffect, useRef, useState } from "react";

export function useCompactStickyHeader(threshold = 24) {
  const ref = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const scroller = ref.current?.closest("main");
    if (!scroller) return;
    const update = () => setCompact(scroller.scrollTop > threshold);
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [threshold]);

  return { ref, compact };
}
