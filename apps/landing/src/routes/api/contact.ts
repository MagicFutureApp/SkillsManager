import { createFileRoute } from "@tanstack/react-router";

import { asString, isValidEmail } from "@/lib/utils";
import { EmailSendError, sendEmail } from "@/lib/server/email";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}

const TO_EMAIL = "contact@magicfuture.app";
const MAX_MESSAGE_LENGTH = 5000;

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

        try {
          await sendEmail({
            to: TO_EMAIL,
            replyTo: email,
            subject: `Skills Manager 联系：${name}`,
            text: `${message}\n\n——\n来自：${name} <${email}>`
          });

          return Response.json(
            { ok: true },
            { headers: { "Cache-Control": "no-store" } }
          );
        } catch (error) {
          if (error instanceof EmailSendError) {
            return Response.json(
              { error: error.message },
              { status: error.status, headers: { "Cache-Control": "no-store" } }
            );
          }
          console.error("Failed to send contact email", error);
          return Response.json(
            { error: "发送失败，请稍后重试" },
            { status: 502, headers: { "Cache-Control": "no-store" } }
          );
        }
      }
    }
  }
});
