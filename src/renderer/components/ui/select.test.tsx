import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import React from "react";

import { Field, FieldLabel } from "./field";
import { Select } from "./select";

const openSelect = async (label: string) => {
  fireEvent.pointerDown(screen.getByLabelText(label), { pointerType: "mouse" });
  fireEvent.mouseDown(screen.getByLabelText(label), { button: 0 });

  return screen.findByRole("listbox");
};

describe("Select", () => {
  it("keeps the indicator column mounted for unselected options", async () => {
    render(
      <Field>
        <FieldLabel>Provider</FieldLabel>
        <Select
          value="github"
          options={[
            { value: "github", label: "GitHub" },
            { value: "gitlab", label: "GitLab" }
          ]}
          onValueChange={vi.fn()}
        />
      </Field>
    );

    await openSelect("Provider");

    expect(screen.getByRole("option", { name: "GitLab" }).children.length).toBe(2);
  });

  it("keeps the selected option indicator visible", async () => {
    render(
      <Field>
        <FieldLabel>Provider</FieldLabel>
        <Select
          value="github"
          options={[
            { value: "github", label: "GitHub" },
            { value: "gitlab", label: "GitLab" }
          ]}
          onValueChange={vi.fn()}
        />
      </Field>
    );

    await openSelect("Provider");

    const selectedIndicator = screen.getByRole("option", { name: "GitHub" }).firstElementChild;
    const unselectedIndicator = screen.getByRole("option", { name: "GitLab" }).firstElementChild;

    expect(selectedIndicator).toHaveClass("opacity-100");
    expect(selectedIndicator).not.toHaveClass("opacity-0");
    expect(unselectedIndicator).toHaveClass("opacity-0");
  });

  it("keeps a long selected value on one truncated line", () => {
    const longRepositoryName =
      "github.com/very-long-organization-name/very-long-repository-name-with-many-segments";

    render(
      <Field>
        <FieldLabel>Repository</FieldLabel>
        <Select
          className="max-w-40"
          value="long-repository"
          options={[{ value: "long-repository", label: longRepositoryName }]}
          onValueChange={vi.fn()}
        />
      </Field>
    );

    const trigger = screen.getByLabelText("Repository");
    const selectedValue = within(trigger).getByText(longRepositoryName);

    expect(trigger).toHaveClass("min-w-0", "overflow-hidden");
    expect(selectedValue).toHaveClass("min-w-0", "flex-1", "truncate", "whitespace-nowrap");
  });
});
