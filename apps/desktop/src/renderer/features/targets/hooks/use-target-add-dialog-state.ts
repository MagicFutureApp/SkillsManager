import { useState } from "react";

import type { TargetDirectoryAgentOption } from "@/global";

export type PendingTargetAgentDirectory = {
  basePath: string;
  options: TargetDirectoryAgentOption[];
};

export type SaveTargetInput = {
  name: string;
  targetPath: string;
};

export type TargetAddDialogState = {
  addTargetError: string;
  addTargetName: string;
  addTargetPath: string;
  closeAddTargetDialog: () => void;
  customTargetAgentDirectoryName: string;
  isAddTargetDialogOpen: boolean;
  isCustomTargetAgentDirectorySelected: boolean;
  isSavingTarget: boolean;
  openAddTargetDialog: () => void;
  pendingTargetAgentDirectory: PendingTargetAgentDirectory | null;
  saveAddTarget: () => Promise<void>;
  selectCustomTargetAgentDirectoryOption: () => void;
  selectTargetAgentDirectoryOption: (option: TargetDirectoryAgentOption) => void;
  selectTargetPath: () => Promise<void>;
  selectedTargetAgentType: string | null;
  setCustomTargetAgentDirectoryName: (directoryName: string) => void;
  setPendingTargetName: (name: string) => void;
};

type UseTargetAddDialogStateOptions<TResult> = {
  isSaveAvailable: () => boolean;
  onSaved: (result: TResult, input: SaveTargetInput) => void;
  saveTarget: (input: SaveTargetInput) => Promise<TResult>;
};

export const customTargetAgentType = "custom";

export const editableTargetAgentDirectoryDefinitions = [
  { directoryName: ".codex", name: "Codex", type: "codex" },
  { directoryName: ".claude", name: "Claude Code", type: "claude-code" },
  { directoryName: ".gemini", name: "Gemini CLI", type: "gemini-cli" }
] satisfies Array<Omit<TargetDirectoryAgentOption, "targetPath">>;

export const useTargetAddDialogState = <TResult>({
  isSaveAvailable,
  onSaved,
  saveTarget
}: UseTargetAddDialogStateOptions<TResult>): TargetAddDialogState => {
  const [addTargetError, setAddTargetError] = useState("");
  const [addTargetName, setAddTargetName] = useState("");
  const [addTargetPath, setAddTargetPath] = useState("");
  const [customTargetAgentDirectoryName, setCustomTargetAgentDirectoryNameValue] = useState("");
  const [isAddTargetDialogOpen, setIsAddTargetDialogOpen] = useState(false);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [isTargetNameDirty, setIsTargetNameDirty] = useState(false);
  const [pendingTargetAgentDirectory, setPendingTargetAgentDirectory] =
    useState<PendingTargetAgentDirectory | null>(null);
  const [selectedTargetAgentType, setSelectedTargetAgentType] = useState<string | null>(null);

  const resetTargetForm = () => {
    setAddTargetError("");
    setAddTargetName("");
    setAddTargetPath("");
    setCustomTargetAgentDirectoryNameValue("");
    setIsTargetNameDirty(false);
    setPendingTargetAgentDirectory(null);
    setSelectedTargetAgentType(null);
  };

  const openAddTargetDialog = () => {
    resetTargetForm();
    setIsAddTargetDialogOpen(true);
  };

  const closeAddTargetDialog = () => {
    if (isSavingTarget) {
      return;
    }

    setAddTargetError("");
    setIsAddTargetDialogOpen(false);
  };

  const setPendingTargetName = (name: string) => {
    setIsTargetNameDirty(true);
    setAddTargetName(name);
  };

  const applyResolvedTargetPath = (targetPath: string) => {
    setAddTargetPath(targetPath);
    setAddTargetError("");
    setAddTargetName((currentName) => {
      if (isTargetNameDirty && currentName.trim()) {
        return currentName;
      }

      return deriveTargetNameFromPath(targetPath);
    });
  };

  const applyCustomTargetAgentDirectoryName = (
    directoryName: string,
    pendingDirectory: PendingTargetAgentDirectory | null = pendingTargetAgentDirectory
  ) => {
    if (!pendingDirectory) {
      return;
    }

    const normalizedDirectoryName = normalizeCustomTargetAgentDirectoryName(directoryName);

    setAddTargetError("");

    if (!normalizedDirectoryName) {
      setAddTargetPath(pendingDirectory.basePath);
      return;
    }

    applyResolvedTargetPath(
      joinTargetPathSegments(pendingDirectory.basePath, normalizedDirectoryName, "skills")
    );
  };

  const selectCustomTargetAgentDirectoryOption = () => {
    setSelectedTargetAgentType(customTargetAgentType);
    applyCustomTargetAgentDirectoryName(customTargetAgentDirectoryName);
  };

  const selectTargetPath = async () => {
    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    if (!window.skillsManager?.resolveSelectedTargetDirectory) {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      setCustomTargetAgentDirectoryNameValue("");
      applyResolvedTargetPath(selectedPath);
      return;
    }

    const resolution = await window.skillsManager.resolveSelectedTargetDirectory(selectedPath);

    if (resolution.status === "resolved") {
      setPendingTargetAgentDirectory(null);
      setSelectedTargetAgentType(null);
      setCustomTargetAgentDirectoryNameValue("");
      applyResolvedTargetPath(resolution.targetPath);
      return;
    }

    setPendingTargetAgentDirectory({
      basePath: resolution.basePath,
      options: resolution.options
    });
    setSelectedTargetAgentType(resolution.selectedAgentType ?? null);
    setCustomTargetAgentDirectoryNameValue(resolution.customDirectoryName ?? "");
    setAddTargetPath(resolution.targetPath ?? resolution.basePath);
    setAddTargetError("");
    setAddTargetName((currentName) => {
      if (isTargetNameDirty && currentName.trim()) {
        return currentName;
      }

      return deriveTargetNameFromPath(
        resolution.targetPath ?? resolution.options[0]?.targetPath ?? resolution.basePath
      );
    });
  };

  const selectTargetAgentDirectoryOption = (option: TargetDirectoryAgentOption) => {
    setSelectedTargetAgentType(option.type);
    applyResolvedTargetPath(option.targetPath);
  };

  const setCustomTargetAgentDirectoryName = (directoryName: string) => {
    setCustomTargetAgentDirectoryNameValue(directoryName);
    setSelectedTargetAgentType(customTargetAgentType);
    applyCustomTargetAgentDirectoryName(directoryName);
  };

  const saveAddTarget = async () => {
    const name = addTargetName.trim();
    const targetPath = addTargetPath.trim();

    if (
      selectedTargetAgentType === customTargetAgentType &&
      !normalizeCustomTargetAgentDirectoryName(customTargetAgentDirectoryName)
    ) {
      setAddTargetError("customAgentDirectoryRequired");
      return;
    }

    if (!name || !targetPath) {
      setAddTargetError("required");
      return;
    }

    if (!isSaveAvailable()) {
      setAddTargetError("unavailable");
      return;
    }

    setAddTargetError("");
    setIsSavingTarget(true);

    try {
      const result = await saveTarget({ name, targetPath });

      onSaved(result, { name, targetPath });
      setIsAddTargetDialogOpen(false);
      resetTargetForm();
    } catch (error) {
      setAddTargetError(error instanceof Error ? error.message : "failed");
    } finally {
      setIsSavingTarget(false);
    }
  };

  return {
    addTargetError,
    addTargetName,
    addTargetPath,
    closeAddTargetDialog,
    customTargetAgentDirectoryName,
    isAddTargetDialogOpen,
    isCustomTargetAgentDirectorySelected: selectedTargetAgentType === customTargetAgentType,
    isSavingTarget,
    openAddTargetDialog,
    pendingTargetAgentDirectory,
    saveAddTarget,
    selectCustomTargetAgentDirectoryOption,
    selectTargetAgentDirectoryOption,
    selectTargetPath,
    selectedTargetAgentType,
    setCustomTargetAgentDirectoryName,
    setPendingTargetName
  };
};

export const deriveTargetNameFromPath = (targetPath: string): string => {
  const normalizedPath = targetPath.trim().replace(/[\\/]+$/g, "");
  const segments = normalizedPath.split(/[\\/]+/).filter(Boolean);

  return segments.at(-3) ?? segments.at(-1) ?? targetPath.trim();
};

export const createEditableTargetAgentDirectory = (targetPath: string) => {
  const normalizedPath = targetPath.trim().replace(/[\\/]+$/g, "");
  const lastSegment = getLastPathSegment(normalizedPath);
  const agentDirectoryPath =
    lastSegment === "skills" ? getPathDirname(normalizedPath) : normalizedPath;
  const agentDirectoryName = getLastPathSegment(agentDirectoryPath);
  const basePath = getPathDirname(agentDirectoryPath) || normalizedPath;
  const knownDefinition = editableTargetAgentDirectoryDefinitions.find(
    (definition) => definition.directoryName === agentDirectoryName
  );

  return {
    basePath,
    customDirectoryName: knownDefinition ? "" : agentDirectoryName,
    options: editableTargetAgentDirectoryDefinitions.map((definition) => ({
      ...definition,
      targetPath: joinTargetPathSegments(basePath, definition.directoryName, "skills")
    })),
    selectedAgentType: knownDefinition?.type ?? customTargetAgentType
  };
};

export const normalizeCustomTargetAgentDirectoryName = (directoryName: string): string => {
  return directoryName.trim().replace(/[\\/]+/g, "");
};

export const joinTargetPathSegments = (basePath: string, ...segments: string[]): string => {
  const separator = /^[A-Za-z]:[\\/]/.test(basePath) && basePath.includes("\\") ? "\\" : "/";
  const normalizedBasePath = basePath.trim().replace(/[\\/]+$/g, "");
  const normalizedSegments = segments.map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, ""));

  return [normalizedBasePath, ...normalizedSegments].filter(Boolean).join(separator);
};

const getLastPathSegment = (targetPath: string): string => {
  return (
    targetPath
      .replace(/[\\/]+$/g, "")
      .split(/[\\/]+/)
      .filter(Boolean)
      .at(-1) ?? ""
  );
};

const getPathDirname = (targetPath: string): string => {
  const normalizedPath = targetPath.replace(/[\\/]+$/g, "");
  const dirnameMatch = normalizedPath.match(/^(.*)[\\/][^\\/]+$/);

  if (!dirnameMatch) {
    return "";
  }

  return dirnameMatch[1] || (normalizedPath.startsWith("/") ? "/" : "");
};
