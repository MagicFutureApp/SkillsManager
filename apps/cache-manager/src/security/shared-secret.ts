const encoder = new TextEncoder();

export const matchesBearerToken = (
  authorization: string | undefined,
  expected: string
): boolean => {
  if (!authorization?.startsWith("Bearer ") || expected.length === 0) {
    return false;
  }

  const actualBytes = encoder.encode(authorization.slice("Bearer ".length));
  const expectedBytes = encoder.encode(expected);
  if (actualBytes.length !== expectedBytes.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < actualBytes.length; index += 1) {
    difference |= actualBytes[index] ^ expectedBytes[index];
  }

  return difference === 0;
};
