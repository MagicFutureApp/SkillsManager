import React from "react";
import { ArrowUpRight, Coffee, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const CREEM_COFFEE_PAYMENT_URL = "https://www.creem.io/payment/prod_RI63ylX0p3Cq8aRghxHJH";

export default function Pricing() {
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
            <a
              href={CREEM_COFFEE_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-13 w-50 items-center gap-3 rounded-lg bg-zinc-950 py-1 pr-1 pl-5 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 active:scale-[0.98]"
              id="price-btn"
            >
              <Coffee className="size-4.5" aria-hidden="true" />
              <span className="flex-1 text-center">请我喝杯咖啡</span>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-transparent">
                <ArrowUpRight
                  className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
