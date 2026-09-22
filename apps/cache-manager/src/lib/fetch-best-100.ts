export type FetchResult =
  | { ok: true; csv: string; rowCount: number }
  | { ok: false; error: string };

const countDataRows = (csv: string): number => {
  const nonEmptyLines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0).length;

  // Subtract the header row; never return a negative count.
  return Math.max(0, nonEmptyLines - 1);
};

export const fetchBest100Csv = async (
  sourceUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<FetchResult> => {
  try {
    const response = await fetchFn(sourceUrl, {
      headers: { "user-agent": "skills-manager-cache/1.0" },
      redirect: "follow"
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const csv = await response.text();

    if (!csv.trim()) {
      return { ok: false, error: "empty response body" };
    }

    return { ok: true, csv, rowCount: countDataRows(csv) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};
