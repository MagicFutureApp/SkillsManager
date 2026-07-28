import React from "react";
import { ArrowUpRight, Coffee, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const CREEM_COFFEE_PAYMENT_URL = "https://www.creem.io/payment/prod_RI63ylX0p3Cq8aRghxHJH";
export const STRIPE_COFFEE_PAYMENT_URL = "https://buy.stripe.com/aFa7sKfLO7rx9vC53n3sI00";

type PaymentProvider = "stripe" | "creem";

export default function Pricing() {
  const [paymentProvider, setPaymentProvider] = React.useState<PaymentProvider>("stripe");
  const [hiddenToggle, setHiddenToggle] = React.useState(true);

  const handleProviderChange = (value: string[]) => {
    const provider = value[0];
    if (provider === "stripe" || provider === "creem") {
      setPaymentProvider(provider);
    }
  };

  return (
    <section className="bg-white py-20 sm:py-28 border-t border-zinc-200" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <Sparkles className="h-3.5 w-3.5 text-zinc-900" />
            <span>请我喝杯咖啡</span>
          </div>
        </div>

        <div
          className="mt-10 mx-auto grid w-full max-w-100 justify-items-center"
          id="pricing-cards-container"
        >
          <ToggleGroup
            aria-label="选择支付平台"
            value={[paymentProvider]}
            onValueChange={handleProviderChange}
            variant="outline"
            spacing={0}
            className={`h-10 overflow-hidden border border-zinc-200 bg-zinc-50 ${hiddenToggle ? "hidden" : ""}`}
          >
            <ToggleGroupItem
              value="stripe"
              aria-label="使用 Stripe"
              className="h-full w-24 border-0 text-zinc-600 aria-pressed:bg-zinc-950 aria-pressed:text-white"
            >
              Stripe
            </ToggleGroupItem>
            <ToggleGroupItem
              value="creem"
              aria-label="使用 Creem"
              className="h-full w-24 border-0 text-zinc-600 aria-pressed:bg-zinc-950 aria-pressed:text-white"
            >
              Creem
            </ToggleGroupItem>
          </ToggleGroup>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <div hidden={paymentProvider !== "stripe"}>
              <Button
                render={
                  <a href={STRIPE_COFFEE_PAYMENT_URL} target="_blank" rel="noopener noreferrer" />
                }
                nativeButton={false}
                size="lg"
                className="h-13 w-50 bg-zinc-950 px-5 text-white shadow-sm hover:bg-zinc-800"
                id="price-btn"
              >
                <Coffee data-icon="inline-start" />
                {hiddenToggle ? "请我喝杯咖啡" : "使用 Stripe 支付"}
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>

            <div hidden={paymentProvider !== "creem"}>
              <Button
                render={
                  <a href={CREEM_COFFEE_PAYMENT_URL} target="_blank" rel="noopener noreferrer" />
                }
                nativeButton={false}
                size="lg"
                className="h-13 w-50 bg-zinc-950 px-5 text-white shadow-sm hover:bg-zinc-800"
              >
                <Coffee data-icon="inline-start" />
                {hiddenToggle ? "请我喝杯咖啡" : "使用 Creem 支付"}
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
