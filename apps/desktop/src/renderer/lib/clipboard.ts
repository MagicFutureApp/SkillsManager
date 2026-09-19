/**
 * 将文本写入系统剪贴板，返回是否成功。
 *
 * 剪贴板 API 不可用时（例如非安全上下文、未授权或 Electron 渲染进程限制）
 * 或写入被拒绝时返回 false，由调用方决定如何提示，而不是抛出。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(text);

    return true;
  } catch {
    return false;
  }
}
