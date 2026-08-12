import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// Side-effect import: initializes the global i18next instance used by useTranslation,
// the same way the running app (and other renderer tests) get translations wired up.
import "../../i18n/react-i18n";

import { DiscoverPage } from "./discover-page";
import { DISCOVER_SEARCH_DEBOUNCE_MS } from "./hooks/use-discover-page-state";
import type {
  CatalogErrorCode,
  CatalogPageInput,
  CatalogPageResult,
  CatalogResult,
  CatalogSearchInput,
  CatalogSearchResult,
  CatalogSkill
} from "../../../core/catalog/catalog-types";

const makeSkill = (id: string, name: string, url: string): CatalogSkill => ({
  id,
  slug: id,
  name,
  source: "github",
  installs: 10,
  sourceType: "github" as const,
  installUrl: null,
  url
});

const makeWellKnownSkill = (id: string, name: string, url: string): CatalogSkill => ({
  ...makeSkill(id, name, url),
  source: "skills.sh",
  sourceType: "well-known"
});

const successResult = (
  overrides: Partial<CatalogPageResult> = {}
): CatalogResult<CatalogPageResult> => ({
  ok: true,
  data: {
    page: 0,
    skills: [makeSkill("a", "Alpha", "https://skills.sh/a")],
    generation: {
      generation: "gen-1",
      generatedAt: "2026-08-04T00:00:00.000Z",
      pageCount: 2,
      total: 100,
      isFallback: false
    },
    ...overrides
  }
});

const failureResult = (code: CatalogErrorCode): CatalogResult<CatalogPageResult> => ({
  ok: false,
  error: { code, message: `failed: ${code}` }
});

const searchSuccess = (
  overrides: Partial<CatalogSearchResult> = {}
): CatalogResult<CatalogSearchResult> => ({
  ok: true,
  data: {
    query: "react hooks",
    skills: [makeSkill("s1", "React Hooks Helper", "https://skills.sh/s1")],
    searchType: "semantic",
    count: 1,
    truncated: false,
    ...overrides
  }
});

const searchFailure = (
  code: CatalogErrorCode,
  retryAfterSeconds?: number
): CatalogResult<CatalogSearchResult> => ({
  ok: false,
  error: { code, message: `failed: ${code}`, retryAfterSeconds }
});

const setupWindow = (options: {
  getCatalogPageImpl?: (input: CatalogPageInput) => Promise<CatalogResult<CatalogPageResult>>;
  searchCatalogImpl?: (input: CatalogSearchInput) => Promise<CatalogResult<CatalogSearchResult>>;
}) => {
  const getCatalogPage = vi.fn(options.getCatalogPageImpl ?? (async () => successResult()));
  const searchCatalog = vi.fn(options.searchCatalogImpl ?? (async () => searchSuccess()));
  const openExternalUrl = vi.fn().mockResolvedValue(undefined);

  window.skillsManager = {
    ...(window.skillsManager ?? {}),
    getCatalogPage,
    searchCatalog,
    openExternalUrl
  } as unknown as Window["skillsManager"];

  return { getCatalogPage, searchCatalog, openExternalUrl };
};

/** Type into the search box and let the debounce window elapse. */
const typeQuery = async (value: string) => {
  const input = await screen.findByLabelText("搜索技能");
  fireEvent.change(input, { target: { value } });
  await act(async () => {
    vi.advanceTimersByTime(DISCOVER_SEARCH_DEBOUNCE_MS);
  });
  return input;
};

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.history.replaceState(null, "", "/#/discover");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Browse mode (regression guard) ──────────────────────── */

  it("renders cards and pagination when the catalog page resolves", async () => {
    const { getCatalogPage } = setupWindow({});

    render(<DiscoverPage />);

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText(/第 .* 页/)).toBeInTheDocument();
    expect(getCatalogPage).toHaveBeenCalledTimes(1);
  });

  it("renders a retry button on network error and recovers on retry", async () => {
    const getCatalogPage = vi.fn();
    getCatalogPage.mockResolvedValueOnce(failureResult("network"));
    getCatalogPage.mockResolvedValueOnce(successResult());
    setupWindow({ getCatalogPageImpl: getCatalogPage as never });

    render(<DiscoverPage />);

    const retry = await screen.findByRole("button", { name: "重试" });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(getCatalogPage).toHaveBeenCalledTimes(2);
  });

  it("auto-recovers once from a not-found error without looping", async () => {
    const getCatalogPage = vi.fn();
    getCatalogPage.mockResolvedValueOnce(failureResult("not-found"));
    getCatalogPage.mockResolvedValueOnce(successResult());
    setupWindow({ getCatalogPageImpl: getCatalogPage as never });

    render(<DiscoverPage />);

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    expect(getCatalogPage).toHaveBeenCalledTimes(2);
  });

  it("renders the stale notice when serving a fallback generation", async () => {
    setupWindow({
      getCatalogPageImpl: async () =>
        successResult({
          generation: {
            generation: "gen-prev",
            generatedAt: "2026-08-04T00:00:00.000Z",
            pageCount: 2,
            total: 100,
            isFallback: true
          }
        })
    });

    render(<DiscoverPage />);

    expect(await screen.findByText(/可能稍旧/)).toBeInTheDocument();
  });

  it("renders the warming message for a warming error", async () => {
    setupWindow({ getCatalogPageImpl: async () => failureResult("warming") });

    render(<DiscoverPage />);

    expect(await screen.findByText(/正在准备中/)).toBeInTheDocument();
  });

  it("renders the config message for a config error", async () => {
    setupWindow({ getCatalogPageImpl: async () => failureResult("config") });

    render(<DiscoverPage />);

    expect(await screen.findByText(/未配置/)).toBeInTheDocument();
  });

  it("opens external links from the detail dialog and never renders target=_blank", async () => {
    const { openExternalUrl } = setupWindow({});

    render(<DiscoverPage />);
    // The card's stretched trigger is the only interactive element; the
    // "查看详情" span is a non-interactive affordance and clicking it does nothing.
    fireEvent.click(await screen.findByRole("button", { name: "查看 Alpha 的详情" }));

    fireEvent.click(await screen.findByRole("button", { name: "在浏览器中打开" }));

    expect(openExternalUrl).toHaveBeenCalledWith("https://skills.sh/a");
    expect(document.querySelector('[target="_blank"]')).toBeNull();
  });

  it("renders the install action as a disabled placeholder", async () => {
    setupWindow({});

    render(<DiscoverPage />);
    fireEvent.click(await screen.findByRole("button", { name: "查看 Alpha 的详情" }));

    const install = await screen.findByRole("button", { name: /安装/ });
    expect(install).toBeDisabled();
    expect(screen.getByText("即将支持")).toBeInTheDocument();
  });

  it("renders the well-known source type as a localized badge, not the raw wire value", async () => {
    setupWindow({
      getCatalogPageImpl: async () =>
        successResult({ skills: [makeWellKnownSkill("a", "Alpha", "https://skills.sh/a")] })
    });

    render(<DiscoverPage />);
    // The card badge must come from sourceTypeLabel, never from a raw key such as
    // `discover.sourceType.well-known` that would surface if someone reintroduced
    // the `${skill.sourceType}` interpolation trick.
    expect(await screen.findByText("Well-known")).toBeInTheDocument();
    expect(screen.queryByText("discover.sourceType.well-known")).toBeNull();
  });

  it("omits the url row and external button when skill.url is empty", async () => {
    setupWindow({
      getCatalogPageImpl: async () => successResult({ skills: [makeSkill("a", "Alpha", "")] })
    });

    render(<DiscoverPage />);
    fireEvent.click(await screen.findByRole("button", { name: "查看 Alpha 的详情" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("来源地址")).toBeNull();
    expect(screen.queryByRole("button", { name: "在浏览器中打开" })).toBeNull();
    expect(screen.getByRole("button", { name: /安装/ })).toBeDisabled();
  });

  it("does not crash when window.skillsManager is missing", async () => {
    window.skillsManager = undefined as unknown as Window["skillsManager"];

    expect(() => render(<DiscoverPage />)).not.toThrow();
    expect(await screen.findByText(/加载技能数据失败|未配置/)).toBeInTheDocument();
  });

  /* ── Search mode ─────────────────────────────────────────── */

  it("switches to search mode and renders server results after the debounce", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    await screen.findByText("Alpha");

    await typeQuery("react hooks");

    expect(await screen.findByText("React Hooks Helper")).toBeInTheDocument();
    expect(searchCatalog).toHaveBeenCalledWith({ query: "react hooks" });
    // Browse results must not be blended into the search list.
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("does not search until the debounce window elapses", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    const input = await screen.findByLabelText("搜索技能");

    fireEvent.change(input, { target: { value: "react" } });
    await act(async () => {
      vi.advanceTimersByTime(DISCOVER_SEARCH_DEBOUNCE_MS - 50);
    });
    expect(searchCatalog).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    await waitFor(() => expect(searchCatalog).toHaveBeenCalledTimes(1));
  });

  it("collapses rapid keystrokes into a single request", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    const input = await screen.findByLabelText("搜索技能");

    for (const value of ["re", "rea", "reac", "react"]) {
      fireEvent.change(input, { target: { value } });
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }
    await act(async () => {
      vi.advanceTimersByTime(DISCOVER_SEARCH_DEBOUNCE_MS);
    });

    await waitFor(() => expect(searchCatalog).toHaveBeenCalledTimes(1));
    expect(searchCatalog).toHaveBeenCalledWith({ query: "react" });
  });

  it("searches immediately on Enter without waiting for the debounce", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    const input = await screen.findByLabelText("搜索技能");

    fireEvent.change(input, { target: { value: "react hooks" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(searchCatalog).toHaveBeenCalledTimes(1));
    expect(searchCatalog).toHaveBeenCalledWith({ query: "react hooks" });
  });

  it("normalizes surrounding and repeated whitespace before searching", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    await typeQuery("   react    hooks   ");

    await waitFor(() => expect(searchCatalog).toHaveBeenCalledWith({ query: "react hooks" }));
  });

  it("stays in browse mode and issues no request for a one-character query", async () => {
    const { searchCatalog } = setupWindow({});

    render(<DiscoverPage />);
    await screen.findByText("Alpha");

    await typeQuery("r");

    expect(searchCatalog).not.toHaveBeenCalled();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText(/第 .* 页/)).toBeInTheDocument();
  });

  it("hides pagination in search mode", async () => {
    setupWindow({});

    render(<DiscoverPage />);
    await screen.findByText("Alpha");
    expect(screen.getByText(/第 .* 页/)).toBeInTheDocument();

    await typeQuery("react hooks");

    await screen.findByText("React Hooks Helper");
    expect(screen.queryByText(/第 .* 页/)).not.toBeInTheDocument();
  });

  it("never shows the stale notice while search results are displayed", async () => {
    setupWindow({
      getCatalogPageImpl: async () =>
        successResult({
          generation: {
            generation: "gen-prev",
            generatedAt: "2026-08-04T00:00:00.000Z",
            pageCount: 2,
            total: 100,
            isFallback: true
          }
        })
    });

    render(<DiscoverPage />);
    expect(await screen.findByText(/可能稍旧/)).toBeInTheDocument();

    await typeQuery("react hooks");

    await screen.findByText("React Hooks Helper");
    expect(screen.queryByText(/可能稍旧/)).not.toBeInTheDocument();
  });

  it("returns to the cached browse page when the query is cleared", async () => {
    const { getCatalogPage } = setupWindow({});

    render(<DiscoverPage />);
    await screen.findByText("Alpha");

    const input = await typeQuery("react hooks");
    await screen.findByText("React Hooks Helper");

    fireEvent.change(input, { target: { value: "" } });

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
    // Browse state survived the round trip, so no extra page request was needed.
    expect(getCatalogPage).toHaveBeenCalledTimes(1);
  });

  it("clears the search through the clear button", async () => {
    setupWindow({});

    render(<DiscoverPage />);
    await screen.findByText("Alpha");
    await typeQuery("react hooks");
    await screen.findByText("React Hooks Helper");

    fireEvent.click(screen.getByRole("button", { name: "清除搜索" }));

    expect(await screen.findByText("Alpha")).toBeInTheDocument();
  });

  it("renders the search summary with the match count and matching strategy", async () => {
    setupWindow({
      searchCatalogImpl: async () =>
        searchSuccess({ query: "react hooks", count: 1, searchType: "fuzzy" })
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/「react hooks」找到 1 个技能/)).toBeInTheDocument();
    expect(screen.getByText("模糊匹配")).toBeInTheDocument();
  });

  it("prompts to refine the keywords when the result set is truncated", async () => {
    setupWindow({
      searchCatalogImpl: async () => searchSuccess({ count: 50, truncated: true })
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/仅展示前 50 个/)).toBeInTheDocument();
  });

  it("does not render a load-more affordance for truncated results", async () => {
    setupWindow({
      searchCatalogImpl: async () => searchSuccess({ count: 50, truncated: true })
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    await screen.findByText(/仅展示前 50 个/);
    expect(screen.queryByRole("button", { name: /加载更多|更多/ })).not.toBeInTheDocument();
  });

  it("renders the search-specific empty state with the query", async () => {
    setupWindow({
      searchCatalogImpl: async () =>
        searchSuccess({ query: "zzzz qqqq", skills: [], count: 0, truncated: false })
    });

    render(<DiscoverPage />);
    await typeQuery("zzzz qqqq");

    expect(await screen.findByText(/没有找到匹配「zzzz qqqq」的技能/)).toBeInTheDocument();
  });

  it("renders the rate-limited message with the retry delay", async () => {
    setupWindow({
      searchCatalogImpl: async () => searchFailure("rate-limited", 7)
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/请 7 秒后重试/)).toBeInTheDocument();
  });

  it("renders the search-unavailable message for an unavailable failure", async () => {
    setupWindow({
      searchCatalogImpl: async () => searchFailure("unavailable")
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/搜索服务暂时不可用/)).toBeInTheDocument();
  });

  it("renders the invalid-query message when the main process rejects the query", async () => {
    setupWindow({
      searchCatalogImpl: async () => searchFailure("invalid-query")
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/至少需要 2 个字符/)).toBeInTheDocument();
  });

  it("retries the search rather than the browse page when retry is pressed in search mode", async () => {
    const searchCatalog = vi.fn();
    searchCatalog.mockResolvedValueOnce(searchFailure("unavailable"));
    searchCatalog.mockResolvedValueOnce(searchSuccess());
    const { getCatalogPage } = setupWindow({ searchCatalogImpl: searchCatalog as never });

    render(<DiscoverPage />);
    await screen.findByText("Alpha");
    await typeQuery("react hooks");

    fireEvent.click(await screen.findByRole("button", { name: "重试" }));

    expect(await screen.findByText("React Hooks Helper")).toBeInTheDocument();
    expect(searchCatalog).toHaveBeenCalledTimes(2);
    expect(getCatalogPage).toHaveBeenCalledTimes(1);
  });

  it("discards a stale search response when a newer query resolves first", async () => {
    let resolveSlow: ((value: CatalogResult<CatalogSearchResult>) => void) | undefined;
    const searchCatalog = vi.fn((input: CatalogSearchInput) => {
      if (input.query === "slow query") {
        return new Promise<CatalogResult<CatalogSearchResult>>((resolve) => {
          resolveSlow = resolve;
        });
      }
      return Promise.resolve(
        searchSuccess({
          query: "fast query",
          skills: [makeSkill("fast", "Fast Result", "https://skills.sh/fast")]
        })
      );
    });
    setupWindow({ searchCatalogImpl: searchCatalog as never });

    render(<DiscoverPage />);
    await typeQuery("slow query");
    await typeQuery("fast query");

    expect(await screen.findByText("Fast Result")).toBeInTheDocument();

    // The superseded request resolves last; its payload must be dropped.
    await act(async () => {
      resolveSlow?.(
        searchSuccess({
          query: "slow query",
          skills: [makeSkill("slow", "Slow Result", "https://skills.sh/slow")]
        })
      );
    });

    expect(screen.getByText("Fast Result")).toBeInTheDocument();
    expect(screen.queryByText("Slow Result")).not.toBeInTheDocument();
  });

  it("reports an unknown failure when the search bridge is unavailable", async () => {
    const { searchCatalog } = setupWindow({});
    window.skillsManager = {
      ...(window.skillsManager ?? {}),
      searchCatalog: undefined
    } as unknown as Window["skillsManager"];

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/加载技能数据失败/)).toBeInTheDocument();
    expect(searchCatalog).not.toHaveBeenCalled();
  });

  it("does not leave an unhandled rejection when the search channel throws", async () => {
    setupWindow({
      searchCatalogImpl: async () => {
        throw new Error("channel missing");
      }
    });

    render(<DiscoverPage />);
    await typeQuery("react hooks");

    expect(await screen.findByText(/加载技能数据失败/)).toBeInTheDocument();
  });
});
