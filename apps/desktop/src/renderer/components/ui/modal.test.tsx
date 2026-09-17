import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import React from "react";

import { Modal } from "./dialog";
import { createI18nInstance } from "@/i18n/react-i18n";

const renderModal = async (props: React.ComponentProps<typeof Modal>) => {
  const i18n = await createI18nInstance("zh-CN");

  return render(
    <I18nextProvider i18n={i18n}>
      <Modal {...props} />
    </I18nextProvider>
  );
};

describe("Modal", () => {
  it("renders nothing when closed", async () => {
    const { container } = await renderModal({
      open: false,
      onClose: () => {},
      title: "标题"
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("exposes the title as the dialog name and keeps header/footer fixed while the body scrolls", async () => {
    await renderModal({
      open: true,
      onClose: () => {},
      title: "确认分发",
      description: "分发目标列表",
      children: <p data-testid="modal-content">内容区域</p>,
      footer: <button type="button">确定</button>
    });

    const dialog = screen.getByRole("dialog", { name: "确认分发" });

    expect(dialog).toHaveClass("flex", "flex-col", "overflow-hidden", "max-h-[78svh]");

    const header = dialog.querySelector('[data-slot="modal-header"]');
    const body = dialog.querySelector('[data-slot="modal-body"]');
    const footer = dialog.querySelector('[data-slot="modal-footer"]');

    expect(header).not.toBeNull();
    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();

    expect(header).toHaveClass("shrink-0");
    expect(body).toHaveClass("flex-1", "overflow-y-auto", "min-h-10");
    expect(footer).toHaveClass("shrink-0");

    expect(screen.getByTestId("modal-content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
  });

  it("hides the close button when showClose is false", async () => {
    await renderModal({
      open: true,
      onClose: () => {},
      title: "标题",
      showClose: false
    });

    expect(screen.queryByRole("button", { name: "关闭" })).not.toBeInTheDocument();
  });

  it("keeps every dialog between 650px and 680px wide", async () => {
    await renderModal({
      open: true,
      onClose: () => {},
      title: "标题"
    });

    const dialog = screen.getByRole("dialog", { name: "标题" });

    expect(dialog).toHaveClass("min-w-[650px]", "max-w-[680px]");
  });

  it("uses the alertdialog role when requested", async () => {
    await renderModal({
      open: true,
      onClose: () => {},
      title: "重建本地数据库？",
      role: "alertdialog"
    });

    expect(
      screen.getByRole("alertdialog", { name: "重建本地数据库？" })
    ).toBeInTheDocument();
  });
});
