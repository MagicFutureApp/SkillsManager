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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toErrorMessage } from "@/lib/errors";
import skillportLogo from "@/assets/skillport-logo.svg";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  FolderOpen,
  KeyRound,
  PackageCheck,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { AppInfo, AppSettingsResult, AppStoragePathsResult } from "@/global";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type StorageStatus = "loading" | "idle" | "resetting" | "reset" | "error";
const GITHUB_TOKEN_CREATION_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Skills+Manager&description=Read+repository+metadata+and+SKILL.md+files&contents=read";
const settingsNavigationItems = [
  { href: "#github-token", label: "GitHub API token" },
  { href: "#skill-distribution", label: "技能分发" },
  { href: "#local-storage", label: "本地存储" },
  { href: "#github-token-help", label: "如何创建 GitHub token" },
  { href: "#settings-danger-zone", label: "危险操作" },
  { href: "#settings-about", label: "关于" }
] as const;
type SettingsNavigationHref = (typeof settingsNavigationItems)[number]["href"];

const getSettingsNavigationHrefFromHash = (hash: string): SettingsNavigationHref => {
  return (
    settingsNavigationItems.find((item) => item.href === hash)?.href ??
    settingsNavigationItems[0].href
  );
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
  const [activeSettingsNavigationHref, setActiveSettingsNavigationHref] =
    useState<SettingsNavigationHref>(settingsNavigationItems[0].href);
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
      setActiveSettingsNavigationHref(getSettingsNavigationHrefFromHash(window.location.hash));
    };

    syncActiveNavigationHref();
    window.addEventListener("hashchange", syncActiveNavigationHref);
    window.addEventListener("popstate", syncActiveNavigationHref);

    return () => {
      window.removeEventListener("hashchange", syncActiveNavigationHref);
      window.removeEventListener("popstate", syncActiveNavigationHref);
    };
  }, []);

  const scrollSettingsSectionIntoView = (href: SettingsNavigationHref) => {
    const contentElement = settingsContentRef.current;
    const targetElement = document.getElementById(href.slice(1));

    if (!contentElement || !targetElement) {
      return;
    }

    const contentRect = contentElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const nextScrollTop = Math.max(
      0,
      contentElement.scrollTop + targetRect.top - contentRect.top - 24
    );

    resetSettingsWindowScroll();

    if (typeof contentElement.scrollTo === "function") {
      contentElement.scrollTo({ top: nextScrollTop });
      return;
    }

    contentElement.scrollTop = nextScrollTop;
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
      `${window.location.pathname}${window.location.search}${href}`
    );
    scrollSettingsSectionIntoView(href);
    window.setTimeout(() => {
      resetSettingsWindowScroll();
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

  const openGitHubTokenCreationPage = () => {
    void window.skillsManager
      ?.openExternalUrl?.(GITHUB_TOKEN_CREATION_URL)
      .catch((unknownError: unknown) => {
        setError(toErrorMessage(unknownError) || "无法打开 GitHub token 创建页面。");
        setStatus("error");
      });
  };

  const copyPath = (value: string) => {
    void navigator.clipboard?.writeText(value);
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
  const tokenStatusLabel = settings.github.hasToken ? "已配置" : "未配置";
  const autoDistributeOnSync = settings.distribution.autoDistributeOnSync;

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
          {settingsNavigationItems.map((item) => {
            const isActive = activeSettingsNavigationHref === item.href;

            return (
              <a
                key={item.href}
                href={item.href}
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

        <section className="mt-auto rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-muted-foreground" aria-hidden="true" />
            <h2 className="font-semibold">凭据状态</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {settings.github.hasToken
              ? "GitHub token 已保存在本机设置中。替换时只需要输入新 token 并保存。"
              : "尚未保存 GitHub token。公共仓库仍可扫描，但请求频率限制更低。"}
          </p>
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
            <span className="text-xs font-semibold text-muted-foreground">安全提示</span>
            <p className="mt-1 text-sm leading-6">
              保存后的 token 不会回显到界面，也不会离开本机应用设置。
            </p>
          </div>
        </section>
      </aside>

      <main
        ref={settingsContentRef}
        className="h-[calc(100svh-44px)] min-w-0 overflow-y-auto p-7"
        aria-labelledby="settings-heading"
      >
        <header className="mb-6 max-w-4xl">
          <h1 id="settings-heading" className="text-[28px] font-semibold leading-tight">
            配置本地应用偏好
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            管理 GitHub API 访问凭据和本地扫描相关设置。GitHub token
            仅保存在本机设置中，不会回显到界面。
          </p>
        </header>

        <div className="grid max-w-4xl gap-5">
          <SettingsPanel
            id="github-token"
            icon={<KeyRound aria-hidden="true" />}
            title="GitHub API token"
            description="用于解析 GitHub repo metadata 和 tree API，避免未认证请求的低频率限制。"
            action={
              <Badge variant={settings.github.hasToken ? "secondary" : "outline"}>
                {tokenStatusLabel}
              </Badge>
            }
          >
            <div className="grid max-w-2xl gap-4">
              <Field>
                <FieldLabel>GitHub token</FieldLabel>
                <Input
                  type="password"
                  value={githubToken}
                  placeholder="github_pat_..."
                  disabled={isSaving}
                  onValueChange={setGithubToken}
                />
                <FieldDescription>
                  {settings.github.hasToken
                    ? "当前 token 不会回显，输入新 token 后保存即可替换。"
                    : "建议使用 fine-grained token，并授予 Metadata read 与 Contents read。"}
                </FieldDescription>
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={isSaving} onClick={saveToken}>
                  <Save aria-hidden="true" />
                  保存 GitHub token
                </Button>
                <Button type="button" variant="outline" disabled={isSaving} onClick={clearToken}>
                  <Trash2 aria-hidden="true" />
                  清除 GitHub token
                </Button>
              </div>

              {status === "saved" ? (
                <p className="text-sm text-muted-foreground">已保存 GitHub token。</p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </SettingsPanel>

          <SettingsPanel
            id="skill-distribution"
            icon={<PackageCheck aria-hidden="true" />}
            title="技能分发"
            description="控制来源同步完成后，是否自动 copy 到已经在 Skills/Targets 中设置的目标目录。"
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
                    关闭时，同步完成后只显示可手动分发的数量；开启后，会自动 copy
                    到已选择的目标目录。
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

          <SettingsPanel
            id="local-storage"
            icon={<Database aria-hidden="true" />}
            title="本地存储"
            description="查看 Skills Manager 的本地缓存根目录和 SQLite 数据库文件路径。重建数据库会清空本地索引，不会删除缓存目录或 agent 目标目录中的文件。"
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

          <section
            className="grid scroll-mt-6 gap-4 rounded-xl border border-border bg-card p-4"
            aria-labelledby="github-token-help"
          >
            <div>
              <h2 id="github-token-help" className="scroll-mt-6 font-semibold">
                如何创建 GitHub token
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                请选择 Fine-grained personal access token。它可以限制资源 owner、仓库范围和权限，比
                classic token 更适合这里的只读访问。
              </p>
            </div>

            <ol className="grid gap-2 text-sm leading-6 text-muted-foreground">
              <li>1. 打开 GitHub 的 Fine-grained tokens 创建页，填写 token 名称和过期时间。</li>
              <li>2. Repository access 选择只需要扫描的仓库。</li>
              <li>
                3. Repository permissions 至少确认 <strong>Contents: Read-only</strong> 和{" "}
                <strong>Metadata: Read-only</strong>。
              </li>
              <li>4. 生成后复制 token，回到本页粘贴并保存。</li>
            </ol>

            <Button type="button" variant="outline" onClick={openGitHubTokenCreationPage}>
              <ExternalLink aria-hidden="true" />
              打开 GitHub token 创建页面
            </Button>
          </section>

          <section
            className="grid scroll-mt-6 gap-4 rounded-xl border border-destructive/25 bg-destructive/5 p-4"
            aria-labelledby="settings-danger-zone"
          >
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
                <h2 id="settings-danger-zone" className="scroll-mt-6 font-semibold">
                  危险操作
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

          <section
            id="settings-about"
            className="grid scroll-mt-6 place-items-center rounded-xl border border-border bg-card px-4 py-10 text-center"
            aria-labelledby="settings-about-heading"
          >
            <h2 id="settings-about-heading" className="sr-only">
              关于
            </h2>
            <img src={skillportLogo} alt="Skillport" className="h-16 w-auto" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              版本 {appInfo?.version ?? "--"}
            </p>
          </section>
        </div>
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
