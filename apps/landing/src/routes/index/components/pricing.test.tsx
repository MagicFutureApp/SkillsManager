import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Pricing, { CREEM_COFFEE_PAYMENT_URL, STRIPE_COFFEE_PAYMENT_URL } from "./pricing";

describe("Pricing", () => {
  it("defaults to Stripe while retaining the Creem payment option", () => {
    const markup = renderToStaticMarkup(<Pricing />);

    expect(markup).toContain(`href="${CREEM_COFFEE_PAYMENT_URL}"`);
    expect(markup).toContain(`href="${STRIPE_COFFEE_PAYMENT_URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("请我喝杯咖啡");
    expect(markup).toContain('aria-label="选择支付平台"');
    expect(markup).not.toContain("选择一个支付价格");
  });
});
