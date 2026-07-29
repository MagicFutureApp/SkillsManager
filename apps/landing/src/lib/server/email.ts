import { env } from "cloudflare:workers";

/**
 * 从任意 Worker 路由复用：经 Resend 发送邮件。
 *
 * 仅可在 CloudFlare Workers 运行时使用（依赖 `cloudflare:workers` 的 env 绑定）。
 * 失败时会抛出 `EmailSendError`，调用方据此映射 HTTP 状态码。
 */

const RESEND_API_URL = "https://api.resend.com/emails";

const DEFAULT_FROM = "Skills Manager <noreply@magicfuture.app>";

export interface SendEmailOptions {
  /** 收件人，支持单个或多个 */
  to: string | string[];
  subject: string;
  /** 纯文本正文 */
  text: string;
  /** 可选 HTML 正文（与 text 二选一或并存） */
  html?: string;
  /** 可选回复地址，便于收件人直接回复给发信人 */
  replyTo?: string | string[];
  /** 可选自定义发件人，缺省回退到 RESEND_FROM 绑定或 DEFAULT_FROM */
  from?: string;
}

/** 邮件发送失败，携带建议映射的 HTTP 状态码。 */
export class EmailSendError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

/**
 * 调用 Resend REST API 发送邮件。
 * 取 env.RESEND_API_KEY 作为凭证；未配置时抛 500，Resend 返回非 2xx 或网络异常时抛 502。
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<{ id: string }> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured");
    throw new EmailSendError(500, "邮件服务未配置");
  }

  const from = options.from ?? env.RESEND_FROM ?? DEFAULT_FROM;

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        ...(options.replyTo
          ? {
              reply_to: Array.isArray(options.replyTo)
                ? options.replyTo
                : [options.replyTo]
            }
          : {}),
        subject: options.subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {})
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend responded with", res.status, detail);
      throw new EmailSendError(502, "发送失败，请稍后重试");
    }

    const data = (await res.json()) as { id: string };
    return { id: data.id };
  } catch (error) {
    if (error instanceof EmailSendError) {
      throw error;
    }
    console.error("Failed to call Resend", error);
    throw new EmailSendError(502, "发送失败，请稍后重试");
  }
}
