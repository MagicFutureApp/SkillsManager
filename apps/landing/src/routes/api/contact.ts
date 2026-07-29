import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const TO_EMAIL = "contact@magicfuture.app";
const MAX_MESSAGE_LENGTH = 5000;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: ContactPayload;
        try {
          payload = (await request.json()) as ContactPayload;
        } catch {
          return Response.json(
            { error: "请求格式不正确" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        const name = asString(payload.name);
        const email = asString(payload.email);
        const message = asString(payload.message);

        if (!name || !email || !message) {
          return Response.json(
            { error: "请填写姓名、邮箱和留言" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
        if (!isValidEmail(email)) {
          return Response.json(
            { error: "邮箱格式不正确" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
          return Response.json(
            { error: "留言内容过长" },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }

        const apiKey = env.RESEND_API_KEY;
        if (!apiKey) {
          console.error("RESEND_API_KEY is not configured");
          return Response.json(
            { error: "邮件服务未配置" },
            { status: 500, headers: { "Cache-Control": "no-store" } }
          );
        }

        const from = env.RESEND_FROM || "Skills Manager <noreply@magicfuture.app>";

        try {
          const res = await fetch(RESEND_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from,
              to: [TO_EMAIL],
              reply_to: [email],
              subject: `Skills Manager 联系：${name}`,
              text: `${message}\n\n——\n来自：${name} <${email}>`
            })
          });

          if (!res.ok) {
            const detail = await res.text();
            console.error("Resend responded with", res.status, detail);
            return Response.json(
              { error: "发送失败，请稍后重试" },
              { status: 502, headers: { "Cache-Control": "no-store" } }
            );
          }

          return Response.json(
            { ok: true },
            { headers: { "Cache-Control": "no-store" } }
          );
        } catch (error) {
          console.error("Failed to call Resend", error);
          return Response.json(
            { error: "发送失败，请稍后重试" },
            { status: 502, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
    }
  }
});
