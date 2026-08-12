// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
  canonicalizeAppConfigUrl,
  findInvalidAppConfigKeys,
  findMissingAppConfigKeys,
  generateAppConfig,
  isStrictMode,
  isValidAppConfigUrl,
  readAppConfigValues,
  renderAppConfigModule
} from "./generate-app-config";

vi.mock("node:fs");

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
  mockedExistsSync.mockReturnValue(false);
});

describe("readAppConfigValues", () => {
  it("trims whitespace and strips trailing slashes", () => {
    expect(
      readAppConfigValues({
        SKILLS_MANAGER_BASE_URL: "  https://example.app//  ",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev/"
      })
    ).toEqual({
      SKILLS_MANAGER_BASE_URL: "https://example.app",
      SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
    });
  });

  it("maps absent and blank variables to empty strings", () => {
    expect(readAppConfigValues({ SKILLS_MANAGER_CATALOG_BASE_URL: "   " })).toEqual({
      SKILLS_MANAGER_BASE_URL: "",
      SKILLS_MANAGER_CATALOG_BASE_URL: ""
    });
  });
});

describe("findMissingAppConfigKeys", () => {
  it("reports every unset variable", () => {
    expect(
      findMissingAppConfigKeys({
        SKILLS_MANAGER_BASE_URL: "",
        SKILLS_MANAGER_CATALOG_BASE_URL: ""
      })
    ).toEqual(["SKILLS_MANAGER_BASE_URL", "SKILLS_MANAGER_CATALOG_BASE_URL"]);
  });

  it("reports nothing when both variables are set", () => {
    expect(
      findMissingAppConfigKeys({
        SKILLS_MANAGER_BASE_URL: "https://example.app",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
      })
    ).toEqual([]);
  });
});

describe("isStrictMode", () => {
  it("is enabled by the --strict flag", () => {
    expect(isStrictMode({}, ["--strict"])).toBe(true);
  });

  it("is enabled inside CI", () => {
    expect(isStrictMode({ CI: "true" }, [])).toBe(true);
    expect(isStrictMode({ CI: "1" }, [])).toBe(true);
  });

  it("stays disabled for an absent or explicitly disabled CI flag", () => {
    expect(isStrictMode({}, [])).toBe(false);
    expect(isStrictMode({ CI: "" }, [])).toBe(false);
    expect(isStrictMode({ CI: "false" }, [])).toBe(false);
    expect(isStrictMode({ CI: "0" }, [])).toBe(false);
  });
});

describe("renderAppConfigModule", () => {
  it("emits both constants as escaped string literals", () => {
    const module = renderAppConfigModule({
      SKILLS_MANAGER_BASE_URL: "https://example.app",
      SKILLS_MANAGER_CATALOG_BASE_URL: ""
    });

    expect(module).toContain('export const SKILLS_MANAGER_BASE_URL = "https://example.app";');
    expect(module).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "";');
    expect(module).toContain("自动生成，勿手改。");
    expect(module.endsWith("\n")).toBe(true);
  });
});

describe("isValidAppConfigUrl", () => {
  it("accepts an absolute https URL", () => {
    expect(isValidAppConfigUrl("https://example.app")).toBe(true);
    expect(isValidAppConfigUrl("https://sk.magicfuture.app/")).toBe(true);
  });

  it("rejects a value with no scheme", () => {
    expect(isValidAppConfigUrl("sk.magicfuture.app")).toBe(false);
  });

  it("rejects a non-https scheme", () => {
    expect(isValidAppConfigUrl("http://example.app")).toBe(false);
  });

  it("rejects a misspelled scheme", () => {
    expect(isValidAppConfigUrl("htpp://example.app")).toBe(false);
  });

  it("rejects a non-URL token", () => {
    expect(isValidAppConfigUrl("not-a-url")).toBe(false);
    expect(isValidAppConfigUrl("https://sk. magicfuture.app")).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(isValidAppConfigUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects an empty value", () => {
    expect(isValidAppConfigUrl("")).toBe(false);
  });

  it("rejects values containing a control character", () => {
    expect(isValidAppConfigUrl("https://a.com\nhttps://evil.com")).toBe(false);
    expect(isValidAppConfigUrl("https://a.com\thttps://evil.com")).toBe(false);
    expect(isValidAppConfigUrl("https://a.com\rhttps://evil.com")).toBe(false);
    expect(isValidAppConfigUrl("https://a.com\x00")).toBe(false);
    expect(isValidAppConfigUrl("https://a.com\x7F")).toBe(false);
  });

  it("rejects URLs longer than 2048 characters but accepts the boundary", () => {
    const long = `https://example.app/${"a".repeat(2049 - "https://example.app/".length)}`;
    const boundary = `https://example.app/${"a".repeat(2048 - "https://example.app/".length)}`;

    expect(long.length).toBe(2049);
    expect(boundary.length).toBe(2048);
    expect(isValidAppConfigUrl(long)).toBe(false);
    expect(isValidAppConfigUrl(boundary)).toBe(true);
  });
});

describe("canonicalizeAppConfigUrl", () => {
  it("lowercases the scheme and host and drops the trailing slash", () => {
    expect(canonicalizeAppConfigUrl("HTTPS://A.COM")).toBe("https://a.com");
  });

  it("strips a trailing slash added by the URL parser without producing a double slash", () => {
    expect(canonicalizeAppConfigUrl("https://a.com/base/")).toBe("https://a.com/base");
    expect(canonicalizeAppConfigUrl("https://a.com/")).toBe("https://a.com");
  });

  it("returns the input unchanged when the value cannot be parsed", () => {
    expect(canonicalizeAppConfigUrl("not-a-url")).toBe("not-a-url");
  });
});

describe("findInvalidAppConfigKeys", () => {
  it("reports nothing when every value is a valid https URL", () => {
    expect(
      findInvalidAppConfigKeys({
        SKILLS_MANAGER_BASE_URL: "https://example.app",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
      })
    ).toEqual([]);
  });

  it("flags non-https and malformed values but not empty ones", () => {
    expect(
      findInvalidAppConfigKeys({
        SKILLS_MANAGER_BASE_URL: "http://example.app",
        SKILLS_MANAGER_CATALOG_BASE_URL: "not-a-url"
      })
    ).toEqual(["SKILLS_MANAGER_BASE_URL", "SKILLS_MANAGER_CATALOG_BASE_URL"]);
  });

  it("does not flag an empty value as invalid (that is a missing key)", () => {
    expect(
      findInvalidAppConfigKeys({
        SKILLS_MANAGER_BASE_URL: "",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
      })
    ).toEqual([]);
  });
});

describe("generateAppConfig", () => {
  const validEnv = {
    SKILLS_MANAGER_BASE_URL: "https://example.app",
    SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
  };

  it("writes the generated module on a valid non-strict run", () => {
    const exitCode = generateAppConfig(validEnv, []);

    expect(exitCode).toBe(0);
    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
    const content = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('export const SKILLS_MANAGER_BASE_URL = "https://example.app";');
    expect(content).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "https://catalog.example.dev";');
  });

  it("writes empty strings for missing values on a non-strict run", () => {
    const exitCode = generateAppConfig({ SKILLS_MANAGER_BASE_URL: "", SKILLS_MANAGER_CATALOG_BASE_URL: "" }, []);

    expect(exitCode).toBe(0);
    const content = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('export const SKILLS_MANAGER_BASE_URL = "";');
    expect(content).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "";');
  });

  it("writes empty strings for malformed values on a non-strict run instead of baking them", () => {
    const exitCode = generateAppConfig(
      { SKILLS_MANAGER_BASE_URL: "htpp://example.app", SKILLS_MANAGER_CATALOG_BASE_URL: "not-a-url" },
      []
    );

    expect(exitCode).toBe(0);
    const content = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('export const SKILLS_MANAGER_BASE_URL = "";');
    expect(content).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "";');
  });

  it("fails with exit 1 when a required value is missing under strict mode", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = generateAppConfig(
      { SKILLS_MANAGER_BASE_URL: "", SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev" },
      ["--strict"]
    );

    expect(exitCode).toBe(1);
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("SKILLS_MANAGER_BASE_URL");
    errorSpy.mockRestore();
  });

  it("fails with exit 1 when a required value is not a valid https URL under strict mode", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = generateAppConfig(
      { SKILLS_MANAGER_BASE_URL: "sk.magicfuture.app", SKILLS_MANAGER_CATALOG_BASE_URL: "http://catalog.example.dev" },
      ["--strict"]
    );

    expect(exitCode).toBe(1);
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain("SKILLS_MANAGER_BASE_URL");
    expect(message).toContain("sk.magicfuture.app");
    errorSpy.mockRestore();
  });

  it("fails with exit 1 under CI when values are malformed", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = generateAppConfig(
      {
        SKILLS_MANAGER_BASE_URL: "not-a-url",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev",
        CI: "true"
      },
      []
    );

    expect(exitCode).toBe(1);
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("fails with exit 1 in strict mode when a value contains a control character", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const exitCode = generateAppConfig(
      {
        SKILLS_MANAGER_BASE_URL: "https://a.com\nhttps://evil.com",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev",
        CI: "true"
      },
      []
    );

    expect(exitCode).toBe(1);
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
    expect(errorSpy.mock.calls[0][0]).toContain("control character");
    errorSpy.mockRestore();
  });

  it("writes empty strings for control-character values on a non-strict run", () => {
    const exitCode = generateAppConfig(
      {
        SKILLS_MANAGER_BASE_URL: "https://a.com\rhttps://evil.com",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev"
      },
      []
    );

    expect(exitCode).toBe(0);
    const content = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('export const SKILLS_MANAGER_BASE_URL = "";');
    expect(content).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "https://catalog.example.dev";');
  });

  it("canonicalizes baked values: lowercased scheme/host and no trailing slash", () => {
    const exitCode = generateAppConfig(
      {
        SKILLS_MANAGER_BASE_URL: "HTTPS://A.COM/",
        SKILLS_MANAGER_CATALOG_BASE_URL: "https://catalog.example.dev/"
      },
      []
    );

    expect(exitCode).toBe(0);
    const content = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(content).toContain('export const SKILLS_MANAGER_BASE_URL = "https://a.com";');
    expect(content).toContain('export const SKILLS_MANAGER_CATALOG_BASE_URL = "https://catalog.example.dev";');
    expect(content).not.toContain('"https://a.com/";');
  });
});
