export const createUnsignedJwt = (expiresAt: number): string => {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: expiresAt })}.signature`;
};
