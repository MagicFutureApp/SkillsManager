import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React from "react";

import { SkillsPage } from "./SkillsPage";

describe("SkillsPage", () => {
  it("renders the skills design surface from the HTML mockup", () => {
    render(<SkillsPage />);

    expect(
      screen.getByRole("heading", { name: "浏览 skill unit 并预览分发计划" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Prompt Engineering Basic")).toHaveLength(2);
    expect(screen.getByText("Browser QA checklist")).toBeInTheDocument();
    expect(screen.getByText("Refactor notes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "同步目标" })).toBeInTheDocument();
    expect(screen.getByText("~/.codex/skills")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "计划预览" })).toBeInTheDocument();
  });
});
