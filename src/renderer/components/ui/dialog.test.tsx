import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";

import { Dialog, DialogBackdrop, DialogPopup, DialogPortal, DialogTitle } from "./dialog";

describe("Dialog", () => {
  it("keeps the modal layer below the custom title bar", () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>新增来源</DialogTitle>
          </DialogPopup>
        </DialogPortal>
      </Dialog>
    );

    const backdrop = document.querySelector('[data-slot="dialog-backdrop"]');
    const popup = screen.getByRole("dialog", { name: "新增来源" });

    expect(backdrop).toHaveClass("fixed", "inset-x-0", "bottom-0", "top-11");
    expect(backdrop).not.toHaveClass("inset-0");
    expect(popup).toHaveClass("top-[calc(50svh_+_22px)]", "max-h-[calc(100svh_-_92px)]");
    expect(popup).not.toHaveClass("top-1/2", "max-h-[calc(100vh-48px)]");
  });
});
