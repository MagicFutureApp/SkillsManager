import crypto from "node:crypto";

const secret = "demo-secret-change-me";

function base64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload, alg = "HS256") {
  const header = { alg, typ: "JWT" };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

const now = Math.floor(Date.now() / 1000);

const token1 = sign({
  sub: "1234567890",
  name: "Alice",
  role: "user",
  iat: now,
  exp: now + 3600, // 1 hour
});

const token2 = sign({
  sub: "9876543210",
  name: "Bob",
  role: "admin",
  iat: now,
  exp: now + 86400, // 24 hours
});

console.log("TOKEN_1:");
console.log(token1);
console.log();
console.log("TOKEN_2:");
console.log(token2);
