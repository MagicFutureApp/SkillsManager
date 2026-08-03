import { Buffer } from "node:buffer";

const encode = (value: object): string => Buffer.from(JSON.stringify(value)).toString("base64url");

export const createUnsignedJwt = (expiresAt: number): string =>
  `${encode({ alg: "none", typ: "JWT" })}.${encode({ exp: expiresAt })}.signature`;
