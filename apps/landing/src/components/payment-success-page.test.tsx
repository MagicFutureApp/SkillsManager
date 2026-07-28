import { renderToStaticMarkup } from "react-dom/server";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";

import PaymentSuccessPage from "./payment-success-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

vi.mock("../hooks/use-download-platform", () => ({
  useDownloadPlatform: () => ["windows", vi.fn()]
}));

vi.mock("../hooks/use-release-manifest", () => ({
  useReleaseManifest: () => ({ loading: false, manifest: null })
}));

vi.mock("./header", () => ({
  default: () => <header>Skills Manager</header>
}));

vi.mock("./footer", () => ({
  default: () => <footer>Skills Manager footer</footer>
}));

describe("PaymentSuccessPage", () => {
  it("renders the thank-you message and a route back to the landing page", () => {
    const markup = renderToStaticMarkup(<PaymentSuccessPage />);

    expect(markup).toContain("谢谢你的咖啡");
    expect(markup).toContain("你的这杯咖啡，会继续变成更可靠的技能管理与分发体验。");
    expect(markup).toContain('href="/"');
    expect(markup).toContain("返回 Skills Manager");
  });
});
