/**
 * Prescription PDF rendered server-side via `@react-pdf/renderer`.
 * See BillPdf.tsx for the rationale on moving off html2pdf.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export type PrescriptionMedicine = {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
  instructions?: string;
};

export type PrescriptionPdfData = {
  id: string;
  createdAt: string;
  medicines: PrescriptionMedicine[];
  notes: string | null;
  clinic: {
    name: string;
    address: string | null;
    phone: string | null;
  };
  patient: {
    name: string;
    mrn: string;
    age: number | null;
    gender: string;
    allergies: string[];
  };
  doctor: {
    name: string;
    specialization: string;
    qualification: string;
    roomNumber: string | null;
  };
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
    borderBottomWidth: 2,
    borderBottomColor: "#0f6e56",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: { fontSize: 18, fontWeight: "bold", color: "#065f46" },
  subtle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  doctorBlock: { alignItems: "flex-end" },
  doctorName: { fontSize: 11, fontWeight: "bold" },
  patientBox: {
    backgroundColor: "#ecfdf5",
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  patientField: { width: "50%", marginBottom: 4 },
  fieldLabel: { fontSize: 8, color: "#6b7280", marginBottom: 1 },
  fieldValue: { fontSize: 10, fontWeight: "bold" },
  allergyBox: {
    marginTop: 4,
    padding: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  allergyLabel: { fontSize: 9, fontWeight: "bold", color: "#b91c1c" },
  allergyText: { fontSize: 10, color: "#b91c1c" },
  rxRow: { flexDirection: "row", marginTop: 16 },
  rxSymbol: {
    fontSize: 44,
    color: "#065f46",
    marginRight: 12,
    fontFamily: "Times-Roman",
  },
  rxList: { flex: 1 },
  medItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  medIdx: { fontSize: 9, color: "#065f46", fontWeight: "bold" },
  medName: { fontSize: 12, fontWeight: "bold", marginTop: 1 },
  medSchedule: { fontSize: 10, color: "#374151", marginTop: 1 },
  medInstruction: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#6b7280",
    marginTop: 1,
  },
  notesBlock: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  notesLabel: { fontSize: 9, fontWeight: "bold", color: "#4b5563" },
  notesBody: { fontSize: 10, marginTop: 2 },
  signature: {
    position: "absolute",
    bottom: 40,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 9,
    color: "#6b7280",
  },
  sigLine: {
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    marginBottom: 2,
    paddingBottom: 12,
  },
});

export function PrescriptionPdf({ data }: { data: PrescriptionPdfData }) {
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
          <View style={styles.doctorBlock}>
            <Text style={styles.doctorName}>Dr. {data.doctor.name}</Text>
            <Text style={styles.subtle}>{data.doctor.specialization}</Text>
            <Text style={styles.subtle}>{data.doctor.qualification}</Text>
            {data.doctor.roomNumber && (
              <Text style={styles.subtle}>Room {data.doctor.roomNumber}</Text>
            )}
          </View>
        </View>

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
            <Text style={styles.fieldLabel}>Age / Sex</Text>
            <Text style={styles.fieldValue}>
              {data.patient.age !== null ? `${data.patient.age} yrs` : "—"}
              {" · "}
              {data.patient.gender}
            </Text>
          </View>
          <View style={styles.patientField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Text style={styles.fieldValue}>
              {d.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {data.patient.allergies.length > 0 && (
          <View style={styles.allergyBox}>
            <Text style={styles.allergyLabel}>Allergies</Text>
            <Text style={styles.allergyText}>
              {data.patient.allergies.join(", ")}
            </Text>
          </View>
        )}

        <View style={styles.rxRow}>
          <Text style={styles.rxSymbol}>Rx</Text>
          <View style={styles.rxList}>
            {data.medicines.length === 0 ? (
              <Text style={{ fontStyle: "italic", color: "#6b7280" }}>
                No medicines on this prescription.
              </Text>
            ) : (
              data.medicines.map((m, i) => {
                const schedule = [m.dosage, m.frequency, m.duration, m.route]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <View key={i} style={styles.medItem}>
                    <Text style={styles.medIdx}>{i + 1}.</Text>
                    <Text style={styles.medName}>{m.name}</Text>
                    {schedule ? (
                      <Text style={styles.medSchedule}>{schedule}</Text>
                    ) : null}
                    {m.instructions ? (
                      <Text style={styles.medInstruction}>
                        {m.instructions}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}

            {data.notes && (
              <View style={styles.notesBlock}>
                <Text style={styles.notesLabel}>Notes / Advice</Text>
                <Text style={styles.notesBody}>{data.notes}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.signature}>
          <Text>Rx ID: {data.id}</Text>
          <View>
            <View style={styles.sigLine} />
            <Text style={{ fontWeight: "bold" }}>Dr. {data.doctor.name}</Text>
            <Text>{data.doctor.qualification}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
