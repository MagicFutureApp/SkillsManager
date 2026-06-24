import { useEffect, useMemo, useState } from "react";

import {
  adaptTargets,
  filterTargets,
  type TargetIssue,
  type TargetSort,
  type TargetViewModel
} from "../components/targets-page-data";
import type { RegisteredTargetRecord } from "../../../../core/targets/target-api";

type TargetsResultLike = {
  registeredTargets?: RegisteredTargetRecord[];
  scanIssues?: TargetIssue[];
};

const minimumRescanLoadingMs = 2000;

export const useTargetsPageState = () => {
  const [query, setQuery] = useState("");
  const [isRefreshingTargets, setIsRefreshingTargets] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [scanIssues, setScanIssues] = useState<TargetIssue[]>([]);
  const [sort, setSort] = useState<TargetSort>("name");
  const [targets, setTargets] = useState<TargetViewModel[]>([]);

  const applyTargetsResult = (result?: TargetsResultLike, preferredTargetId?: string | null) => {
    const nextTargets = adaptTargets({
      registeredTargets: result?.registeredTargets ?? []
    });

    setTargets(nextTargets);
    setSelectedTargetId((currentTargetId) => {
      if (preferredTargetId && nextTargets.some((target) => target.id === preferredTargetId)) {
        return preferredTargetId;
      }

      if (currentTargetId && nextTargets.some((target) => target.id === currentTargetId)) {
        return currentTargetId;
      }

      return nextTargets[0]?.id ?? null;
    });
  };

  const refreshTargets = async () => {
    if (isRefreshingTargets) {
      return;
    }

    setIsRefreshingTargets(true);
    const loadingStartedAt = Date.now();
    let nextScanIssues: TargetIssue[] = [];

    try {
      const rescanResult = await window.skillsManager?.rescanTargets?.();
      const result: TargetsResultLike | undefined =
        rescanResult ?? (await window.skillsManager?.listTargets?.());

      applyTargetsResult(result);
      nextScanIssues = rescanResult?.scanIssues ?? [];
    } finally {
      await waitForMinimumElapsedTime(loadingStartedAt, minimumRescanLoadingMs);
      setIsRefreshingTargets(false);
      setScanIssues(nextScanIssues);
    }
  };

  const addTarget = async () => {
    const selectedPath = await window.skillsManager?.selectTargetDirectory?.();

    if (!selectedPath) {
      return;
    }

    const result = await window.skillsManager?.addCustomDirectoryTarget?.(selectedPath);
    const addedTarget = result?.registeredTargets.find((target) => target.path === selectedPath);

    applyTargetsResult(result, addedTarget?.id);
  };

  useEffect(() => {
    let isMounted = true;

    void window.skillsManager?.listTargets?.().then((result) => {
      if (!isMounted) {
        return;
      }

      applyTargetsResult(result);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTargets = useMemo(() => {
    return filterTargets({ query, sort, targets });
  }, [query, sort, targets]);

  useEffect(() => {
    if (!visibleTargets.length) {
      setSelectedTargetId(null);
      return;
    }

    setSelectedTargetId((currentTargetId) => {
      if (currentTargetId && visibleTargets.some((target) => target.id === currentTargetId)) {
        return currentTargetId;
      }

      return visibleTargets[0]?.id ?? null;
    });
  }, [visibleTargets]);

  const selectedTarget = visibleTargets.find((target) => target.id === selectedTargetId) ?? null;

  return {
    isRefreshingTargets,
    query,
    scanIssues,
    selectedTarget,
    selectedTargetId,
    sort,
    targets,
    visibleTargets,
    addTarget,
    refreshTargets,
    setScanIssues,
    setQuery,
    setSelectedTargetId,
    setSort
  };
};

export type TargetsPageState = ReturnType<typeof useTargetsPageState>;

const waitForMinimumElapsedTime = async (startedAt: number, minimumMs: number): Promise<void> => {
  const remainingMs = minimumMs - (Date.now() - startedAt);

  if (remainingMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, remainingMs));
};
