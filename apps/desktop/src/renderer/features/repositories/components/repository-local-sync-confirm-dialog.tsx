import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import React from "react";

type RepositoryLocalSyncConfirmDialogProps = {
  copy: {
    cancel: string;
    confirm: string;
    description: string;
    title: string;
  };
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const RepositoryLocalSyncConfirmDialog = ({
  copy,
  open,
  onClose,
  onConfirm
}: RepositoryLocalSyncConfirmDialogProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      role="alertdialog"
      showClose={false}
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {copy.cancel}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {copy.confirm}
          </Button>
        </>
      }
    />
  );
};
