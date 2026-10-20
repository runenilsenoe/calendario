import { toJpeg, toPng } from "html-to-image";

const IOS =
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

// iOS/Safari canvases are capped (~16.7M px). Keep the render inside a safe budget.
const MAX_PIXELS = IOS ? 12_000_000 : 40_000_000;

function safeRatio(node: HTMLElement, wanted: number) {
  const w = node.offsetWidth || 1;
  const h = node.offsetHeight || 1;
  const max = Math.sqrt(MAX_PIXELS / (w * h));
  return Math.max(1, Math.min(wanted, max));
}

async function renderBlob(node: HTMLElement, pixelRatio: number) {
  // JPEG has no alpha channel, so the poster background must be painted in.
  const bg = getComputedStyle(node).backgroundColor || "#14120f";
  // First pass warms up webfont/image loading inside the clone.
  await toPng(node, { pixelRatio: 1, cacheBust: true });
  const dataUrl = await toJpeg(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: bg,
    quality: 0.95,
  });
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (!blob) throw new Error("Kunne ikke lage bildet");
  return blob;
}

export type ExportResult = "shared" | "downloaded" | "manual" | "cancelled";

function showManualSaveOverlay(url: string, name: string) {
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:rgba(10,9,7,0.94);display:flex;flex-direction:column;gap:12px;padding:16px;overflow:auto;";

  const hint = document.createElement("p");
  hint.textContent = "Hold inne bildet og velg «Lagre bilde» for å legge det i kamerarullen.";
  hint.style.cssText =
    "color:#f5f1e8;font:500 15px/1.4 system-ui,sans-serif;margin:0;text-align:center;";

  const img = document.createElement("img");
  img.src = url;
  img.alt = name;
  img.style.cssText =
    "max-width:100%;height:auto;border-radius:12px;align-self:center;-webkit-touch-callout:default;";

  const close = document.createElement("button");
  close.textContent = "Lukk";
  close.style.cssText =
    "align-self:center;padding:10px 20px;border-radius:999px;border:1px solid #f5f1e8;background:transparent;color:#f5f1e8;font:500 15px system-ui,sans-serif;";
  close.onclick = () => overlay.remove();

  overlay.append(hint, img, close);
  document.body.appendChild(overlay);
}

export async function exportNodeToImage(
  node: HTMLElement,
  filename: string,
  pixelRatio = 2,
): Promise<ExportResult> {
  const name = filename.endsWith(".jpg") ? filename : `${filename}.jpg`;
  const blob = await renderBlob(node, safeRatio(node, pixelRatio));
  const url = URL.createObjectURL(blob);

  // Prefer a direct download everywhere the browser supports it.
  const supportsDownload = "download" in document.createElement("a");
  if (supportsDownload && !IOS) {
    const link = document.createElement("a");
    link.download = name;
    link.href = url;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return "downloaded";
  }

  // iOS Safari ignores <a download>; use the share sheet, then manual save.
  const file = new File([blob], name, { type: "image/jpeg" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      URL.revokeObjectURL(url);
      return "shared";
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        URL.revokeObjectURL(url);
        return "cancelled";
      }
    }
  }

  showManualSaveOverlay(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 300_000);
  return "manual";
}

/** Renders a node into a paginated A4 portrait PDF. */
export async function exportNodeToPdf(node: HTMLElement, filename: string): Promise<ExportResult> {
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const { jsPDF } = await import("jspdf");
  const bg = getComputedStyle(node).backgroundColor || "#14120f";
  await toPng(node, { pixelRatio: 1, cacheBust: true });
  const dataUrl = await toJpeg(node, {
    pixelRatio: safeRatio(node, 2),
    cacheBust: true,
    backgroundColor: bg,
    quality: 0.95,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (node.offsetHeight / node.offsetWidth) * pageW;

  let remaining = imgH;
  let offset = 0;
  while (remaining > 0.5) {
    pdf.addImage(dataUrl, "JPEG", 0, -offset, pageW, imgH, undefined, "FAST");
    remaining -= pageH;
    offset += pageH;
    if (remaining > 0.5) pdf.addPage();
  }

  pdf.save(name);
  return "downloaded";
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "program"
  );
}
