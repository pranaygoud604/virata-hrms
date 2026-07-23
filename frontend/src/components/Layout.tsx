import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import IconRail from "./IconRail";
import TopBar from "./TopBar";
import CommandPalette from "./CommandPalette";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-0">
      <CommandPalette />

      <div className="flex">
        <div className="hidden md:block sticky top-0 z-30">
          <IconRail />
        </div>

        <div className="flex-1 min-w-0 pb-16 md:pb-0">
          <TopBar />
          <main>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30">
        <IconRail mobile />
      </div>
    </div>
  );
}
