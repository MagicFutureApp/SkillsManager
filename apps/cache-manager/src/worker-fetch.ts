export const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);
