import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Pricing, { CREEM_COFFEE_PAYMENT_URL } from "./pricing";

describe("Pricing", () => {
  it("links the coffee action to the Creem one-time payment page", () => {
    const markup = renderToStaticMarkup(<Pricing />);

    expect(markup).toContain(`href="${CREEM_COFFEE_PAYMENT_URL}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain("请我喝杯咖啡");
  });
});
