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

export const useTargetsPageState = () => {
  const [query, setQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [scanIssues, setScanIssues] = useState<TargetIssue[]>([]);
  const [sort, setSort] = useState<TargetSort>("name");
  const [targets, setTargets] = useState<TargetViewModel[]>([]);

  const applyTargetsResult = (result?: TargetsResultLike) => {
    const nextTargets = adaptTargets({
      registeredTargets: result?.registeredTargets ?? []
    });

    setTargets(nextTargets);
    setSelectedTargetId((currentTargetId) => {
      if (currentTargetId && nextTargets.some((target) => target.id === currentTargetId)) {
        return currentTargetId;
      }

      return nextTargets[0]?.id ?? null;
    });
  };

  const refreshTargets = async () => {
    const rescanResult = await window.skillsManager?.rescanTargets?.();
    const result: TargetsResultLike | undefined =
      rescanResult ?? (await window.skillsManager?.listTargets?.());

    applyTargetsResult(result);
    setScanIssues(rescanResult?.scanIssues ?? []);
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
    query,
    scanIssues,
    selectedTarget,
    selectedTargetId,
    sort,
    targets,
    visibleTargets,
    refreshTargets,
    setScanIssues,
    setQuery,
    setSelectedTargetId,
    setSort
  };
};

export type TargetsPageState = ReturnType<typeof useTargetsPageState>;
