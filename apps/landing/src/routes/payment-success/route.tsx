import { createFileRoute } from "@tanstack/react-router";

import PaymentSuccessPage from "./-components/payment-success-page";

export const Route = createFileRoute("/payment-success")({
  head: () => ({
    meta: [
      { title: "感谢你的支持 - Skills Manager" },
      {
        name: "description",
        content: "感谢你通过一杯咖啡支持 Skills Manager。"
      }
    ]
  }),
  component: PaymentSuccessPage
});
