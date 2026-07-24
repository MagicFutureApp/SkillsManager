import { useEffect, useState } from "react";
import { getBrowserPlatform, type ReleasePlatform } from "../lib/release-manifest";

export const useDownloadPlatform = () => {
  const [downloadPlatform, setDownloadPlatform] = useState<ReleasePlatform>("windows");

  useEffect(() => {
    setDownloadPlatform(getBrowserPlatform());
  }, []);

  return [downloadPlatform, setDownloadPlatform] as const;
};
