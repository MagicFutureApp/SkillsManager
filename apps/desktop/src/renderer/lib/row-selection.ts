import type React from "react";

const interactiveRowElementSelector = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "label",
  "[contenteditable='true']",
  "[role='button']",
  "[role='checkbox']",
  "[role='combobox']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='radio']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='switch']",
  "[role='tab']",
  "[data-row-interactive='true']"
].join(",");

export const shouldIgnoreRowSelection = (event: React.MouseEvent<HTMLElement>): boolean => {
  const { target } = event;

  return target instanceof Element && Boolean(target.closest(interactiveRowElementSelector));
};
