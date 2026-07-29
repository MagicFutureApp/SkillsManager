import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    RESEND_API_KEY: "re_test",
    RESEND_FROM: "Skills Manager <noreply@magicfuture.app>"
  }
}));

vi.mock("cloudflare:workers", () => ({ env: mockEnv }));

import { EmailSendError, sendEmail } from "./email";

describe("sendEmail", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls Resend with bearer auth and normalized arrays", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "msg_1" }), { status: 200 })
    );

    const result = await sendEmail({
      to: "contact@magicfuture.app",
      replyTo: "user@example.com",
      subject: "Hi",
      text: "Hello"
    });

    expect(result.id).toBe("msg_1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["contact@magicfuture.app"]);
    expect(body.reply_to).toEqual(["user@example.com"]);
    expect(body.from).toBe("Skills Manager <noreply@magicfuture.app>");
  });

  it("throws EmailSendError(500) when RESEND_API_KEY is missing", async () => {
    const prev = mockEnv.RESEND_API_KEY;
    mockEnv.RESEND_API_KEY = "";
    await expect(
      sendEmail({ to: "a@b.com", subject: "s", text: "t" })
    ).rejects.toMatchObject({ status: 500 });
    mockEnv.RESEND_API_KEY = prev;
  });

  it("throws EmailSendError(502) when Resend returns non-2xx", async () => {
    fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await expect(
      sendEmail({ to: "a@b.com", subject: "s", text: "t" })
    ).rejects.toBeInstanceOf(EmailSendError);
  });

  it("falls back to DEFAULT_FROM when env.RESEND_FROM is absent", async () => {
    const prevFrom = mockEnv.RESEND_FROM;
    mockEnv.RESEND_FROM = undefined as unknown as string;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 200 })
    );
    await sendEmail({ to: "a@b.com", subject: "s", text: "t" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.from).toBe("Skills Manager <noreply@magicfuture.app>");
    mockEnv.RESEND_FROM = prevFrom;
  });

  it("omits reply_to when not provided", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 200 })
    );
    await sendEmail({ to: "a@b.com", subject: "s", text: "t" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.reply_to).toBeUndefined();
  });
});
