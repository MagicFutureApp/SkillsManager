import { useEffect, useMemo, useState } from "react";

import {
  adaptTargets,
  filterTargets,
  type TargetSort,
  type TargetViewModel
} from "../components/targets-page-data";

export const useTargetsPageState = () => {
  const [query, setQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [sort, setSort] = useState<TargetSort>("name");
  const [targets, setTargets] = useState<TargetViewModel[]>([]);

  const loadTargets = async () => {
    const result = await window.skillsManager?.listTargets?.();
    const nextTargets = adaptTargets({
      detectedTargets: result?.detectedTargets ?? [],
      registeredTargets: result?.registeredTargets ?? []
    });

    setTargets(nextTargets);
    setSelectedTargetId((currentTargetId) => currentTargetId ?? nextTargets[0]?.id ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    void window.skillsManager?.listTargets?.().then((result) => {
      if (!isMounted) {
        return;
      }

      const nextTargets = adaptTargets({
        detectedTargets: result?.detectedTargets ?? [],
        registeredTargets: result?.registeredTargets ?? []
      });

      setTargets(nextTargets);
      setSelectedTargetId((currentTargetId) => currentTargetId ?? nextTargets[0]?.id ?? null);
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
    selectedTarget,
    selectedTargetId,
    sort,
    targets,
    visibleTargets,
    refreshTargets: loadTargets,
    setQuery,
    setSelectedTargetId,
    setSort
  };
};

export type TargetsPageState = ReturnType<typeof useTargetsPageState>;
