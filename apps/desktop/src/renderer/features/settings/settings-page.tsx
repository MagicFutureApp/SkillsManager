import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toErrorMessage } from "@/lib/errors";
import skillsManagerMark from "@/assets/skills-manager-mark.svg";
import {
  AlertTriangle,
  CircleHelpIcon,
  Copy,
  Database,
  ExternalLink,
  FolderOpen,
  GitBranch,
  KeyRound,
  PackageCheck,
  RotateCcw
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { AppInfo, AppSettingsResult, AppStoragePathsResult } from "@/global";
import { GITHUB_TOKEN_HELP_URL, OFFICIAL_SITE_URL } from "../../../core/app-constants";
import { createShiftPressSequenceHandler } from "../../../core/keyboard/shift-press-sequence";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type StorageStatus = "loading" | "idle" | "resetting" | "reset" | "error";
const DATA_RESET_NAVIGATION_HREF = "#settings-data-reset";
const settingsNavigationItems = [
  { href: "#github-token", label: "凭证管理" },
  { href: "#skill-distribution", label: "技能分发" },
  { href: "#local-storage", label: "本地存储" },
  { href: DATA_RESET_NAVIGATION_HREF, label: "数据重置" },
  { href: "#settings-about", label: "关于" }
] as const;
type SettingsNavigationHref = (typeof settingsNavigationItems)[number]["href"];

const getVisibleSettingsNavigationItems = (isDataResetVisible: boolean) =>
  settingsNavigationItems.filter(
    (item) => isDataResetVisible || item.href !== DATA_RESET_NAVIGATION_HREF
  );

const splitHashHistoryLocationHash = (hash: string) => {
  const nestedHashIndex = hash.indexOf("#", 1);

  if (nestedHashIndex < 0) {
    return hash.startsWith("#/")
      ? { routeHash: hash, settingsNavigationHref: "" }
      : { routeHash: "", settingsNavigationHref: hash };
  }

  return {
    routeHash: hash.slice(0, nestedHashIndex),
    settingsNavigationHref: hash.slice(nestedHashIndex)
  };
};

const getSettingsNavigationHrefFromHash = (
  hash: string,
  isDataResetVisible: boolean
): SettingsNavigationHref => {
  const { settingsNavigationHref } = splitHashHistoryLocationHash(hash);

  return (
    getVisibleSettingsNavigationItems(isDataResetVisible).find(
      (item) => item.href === settingsNavigationHref
    )?.href ?? settingsNavigationItems[0].href
  );
};

const getSettingsNavigationLinkHref = (hash: string, href: SettingsNavigationHref) => {
  const { routeHash } = splitHashHistoryLocationHash(hash);
  return routeHash ? `${routeHash}${href}` : href;
};

const resetSettingsWindowScroll = () => {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  if (!window.navigator.userAgent.includes("jsdom")) {
    window.scrollTo({ left: 0, top: 0 });
  }
};

export const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettingsResult>({
    distribution: { autoDistributeOnSync: false },
    github: { hasToken: false }
  });
  const [distributionStatus, setDistributionStatus] = useState<SaveStatus>("idle");
  const [storagePaths, setStoragePaths] = useState<AppStoragePathsResult | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isDataResetVisible, setIsDataResetVisible] = useState(false);
  const [officialSiteError, setOfficialSiteError] = useState("");
  const [activeSettingsNavigationHref, setActiveSettingsNavigationHref] =
    useState<SettingsNavigationHref>(() =>
      getSettingsNavigationHrefFromHash(window.location.hash, false)
    );
  const settingsContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void window.skillsManager
      ?.getAppSettings?.()
      .then((nextSettings) => {
        if (isCurrent) {
          setSettings(nextSettings);
        }
      })
      .catch((unknownError: unknown) => {
        if (isCurrent) {
          setError(toErrorMessage(unknownError) || "读取设置失败。");
          setStatus("error");
        }
      });

    void window.skillsManager
      ?.getAppStoragePaths?.()
      .then((nextStoragePaths) => {
        if (isCurrent) {
          setStoragePaths(nextStoragePaths);
          setStorageStatus("idle");
        }
      })
      .catch((unknownError: unknown) => {
        if (isCurrent) {
          setStorageError(toErrorMessage(unknownError) || "读取本地存储路径失败。");
          setStorageStatus("error");
        }
      });

    void window.skillsManager
      ?.getInfo?.()
      .then((nextAppInfo) => {
        if (isCurrent) {
          setAppInfo(nextAppInfo);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAppInfo(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const syncActiveNavigationHref = () => {
      setActiveSettingsNavigationHref(
        getSettingsNavigationHrefFromHash(window.location.hash, isDataResetVisible)
      );
    };

    syncActiveNavigationHref();
    window.addEventListener("hashchange", syncActiveNavigationHref);
    window.addEventListener("popstate", syncActiveNavigationHref);

    return () => {
      window.removeEventListener("hashchange", syncActiveNavigationHref);
      window.removeEventListener("popstate", syncActiveNavigationHref);
    };
  }, [isDataResetVisible]);

  useEffect(() => {
    const handleShiftPress = createShiftPressSequenceHandler(() => {
      setIsDataResetVisible(true);
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      handleShiftPress({ key: event.key, isAutoRepeat: event.repeat });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const resetSettingsContentScroll = () => {
    const contentElement = settingsContentRef.current;

    resetSettingsWindowScroll();

    if (!contentElement) {
      return;
    }

    if (typeof contentElement.scrollTo === "function") {
      contentElement.scrollTo({ left: 0, top: 0 });
      return;
    }

    contentElement.scrollTop = 0;
  };

  const navigateToSettingsSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: SettingsNavigationHref
  ) => {
    event.preventDefault();
    setActiveSettingsNavigationHref(href);
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${getSettingsNavigationLinkHref(window.location.hash, href)}`
    );
    resetSettingsContentScroll();
    window.setTimeout(() => {
      resetSettingsContentScroll();
    }, 0);
  };

  const saveToken = () => {
    const normalizedToken = githubToken.trim();

    if (!normalizedToken) {
      setError("请输入 GitHub token。");
      setStatus("error");
      return;
    }

    setStatus("saving");
    setError("");
    void window.skillsManager
      ?.saveGitHubToken?.(normalizedToken)
      .then((nextSettings) => {
        setSettings(nextSettings);
        setGithubToken("");
        setStatus("saved");
      })
      .catch((unknownError: unknown) => {
        setError(toErrorMessage(unknownError) || "保存 GitHub token 失败。");
        setStatus("error");
      });
  };

  const clearToken = () => {
    setStatus("saving");
    setError("");
    void window.skillsManager
      ?.clearGitHubToken?.()
      .then((nextSettings) => {
        setSettings(nextSettings);
        setGithubToken("");
        setStatus("idle");
      })
      .catch((unknownError: unknown) => {
        setError(toErrorMessage(unknownError) || "清除 GitHub token 失败。");
        setStatus("error");
      });
  };

  const updateAutoDistributeOnSync = (autoDistributeOnSync: boolean) => {
    if (!window.skillsManager?.updateDistributionSettings) {
      setError("分发设置接口不可用。");
      setDistributionStatus("error");
      return;
    }

    setDistributionStatus("saving");
    setError("");

    void window.skillsManager
      .updateDistributionSettings({ autoDistributeOnSync })
      .then((nextSettings) => {
        setSettings(nextSettings);
        setDistributionStatus("saved");
      })
      .catch((unknownError: unknown) => {
        setError(toErrorMessage(unknownError) || "保存分发设置失败。");
        setDistributionStatus("error");
      });
  };

  const copyPath = (value: string) => {
    void navigator.clipboard?.writeText(value);
  };

  const openOfficialSite = () => {
    if (!window.skillsManager?.openExternalUrl) {
      setOfficialSiteError("打开官方网站的接口不可用。");
      return;
    }

    void window.skillsManager
      .openExternalUrl(OFFICIAL_SITE_URL)
      .then(() => setOfficialSiteError(""))
      .catch((unknownError: unknown) => {
        setOfficialSiteError(toErrorMessage(unknownError) || "无法打开官方网站。");
      });
  };

  const openGitHubTokenHelp = () => {
    if (!window.skillsManager?.openExternalUrl) {
      setError("打开 GitHub token 帮助的接口不可用。");
      setStatus("error");
      return;
    }

    void window.skillsManager
      .openExternalUrl(GITHUB_TOKEN_HELP_URL)
      .catch((unknownError: unknown) => {
        setError(toErrorMessage(unknownError) || "无法打开 GitHub token 帮助页面。");
        setStatus("error");
      });
  };

  const confirmResetLocalDatabase = () => {
    if (!window.skillsManager?.resetLocalDatabase) {
      setStorageError("重建本地数据库接口不可用。");
      setStorageStatus("error");
      setIsResetDialogOpen(false);
      return;
    }

    setStorageStatus("resetting");
    setStorageError("");

    void window.skillsManager
      .resetLocalDatabase()
      .then((result) => {
        setSettings(result.settings);
        setStoragePaths(result.storage);
        setGithubToken("");
        setStatus("idle");
        setStorageStatus("reset");
        setIsResetDialogOpen(false);
      })
      .catch((unknownError: unknown) => {
        setStorageError(toErrorMessage(unknownError) || "重建本地数据库失败。");
        setStorageStatus("error");
        setIsResetDialogOpen(false);
      });
  };

  const isSaving = status === "saving";
  const isSavingDistribution = distributionStatus === "saving";
  const isResetting = storageStatus === "resetting";
  const autoDistributeOnSync = settings.distribution.autoDistributeOnSync;
  const activeSettingsSection = (() => {
    switch (activeSettingsNavigationHref) {
      case "#github-token":
        return (
          <SettingsPanel
            id="github-token"
            icon={<KeyRound aria-hidden="true" />}
            title="凭证管理"
            description="管理 Skills Manager 访问代码托管平台所需的凭证。"
          >
            <CredentialProviderBlock
              id="github-credential"
              icon={<GitBranch aria-hidden="true" />}
              title="GitHub token"
              titleAction={
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="查看 GitHub token 创建帮助"
                        onClick={openGitHubTokenHelp}
                      />
                    }
                  >
                    <CircleHelpIcon />
                  </TooltipTrigger>
                  <TooltipContent>如何创建 GitHub token</TooltipContent>
                </Tooltip>
              }
            >
              <div className="grid max-w-2xl gap-4">
                <Field>
                  <FieldLabel className="sr-only">GitHub token</FieldLabel>
                  <Input
                    type="password"
                    value={githubToken}
                    placeholder={settings.github.hasToken ? "********" : "请输入 GitHub Token"}
                    disabled={isSaving}
                    onValueChange={setGithubToken}
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={isSaving} onClick={saveToken}>
                    保存
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={clearToken}
                  >
                    清除
                  </Button>
                </div>

                {status === "saved" ? (
                  <p className="text-sm text-muted-foreground">已保存 GitHub token。</p>
                ) : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
              </div>
            </CredentialProviderBlock>
          </SettingsPanel>
        );
      case "#skill-distribution":
        return (
          <SettingsPanel
            id="skill-distribution"
            icon={<PackageCheck aria-hidden="true" />}
            title="技能分发"
            description="控制来源同步完成后，是否自动分发到已经在 Skills/Targets 中设置的目标目录。"
            action={
              <Badge variant={autoDistributeOnSync ? "secondary" : "outline"}>
                {autoDistributeOnSync ? "已开启" : "已关闭"}
              </Badge>
            }
          >
            <div className="grid max-w-2xl gap-3">
              <label className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-border bg-muted/40 p-3">
                <span className="min-w-0">
                  <span
                    id="skill-distribution-auto-label"
                    className="block text-sm font-semibold text-foreground"
                  >
                    同步后自动分发到已设置目标
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    开启后，从来源同步完成后，各个技能会自动分发到已选择的目标目录。
                  </span>
                </span>
                <Switch
                  aria-labelledby="skill-distribution-auto-label"
                  checked={autoDistributeOnSync}
                  disabled={isSavingDistribution}
                  onCheckedChange={updateAutoDistributeOnSync}
                />
              </label>
              {distributionStatus === "saved" ? (
                <p className="text-sm text-muted-foreground">已保存分发设置。</p>
              ) : null}
            </div>
          </SettingsPanel>
        );
      case "#local-storage":
        return (
          <SettingsPanel
            id="local-storage"
            icon={<Database aria-hidden="true" />}
            title="本地存储"
            description="查看 Skills Manager 的本地缓存根目录和 SQLite 数据库文件路径。"
          >
            <div className="grid gap-3">
              <StoragePathRow
                icon={<FolderOpen aria-hidden="true" />}
                label="本地缓存总路径"
                value={
                  storagePaths?.localCachePath ?? (storageStatus === "loading" ? "读取中..." : "--")
                }
                copyLabel="复制路径"
                disabled={!storagePaths?.localCachePath}
                onCopy={() => storagePaths?.localCachePath && copyPath(storagePaths.localCachePath)}
              />
              <StoragePathRow
                icon={<Database aria-hidden="true" />}
                label="本地数据库路径"
                value={
                  storagePaths?.databasePath ?? (storageStatus === "loading" ? "读取中..." : "--")
                }
                copyLabel="复制路径"
                disabled={!storagePaths?.databasePath}
                onCopy={() => storagePaths?.databasePath && copyPath(storagePaths.databasePath)}
              />
            </div>
          </SettingsPanel>
        );
      case DATA_RESET_NAVIGATION_HREF:
        if (!isDataResetVisible) {
          return null;
        }

        return (
          <section
            className="grid scroll-mt-6 gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4"
            aria-labelledby="settings-data-reset"
          >
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
                <h2 id="settings-data-reset" className="scroll-mt-6 font-semibold">
                  数据重置
                </h2>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                重建数据库会清空本地索引、来源、Skills 和应用设置。已安装到 agent
                目标目录的文件不会被删除。
              </p>
            </div>

            <Button
              type="button"
              variant="destructive"
              disabled={isResetting}
              onClick={() => setIsResetDialogOpen(true)}
            >
              <RotateCcw aria-hidden="true" />
              重建本地数据库
            </Button>
            {storageStatus === "reset" ? (
              <p className="text-sm text-muted-foreground">本地数据库已重建。</p>
            ) : null}
            {storageError ? <p className="text-sm text-destructive">{storageError}</p> : null}
          </section>
        );
      case "#settings-about":
        return (
          <section
            id="settings-about"
            className="flex min-h-[calc(100svh-100px)] scroll-mt-6 items-center justify-center text-center"
            aria-labelledby="settings-about-heading"
          >
            <h2 id="settings-about-heading" className="sr-only">
              关于
            </h2>
            <div className="flex flex-col items-center justify-center">
              <img src={skillsManagerMark} alt="Skills Manager logo" className="size-16" />
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={openOfficialSite}
                  aria-label="访问 Skills Manager 官方网站 https://sk.magicfuture.app"
                  className="inline-flex items-center gap-1.5 rounded-sm text-lg font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:text-primary"
                >
                  Skills Manager
                  <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  Sync and distribute agent skills
                </p>
              </div>
              <p className="mt-5 text-sm font-medium text-muted-foreground">
                版本 {appInfo?.version ?? "--"}
              </p>
              {officialSiteError ? (
                <p className="mt-2 text-sm text-destructive">{officialSiteError}</p>
              ) : null}
            </div>
          </section>
        );
    }
  })();

  return (
    <div className="grid h-full grid-cols-[248px_minmax(0,1fr)] overflow-hidden bg-background">
      <aside
        className="sticky top-0 flex h-[calc(100svh-44px)] flex-col overflow-y-auto border-r border-border bg-card px-4 py-5"
        aria-label="设置页面侧边栏"
      >
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-foreground">设置</h2>
        </div>

        <nav className="grid gap-1" aria-label="设置页面导航">
          {getVisibleSettingsNavigationItems(isDataResetVisible).map((item) => {
            const isActive = activeSettingsNavigationHref === item.href;

            return (
              <a
                key={item.href}
                href={getSettingsNavigationLinkHref(window.location.hash, item.href)}
                className={[
                  "rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                ].join(" ")}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => navigateToSettingsSection(event, item.href)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

      </aside>

      <main
        ref={settingsContentRef}
        className="h-[calc(100svh-44px)] min-w-0 overflow-y-auto p-7"
        aria-label="设置内容"
      >
        <div className="grid max-w-4xl gap-5">{activeSettingsSection}</div>
      </main>

      <AlertDialog
        open={isResetDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!isResetting) {
            setIsResetDialogOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重建本地数据库？</AlertDialogTitle>
            <AlertDialogDescription>
              会清空本地索引、来源、Skills 和应用设置，但不会删除已安装到 agent
              目标目录的文件，也不会清空本地缓存目录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>取消</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={isResetting}
              onClick={confirmResetLocalDatabase}
            >
              <RotateCcw aria-hidden="true" />
              确认重建
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SettingsPanel = ({
  action,
  children,
  description,
  icon,
  id,
  title
}: React.PropsWithChildren<{
  action?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  id: string;
  title: string;
}>) => {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby={id}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-4 items-center justify-center text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
            <h2 id={id} className="scroll-mt-6 text-base font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
};

const CredentialProviderBlock = ({
  children,
  icon,
  id,
  title,
  titleAction
}: React.PropsWithChildren<{
  icon: React.ReactNode;
  id: string;
  title: string;
  titleAction?: React.ReactNode;
}>) => {
  return (
    <section
      className="rounded-lg border border-border bg-muted/40 p-3"
      aria-labelledby={id}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-4 items-center justify-center text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <h3 id={id} className="text-sm font-semibold text-foreground">
            {title}
          </h3>
          {titleAction}
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
};

const StoragePathRow = ({
  copyLabel,
  disabled,
  icon,
  label,
  value,
  onCopy
}: {
  copyLabel: string;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: () => void;
}) => {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="inline-flex size-4 items-center justify-center [&_svg]:size-4">
            {icon}
          </span>
          {label}
        </div>
        <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
      </div>
      <Button type="button" variant="outline" disabled={disabled} onClick={onCopy}>
        <Copy aria-hidden="true" />
        {copyLabel}
      </Button>
    </div>
  );
};
