import { useState } from "react";
import { motion } from "framer-motion";

export default function Tabs({
  tabs,
  layoutId,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  layoutId: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 border-b border-line px-1 overflow-x-auto">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className="relative px-3 py-2.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
            style={{ color: active === i ? "var(--ink-900)" : "var(--ink-500)" }}
          >
            {t.label}
            {active === i && (
              <motion.span
                layoutId={layoutId}
                className="absolute left-2 right-2 -bottom-px h-0.5 bg-accent rounded-full"
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="pt-5">{tabs[active]?.content}</div>
    </div>
  );
}
