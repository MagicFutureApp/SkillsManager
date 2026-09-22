import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { copyToClipboard } from "@/lib/clipboard";
import { toErrorMessage } from "@/lib/errors";
import { createPaginationState, DEFAULT_PAGE_SIZE, type PaginationState } from "@/lib/pagination";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";

import type {
  Best100SearchInput,
  Best100Settings,
  Best100SettingsResult,
  Best100SkillRecord,
  Best100StatusResult
} from "@/global";

type RecommendedSort = NonNullable<Best100SearchInput["sort"]>;

const SEARCH_DEBOUNCE_MS = 250;

const emptySettings: Best100Settings = { apiBaseUrl: "" };

export const useRecommendedPageState = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<RecommendedSort>("rank");
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<Best100SkillRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Best100SkillRecord | null>(null);
  const [settings, setSettings] = useState<Best100Settings>(emptySettings);
  const [status, setStatus] = useState<Best100StatusResult | null>(null);
  const [apiUrlDraft, setApiUrlDraft] = useState("");
  const [apiUrlStatus, setApiUrlStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [apiUrlError, setApiUrlError] = useState("");
  const isInitialMount = useRef(true);

  const loadResults = useCallback(
    async (searchQuery: string, sortValue: RecommendedSort, page: number) => {
      const search = window.skillsManager?.best100Search;

      if (!search) {
        setIsLoading(false);
        return;
      }

      setIsSearching(true);

      try {
        const result = await search({
          page,
          pageSize: DEFAULT_PAGE_SIZE,
          query: searchQuery,
          sort: sortValue
        });

        setItems(result.items);
        setTotal(result.total);
        setSelectedSkill((current) => {
          if (current && result.items.some((item) => item.skillKey === current.skillKey)) {
            return current;
          }

          return result.items[0] ?? null;
        });
      } catch {
        toast.error(t("recommended.sync.apiUrlRequired"));
      } finally {
        setIsSearching(false);
        setIsLoading(false);
      }
    },
    [t]
  );

  // 搜索框输入做 250ms 防抖，避免每次按键都打 IPC。
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  // 筛选/翻页变化后重新查询本地 SQLite。
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    void loadResults(debouncedQuery, sort, currentPage);
  }, [debouncedQuery, sort, currentPage, loadResults]);

  // 初次加载：读取设置、同步状态与首屏数据。
  useEffect(() => {
    let isCurrent = true;

    void window.skillsManager
      ?.best100GetSettings?.()
      .then((next: Best100SettingsResult) => {
        if (!isCurrent) return;

        setSettings(next);
        setApiUrlDraft(next.apiBaseUrl);
      })
      .catch(() => {});

    void window.skillsManager
      ?.best100GetStatus?.()
      .then((next: Best100StatusResult) => {
        if (isCurrent) setStatus(next);
      })
      .catch(() => {});

    void loadResults("", "rank", 1);

    return () => {
      isCurrent = false;
    };
  }, [loadResults]);

  const pagination = useMemo<PaginationState>(
    () =>
      createPaginationState({
        currentPage,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: total
      }),
    [currentPage, total]
  );

  const setSkillsPage = (pageNumber: number) => {
    setCurrentPage(Math.min(Math.max(1, pageNumber), pagination.totalPages));
  };

  // 筛选条件变化时回到第一页。
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery, sort]);

  const syncNow = useCallback(async () => {
    const fetch = window.skillsManager?.best100Fetch;

    if (!fetch) {
      toast.error(t("recommended.sync.apiUrlRequired"));
      return;
    }

    setIsSyncing(true);

    try {
      const state = await fetch();
      const nextSettings = await window.skillsManager?.best100GetSettings?.();
      const nextStatus = await window.skillsManager?.best100GetStatus?.();

      if (nextSettings) setSettings(nextSettings);
      if (nextStatus) setStatus(nextStatus);

      await loadResults(debouncedQuery, sort, 1);

      if (state.status === "unconfigured") {
        toast.error(t("recommended.sync.notConfiguredHint"));
      } else if (state.status === "failed") {
        toast.error(t("recommended.sync.failed"));
      } else if (state.status === "success") {
        toast.success(t("recommended.sync.success"));
      }
    } catch {
      toast.error(t("recommended.sync.failed"));
    } finally {
      setIsSyncing(false);
    }
  }, [t, debouncedQuery, sort, loadResults]);

  const saveApiUrl = useCallback(async () => {
    const update = window.skillsManager?.best100UpdateSettings;

    if (!update) {
      setApiUrlError(t("recommended.sync.apiUrlRequired"));
      setApiUrlStatus("error");
      return;
    }

    const normalized = apiUrlDraft.trim();

    if (!normalized) {
      setApiUrlError(t("recommended.sync.apiUrlRequired"));
      setApiUrlStatus("error");
      return;
    }

    setApiUrlStatus("saving");
    setApiUrlError("");

    try {
      const next = await update({ apiBaseUrl: normalized });

      setSettings(next);
      setApiUrlStatus("saved");
    } catch (unknownError: unknown) {
      setApiUrlError(toErrorMessage(unknownError) || t("recommended.sync.apiUrlRequired"));
      setApiUrlStatus("error");
    }
  }, [apiUrlDraft, t]);

  const installSkill = useCallback(
    async (record: Best100SkillRecord) => {
      const open = window.skillsManager?.openExternalUrl;
      const targetUrl = record.repoUrl || record.url;

      if (!open || !targetUrl) {
        toast.error(t("recommended.sync.failed"));
        return;
      }

      try {
        await open(targetUrl);
      } catch {
        toast.error(t("recommended.sync.failed"));
      }
    },
    [t]
  );

  const copyInstallCommand = useCallback(
    async (record: Best100SkillRecord) => {
      if (!record.install) {
        toast.error(t("recommended.detail.noInstallCommand"));
        return;
      }

      const copied = await copyToClipboard(record.install);

      if (copied) {
        toast.success(t("common.copied"));
      } else {
        toast.error(t("common.copyFailed"));
      }
    },
    [t]
  );

  const openMarket = useCallback(
    async (record: Best100SkillRecord) => {
      const open = window.skillsManager?.openExternalUrl;

      if (!open || !record.url) {
        toast.error(t("recommended.sync.failed"));
        return;
      }

      try {
        await open(record.url);
      } catch {
        toast.error(t("recommended.sync.failed"));
      }
    },
    [t]
  );

  const selectSkill = (record: Best100SkillRecord) => {
    setSelectedSkill(record);
  };

  return {
    apiUrlDraft,
    apiUrlError,
    apiUrlStatus,
    currentPage,
    isLoading,
    isSearching,
    isSyncing,
    items,
    pagination,
    query,
    selectedSkill,
    settings,
    sort,
    status,
    total,
    copyInstallCommand,
    installSkill,
    openMarket,
    saveApiUrl,
    selectSkill,
    setApiUrlDraft,
    setQuery,
    setSkillsPage,
    setSort,
    syncNow
  };
};

export type RecommendedPageState = ReturnType<typeof useRecommendedPageState>;
