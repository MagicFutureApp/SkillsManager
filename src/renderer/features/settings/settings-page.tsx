import { Button } from "@/components/ui/button";
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
import {
  Copy,
  Database,
  ExternalLink,
  FolderOpen,
  KeyRound,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import React, { useEffect, useState } from "react";
import type { AppSettingsResult, AppStoragePathsResult } from "@/global";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type StorageStatus = "loading" | "idle" | "resetting" | "reset" | "error";
const GITHUB_TOKEN_CREATION_URL =
  "https://github.com/settings/personal-access-tokens/new?name=Skills+Manager&description=Read+repository+metadata+and+SKILL.md+files&contents=read";

export const SettingsPage = () => {
  const [settings, setSettings] = useState<AppSettingsResult>({ github: { hasToken: false } });
  const [storagePaths, setStoragePaths] = useState<AppStoragePathsResult | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("loading");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

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

    return () => {
      isCurrent = false;
    };
  }, []);

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
  const isResetting = storageStatus === "resetting";

  return (
    <div className="grid gap-5 p-7">
      <header>
        <p className="text-sm font-medium text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">配置本地应用偏好</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          管理 GitHub API 访问凭据和本地扫描相关设置。GitHub token
          仅保存在本机设置中，不会回显到界面。
        </p>
      </header>

      <section className="grid gap-4 border-t border-border pt-5" aria-labelledby="github-token">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="github-token" className="text-base font-semibold text-foreground">
                GitHub API token
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              用于解析 GitHub repo metadata 和 tree API，避免未认证请求的低频率限制。
            </p>
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
            {settings.github.hasToken ? "已配置" : "未配置"}
          </span>
        </div>

        <Field className="max-w-2xl">
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

        <div className="flex gap-2">
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
      </section>

      <section className="grid gap-4 border-t border-border pt-5" aria-labelledby="local-storage">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="local-storage" className="text-base font-semibold text-foreground">
                本地存储
              </h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              查看 Skills Manager 的本地缓存根目录和 SQLite
              数据库文件路径。重建数据库会清空本地索引，不会删除缓存目录或 agent 目标目录中的文件。
            </p>
          </div>
        </div>

        <div className="grid max-w-4xl gap-3">
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
            value={storagePaths?.databasePath ?? (storageStatus === "loading" ? "读取中..." : "--")}
            copyLabel="复制路径"
            disabled={!storagePaths?.databasePath}
            onCopy={() => storagePaths?.databasePath && copyPath(storagePaths.databasePath)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {storageError ? <p className="text-sm text-destructive">{storageError}</p> : null}
      </section>

      <section
        className="grid max-w-3xl gap-4 border-t border-border pt-5"
        aria-labelledby="github-token-help"
      >
        <div>
          <h2 id="github-token-help" className="text-base font-semibold text-foreground">
            如何创建 GitHub token
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            请选择 Fine-grained personal access token。它可以限制资源 owner、仓库范围和权限，比
            classic token 更适合这里的只读访问。
          </p>
        </div>

        <ol className="grid gap-2 text-sm text-muted-foreground">
          <li>1. 打开 GitHub 的 Fine-grained tokens 创建页，填写 token 名称、过期时间和说明。</li>
          <li>
            2. Repository access 选择只需要扫描的仓库；如果只扫 public repo，可保留默认公开访问。
          </li>
          <li>
            3. Repository permissions 至少确认 <strong>Contents: Read-only</strong> 和{" "}
            <strong>Metadata: Read-only</strong>。
          </li>
          <li>4. 生成后复制 token，回到本页粘贴并保存。保存后 token 不会在界面回显。</li>
        </ol>

        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={openGitHubTokenCreationPage}
        >
          <ExternalLink aria-hidden="true" />
          打开 GitHub token 创建页面
        </Button>
      </section>

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
              会清空本地索引、来源、Skills、同步历史和应用设置，但不会删除已安装到 agent
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

const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "";
};
