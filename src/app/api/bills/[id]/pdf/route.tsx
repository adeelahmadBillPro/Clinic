import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { prisma } from "@/lib/prisma";
import { BillPdf, type BillPdfData } from "@/lib/pdf/BillPdf";

/**
 * GET /api/bills/[id]/pdf → streams an A4 bill PDF rendered by
 * @react-pdf/renderer. Replaces the client-side html2pdf flow so the
 * PDF is consistent regardless of device / font availability, and the
 * app bundle stays lean.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }

  const t = db(session.user.clinicId);
  const bill = await t.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json(
      { success: false, error: "Bill not found" },
      { status: 404 },
    );
  }

  const [clinic, patient, collector] = await Promise.all([
    prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, phone: true, address: true },
    }),
    t.patient.findUnique({
      where: { id: bill.patientId },
      select: { name: true, mrn: true, phone: true },
    }),
    prisma.user.findUnique({
      where: { id: bill.collectedBy },
      select: { name: true },
    }),
  ]);

  const data: BillPdfData = {
    billNumber: bill.billNumber,
    billType: bill.billType,
    status: bill.status,
    createdAt: bill.createdAt.toISOString(),
    items: Array.isArray(bill.items)
      ? (bill.items as BillPdfData["items"])
      : [],
    subtotal: Number(bill.subtotal),
    discount: Number(bill.discount),
    discountReason: bill.discountReason,
    totalAmount: Number(bill.totalAmount),
    paidAmount: Number(bill.paidAmount),
    balance: Number(bill.balance),
    paymentMethod: bill.paymentMethod,
    notes: bill.notes,
    clinic: {
      name: clinic?.name ?? "Clinic",
      phone: clinic?.phone ?? null,
      address: clinic?.address ?? null,
    },
    patient: patient
      ? { name: patient.name, mrn: patient.mrn, phone: patient.phone }
      : null,
    collectorName: collector?.name ?? "Staff",
  };

  // `renderToStream` returns a Node Readable — wrap in a Web ReadableStream
  // so Next can forward it to the browser. The PDF is built in-memory on
  // the server; for A4 single-page bills that's <50KB.
  const stream = await renderToStream(<BillPdf data={data} />);
  const webStream = nodeToWebStream(stream);

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.billNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

type NodeReadable = {
  on(event: "data", cb: (chunk: Buffer) => void): unknown;
  on(event: "end", cb: () => void): unknown;
  on(event: "error", cb: (err: Error) => void): unknown;
};

function nodeToWebStream(node: NodeReadable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      node.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      node.on("end", () => controller.close());
      node.on("error", (err: Error) => controller.error(err));
    },
  });
}
