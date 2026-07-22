import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import viteConfig from "../../vite.config";

describe("renderer Vite configuration", () => {
  it("builds relative asset URLs for the packaged file protocol", () => {
    expect(viteConfig).toMatchObject({
      base: "./"
    });
  });

  it("uses relative local resource URLs in the renderer HTML", () => {
    const html = readFileSync("src/renderer/index.html", "utf8");
    const document = new DOMParser().parseFromString(html, "text/html");
    const resourceUrls = [
      ...Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]"), (element) =>
        element.getAttribute("href")
      ),
      ...Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"), (element) =>
        element.getAttribute("src")
      )
    ];

    expect(resourceUrls).not.toContainEqual(expect.stringMatching(/^\//));
  });
});
