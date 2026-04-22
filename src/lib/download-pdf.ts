"use client";

/**
 * Client-side PDF download from an existing DOM node.
 * Uses html2pdf.js (html2canvas + jsPDF under the hood). Lazy-loaded so
 * the bundle doesn't ship PDF tooling for users who never download.
 */
export async function downloadPdf(
  node: HTMLElement,
  filename: string,
): Promise<void> {
  const mod = await import("html2pdf.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2pdf = ((mod as unknown as { default?: unknown }).default ?? mod) as any;

  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "-");

  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `${safeName}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(node)
    .save();
}
