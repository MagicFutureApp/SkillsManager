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
  if (!open) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{copy.confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
