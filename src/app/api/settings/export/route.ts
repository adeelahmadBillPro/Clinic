import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/tenant-db";
import { isAdmin } from "@/lib/permissions";

function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = r[h];
          if (v === null || v === undefined) return "";
          const s =
            typeof v === "object" ? JSON.stringify(v) : String(v);
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 },
    );
  }
  if (!isAdmin(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Admins only" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "patients";
  const t = db(session.user.clinicId);

  let rows: Array<Record<string, unknown>> = [];
  let filename = `${kind}.csv`;

  switch (kind) {
    case "patients": {
      const ps = await t.patient.findMany({ orderBy: { createdAt: "desc" } });
      rows = ps.map((p) => ({
        mrn: p.mrn,
        name: p.name,
        phone: p.phone,
        gender: p.gender,
        dob: p.dob?.toISOString().slice(0, 10) ?? "",
        bloodGroup: p.bloodGroup ?? "",
        allergies: p.allergies.join("; "),
        chronicConditions: p.chronicConditions.join("; "),
        createdAt: p.createdAt.toISOString(),
      }));
      break;
    }
    case "bills": {
      const bs = await t.bill.findMany({ orderBy: { createdAt: "desc" } });
      rows = bs.map((b) => ({
        billNumber: b.billNumber,
        billType: b.billType,
        status: b.status,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        totalAmount: Number(b.totalAmount),
        paidAmount: Number(b.paidAmount),
        balance: Number(b.balance),
        paymentMethod: b.paymentMethod ?? "",
        createdAt: b.createdAt.toISOString(),
      }));
      break;
    }
    case "tokens": {
      const ts = await t.token.findMany({ orderBy: { issuedAt: "desc" } });
      rows = ts.map((tk) => ({
        displayToken: tk.displayToken,
        status: tk.status,
        type: tk.type,
        patientId: tk.patientId,
        doctorId: tk.doctorId,
        chiefComplaint: tk.chiefComplaint ?? "",
        issuedAt: tk.issuedAt.toISOString(),
        completedAt: tk.completedAt?.toISOString() ?? "",
      }));
      break;
    }
    case "consultations": {
      const cs = await t.consultation.findMany({
        orderBy: { createdAt: "desc" },
      });
      rows = cs.map((c) => ({
        patientId: c.patientId,
        doctorId: c.doctorId,
        chiefComplaint: c.chiefComplaint,
        assessment: c.assessment ?? "",
        plan: c.plan ?? "",
        createdAt: c.createdAt.toISOString(),
      }));
      break;
    }
    case "medicines": {
      const ms = await t.medicine.findMany({ orderBy: { name: "asc" } });
      rows = ms.map((m) => ({
        name: m.name,
        genericName: m.genericName ?? "",
        category: m.category,
        unit: m.unit,
        stockQty: Number(m.stockQty),
        minStockLevel: Number(m.minStockLevel),
        purchasePrice: Number(m.purchasePrice),
        salePrice: Number(m.salePrice),
        batchNumber: m.batchNumber ?? "",
        expiryDate: m.expiryDate?.toISOString().slice(0, 10) ?? "",
      }));
      break;
    }
    case "audit": {
      const a = await t.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 5000,
      });
      rows = a.map((e) => ({
        when: e.createdAt.toISOString(),
        user: e.userName,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId ?? "",
        details: e.details ? JSON.stringify(e.details) : "",
      }));
      break;
    }
    default:
      return NextResponse.json(
        { success: false, error: "Unknown export kind" },
        { status: 400 },
      );
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
