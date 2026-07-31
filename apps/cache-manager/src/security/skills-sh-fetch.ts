import type { SkillsShTokenProvider } from "./skills-sh-token";
import type { WorkerBindings } from "../worker-env";

const requestWithToken = (url: string, token: string, fetchImpl: typeof fetch): Promise<Response> =>
  fetchImpl(url, {
    headers: { authorization: `Bearer ${token}` }
  });

export const fetchSkillsSh = async (
  url: string,
  bindings: WorkerBindings,
  tokenProvider: SkillsShTokenProvider,
  fetchImpl: typeof fetch
): Promise<Response> => {
  const firstToken = await tokenProvider.getToken(bindings);
  const firstResponse = await requestWithToken(url, firstToken, fetchImpl);
  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  try {
    await firstResponse.body?.cancel();
  } catch {
    // A rejected response body is not needed before the one allowed token refresh retry.
  }
  tokenProvider.invalidate(firstToken);
  const replacementToken = await tokenProvider.getToken(bindings);
  return requestWithToken(url, replacementToken, fetchImpl);
};
