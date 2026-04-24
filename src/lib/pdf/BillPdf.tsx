/**
 * Bill PDF rendered server-side via `@react-pdf/renderer`.
 *
 * Replaces the old client-side `html2pdf` + `html2canvas` stack (which
 * shipped a ~200kb dep and struggled with web fonts / RTL content). The
 * server-side path is deterministic and cacheable.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type BillPdfItem = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type BillPdfData = {
  billNumber: string;
  billType: string;
  status: string;
  createdAt: string;
  items: BillPdfItem[];
  subtotal: number;
  discount: number;
  discountReason: string | null;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  paymentMethod: string | null;
  notes: string | null;
  clinic: {
    name: string;
    phone: string | null;
    address: string | null;
  };
  patient: {
    name: string;
    mrn: string;
    phone: string;
  } | null;
  collectorName: string;
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#0f6e56",
    paddingBottom: 10,
    marginBottom: 12,
  },
  brand: { fontSize: 16, fontWeight: "bold", color: "#0f6e56" },
  subtle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  billMeta: { fontSize: 9, color: "#6b7280", textAlign: "right" },
  billNumber: { fontSize: 12, fontWeight: "bold", textAlign: "right" },
  patientBox: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  patientField: { flex: 1 },
  fieldLabel: { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  fieldValue: { fontSize: 10, fontWeight: "bold" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 4,
    marginBottom: 4,
    fontSize: 9,
    fontWeight: "bold",
    color: "#4b5563",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colDescription: { flex: 3 },
  colQty: { flex: 0.6, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1.2, textAlign: "right" },
  totalsBox: {
    marginTop: 12,
    alignSelf: "flex-end",
    width: "45%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  totalsStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    fontSize: 12,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
});

function fmt(n: number): string {
  return "Rs " + Math.round(n).toLocaleString();
}

export function BillPdf({ data }: { data: BillPdfData }) {
  const d = new Date(data.createdAt);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{data.clinic.name}</Text>
            {data.clinic.address && (
              <Text style={styles.subtle}>{data.clinic.address}</Text>
            )}
            {data.clinic.phone && (
              <Text style={styles.subtle}>Tel: {data.clinic.phone}</Text>
            )}
          </View>
          <View>
            <Text style={styles.billNumber}>{data.billNumber}</Text>
            <Text style={styles.billMeta}>{data.billType} bill</Text>
            <Text style={styles.billMeta}>
              {d.toLocaleString()}
            </Text>
            <Text style={styles.billMeta}>Status: {data.status}</Text>
          </View>
        </View>

        {data.patient && (
          <View style={styles.patientBox}>
            <View style={styles.patientField}>
              <Text style={styles.fieldLabel}>Patient</Text>
              <Text style={styles.fieldValue}>{data.patient.name}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.fieldLabel}>MRN</Text>
              <Text style={styles.fieldValue}>{data.patient.mrn}</Text>
            </View>
            <View style={styles.patientField}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <Text style={styles.fieldValue}>{data.patient.phone}</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {data.items.map((it, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDescription}>{it.description}</Text>
            <Text style={styles.colQty}>{it.qty}</Text>
            <Text style={styles.colPrice}>{fmt(it.unitPrice)}</Text>
            <Text style={styles.colAmount}>{fmt(it.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text>
                Discount{data.discountReason ? ` (${data.discountReason})` : ""}
              </Text>
              <Text>-{fmt(data.discount)}</Text>
            </View>
          )}
          <View style={styles.totalsStrong}>
            <Text>Total</Text>
            <Text>{fmt(data.totalAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Paid ({data.paymentMethod ?? "—"})</Text>
            <Text>{fmt(data.paidAmount)}</Text>
          </View>
          {data.balance > 0 && (
            <View style={styles.totalsRow}>
              <Text>Balance due</Text>
              <Text>{fmt(data.balance)}</Text>
            </View>
          )}
        </View>

        {data.notes && (
          <View style={{ marginTop: 14 }}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ fontSize: 9 }}>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Collected by {data.collectorName}. This is a computer-generated
          document; no signature required.
        </Text>
      </Page>
    </Document>
  );
}
