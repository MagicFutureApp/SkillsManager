import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Form } from "@base-ui/react/form";
import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        "fixed inset-x-0 bottom-0 top-11 z-50 bg-foreground/30 data-ending-style:animate-out data-ending-style:fade-out-0 data-starting-style:animate-in data-starting-style:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

/**
 * 弹窗外壳几何：宽度固定落在 650-680px，高度上限 78svh（约占整体高度的 70%-80%）；
 * 纵向 flex 容器，由 header / body / footer 三个区域自行负责内边距。
 */
function DialogPopup({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-popup"
      className={cn(
        "fixed left-1/2 top-[calc(50svh_+_22px)] z-50 flex max-h-[78svh] w-[calc(100vw-48px)] min-w-[650px] max-w-[680px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg outline-none data-ending-style:animate-out data-ending-style:fade-out-0 data-ending-style:zoom-out-95 data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:zoom-in-95",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-2xl font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("mt-1 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export type ModalProps = React.PropsWithChildren<{
  /** 是否显示弹窗 */
  open: boolean;
  /** 请求关闭：点遮罩、按 Esc、点右上角关闭按钮都走这里 */
  onClose: () => void;
  /** 标题文字 */
  title: React.ReactNode;
  /** 副标题文字 */
  description?: React.ReactNode;
  /** 标题左侧图标，与标题首行居中对齐 */
  icon?: React.ReactNode;
  /** 页脚按钮 */
  footer?: React.ReactNode;
  /** 内容底部统一的错误提示 */
  error?: string;
  /** 传入后弹窗内容变为表单，回车可提交 */
  onSubmit?: () => void;
  /** 右上角关闭按钮文案，默认读 common.close */
  closeLabel?: string;
  /** 右上角关闭按钮禁用 */
  closeDisabled?: boolean;
  /** 是否显示右上角关闭按钮，默认显示 */
  showClose?: boolean;
  /** 是否渲染遮罩，默认渲染 */
  backdrop?: boolean;
  /** 是否模态：锁定焦点并阻断背景交互，默认模态 */
  modal?: boolean;
  /** 弹窗语义，确认类弹窗可传 alertdialog */
  role?: "dialog" | "alertdialog";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}>;

/**
 * 全应用统一弹窗。标题、副标题、内容、页脚按钮都是插槽，
 * 头部和页脚固定不动，内容超出时只在内容区滚动。
 * 宽度不设档位，所有弹窗统一落在 650-680px（见 DialogPopup）。
 */
export const Modal = ({
  backdrop = true,
  bodyClassName,
  children,
  className,
  closeDisabled,
  closeLabel,
  description,
  error,
  footer,
  footerClassName,
  headerClassName,
  icon,
  modal,
  onClose,
  onSubmit,
  open,
  role = "dialog",
  showClose = true,
  title
}: ModalProps) => {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  const header = (
    <header
      data-slot="modal-header"
      className={cn("flex shrink-0 items-start justify-between gap-4 p-5", headerClassName)}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="flex h-8 shrink-0 items-center">{icon}</span> : null}
        <div className="min-w-0">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </div>
      </div>
      {showClose ? (
        <DialogClose
          disabled={closeDisabled}
          render={<Button type="button" variant="outline" size="sm" />}
        >
          {closeLabel ?? t("common.close")}
        </DialogClose>
      ) : null}
    </header>
  );

  const body = (
    <div
      data-slot="modal-body"
      className={cn("min-h-10 min-w-0 flex-1 overflow-y-auto px-5", bodyClassName)}
    >
      {children}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );

  const footerContent = footer ? (
    <footer
      data-slot="modal-footer"
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 p-5 pt-4",
        footerClassName
      )}
    >
      {footer}
    </footer>
  ) : null;

  return (
    <DialogPrimitive.Root
      open={open}
      modal={modal}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        {backdrop ? <DialogBackdrop /> : null}
        <DialogPopup role={role} className={className}>
          {onSubmit ? (
            <Form
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onFormSubmit={onSubmit}
            >
              {header}
              {body}
              {footerContent}
            </Form>
          ) : (
            <>
              {header}
              {body}
              {footerContent}
            </>
          )}
        </DialogPopup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle
};
