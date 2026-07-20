import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function Pricing() {
  const byMeACoffee = () => {};

  return (
    <section className="bg-white py-20 sm:py-28 border-t border-zinc-200" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            <span>请我喝杯咖啡</span>
          </div>
        </div>

        <div className="mt-10 mx-auto grid w-100" id="pricing-cards-container">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={byMeACoffee}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-6 py-3.5 text-sm font-semibold text-zinc-50 shadow-sm transition-all  bg-zinc-900 hover:bg-zinc-800 hover:shadow-lg active:scale-95 cursor-pointer"
              id="price-btn"
            >
              <span>请我喝杯咖啡</span>
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
