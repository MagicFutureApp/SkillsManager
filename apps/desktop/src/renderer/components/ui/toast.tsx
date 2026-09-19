import { useTranslation } from "react-i18next";
import { type LucideIcon, CheckCircle2, XCircle, X } from "lucide-react";
import { Toast } from "@base-ui/react/toast";
import React from "react";

const toastManager = Toast.createToastManager();

export type ToastType = "success" | "error" | "info";

/**
 * 命令式入口，等价于原先的 toast.success/error/info。
 * 内部基于 Base UI 的全局 ToastManager，可在 React 组件树之外调用。
 */
export const toast = {
  success: (message: string, duration = 4000) =>
    toastManager.add({ type: "success", description: message, timeout: duration }),
  error: (message: string, duration = 5000) =>
    toastManager.add({
      type: "error",
      description: message,
      timeout: duration,
      priority: "high"
    }),
  info: (message: string, duration = 4000) =>
    toastManager.add({ type: "info", description: message, timeout: duration }),
  clear: () => toastManager.close()
};

const TOAST_ICON: Record<ToastType, LucideIcon> = {
  error: XCircle,
  info: CheckCircle2,
  success: CheckCircle2
};

const TOAST_ICON_CLASS: Record<ToastType, string> = {
  error: "text-destructive",
  info: "text-muted-foreground",
  success: "text-emerald-500"
};

/**
 * 应用根挂载点：Provider + Portal + Viewport，由 useToastManager 驱动渲染。
 * 外部 toast.success/error/info 通过 toastManager 注入同一 Provider。
 */
export function ToastHost() {
  return (
    <Toast.Provider toastManager={toastManager} timeout={5000} limit={5}>
      <Toast.Portal>
        <Toast.Viewport className="pointer-events-none fixed right-6 top-16 z-[70] flex w-full max-w-sm flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();

  return (
    <>
      {toasts.map((toastItem) => (
        <ToastCard key={toastItem.id} toast={toastItem} />
      ))}
    </>
  );
}

function ToastCard({ toast: toastItem }: { toast: Parameters<typeof Toast.Root>[0]["toast"] }) {
  const { t } = useTranslation();
  const type = (toastItem.type as ToastType | undefined) ?? "info";
  const Icon = TOAST_ICON[type];

  return (
    <Toast.Root
      toast={toastItem}
      data-testid="app-toast"
      data-toast-type={type}
      className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-5 text-card-foreground shadow-lg"
    >
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-4 shrink-0 ${TOAST_ICON_CLASS[type]}`}
      />
      <Toast.Content className="min-w-0 flex-1">
        <Toast.Description />
      </Toast.Content>
      <Toast.Close
        aria-label={t("common.close")}
        className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X aria-hidden="true" className="size-3.5" />
      </Toast.Close>
    </Toast.Root>
  );
}
