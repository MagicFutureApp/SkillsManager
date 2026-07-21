import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DetailRow } from "./detail-row";

describe("DetailRow", () => {
  it("renders a plain detail value", () => {
    render(<DetailRow label="Provider" value="GitHub" />);

    expect(screen.getByText("Provider")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("supports monospace values and break-all wrapping", () => {
    render(<DetailRow label="Path" value="/tmp/local/cache" mono breakMode="all" />);

    expect(screen.getByText("/tmp/local/cache")).toHaveClass("font-mono", "break-all");
  });

  it("renders an open action when provided", () => {
    const handleOpen = vi.fn();

    render(
      <DetailRow
        label="Remote URL"
        value="https://github.com/example/repo"
        openLabel="Open https://github.com/example/repo"
        onOpen={handleOpen}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Open https://github.com/example/repo" }));

    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});
