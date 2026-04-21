export type LabTest = {
  code: string;
  name: string;
  price: number;
  sampleType: string;
  parameters: Array<{
    name: string;
    unit: string;
    normalMin?: number;
    normalMax?: number;
    normalRange?: string;
  }>;
};

// Minimal seed catalog — extend from Settings later.
export const LAB_CATALOG: LabTest[] = [
  {
    code: "CBC",
    name: "Complete Blood Count",
    price: 500,
    sampleType: "EDTA Blood",
    parameters: [
      { name: "Hemoglobin", unit: "g/dL", normalMin: 12, normalMax: 17 },
      { name: "WBC", unit: "×10³/µL", normalMin: 4, normalMax: 11 },
      { name: "Platelets", unit: "×10³/µL", normalMin: 150, normalMax: 450 },
      { name: "RBC", unit: "×10⁶/µL", normalMin: 4.2, normalMax: 5.9 },
    ],
  },
  {
    code: "LFT",
    name: "Liver Function Tests",
    price: 1200,
    sampleType: "Serum",
    parameters: [
      { name: "ALT", unit: "U/L", normalMin: 7, normalMax: 56 },
      { name: "AST", unit: "U/L", normalMin: 10, normalMax: 40 },
      { name: "Bilirubin total", unit: "mg/dL", normalMin: 0.1, normalMax: 1.2 },
      { name: "Albumin", unit: "g/dL", normalMin: 3.5, normalMax: 5 },
    ],
  },
  {
    code: "RFT",
    name: "Renal Function Tests",
    price: 1000,
    sampleType: "Serum",
    parameters: [
      { name: "Creatinine", unit: "mg/dL", normalMin: 0.7, normalMax: 1.3 },
      { name: "Urea", unit: "mg/dL", normalMin: 15, normalMax: 40 },
      { name: "Sodium", unit: "mEq/L", normalMin: 135, normalMax: 145 },
      { name: "Potassium", unit: "mEq/L", normalMin: 3.5, normalMax: 5 },
    ],
  },
  {
    code: "FBS",
    name: "Fasting Blood Sugar",
    price: 250,
    sampleType: "Serum",
    parameters: [
      { name: "Fasting glucose", unit: "mg/dL", normalMin: 70, normalMax: 100 },
    ],
  },
  {
    code: "LIPID",
    name: "Lipid Profile",
    price: 1500,
    sampleType: "Serum",
    parameters: [
      { name: "Cholesterol total", unit: "mg/dL", normalMin: 0, normalMax: 200 },
      { name: "HDL", unit: "mg/dL", normalMin: 40, normalMax: 200 },
      { name: "LDL", unit: "mg/dL", normalMin: 0, normalMax: 130 },
      { name: "Triglycerides", unit: "mg/dL", normalMin: 0, normalMax: 150 },
    ],
  },
  {
    code: "URINE",
    name: "Urine Routine Examination",
    price: 400,
    sampleType: "Urine",
    parameters: [
      { name: "Protein", unit: "—", normalRange: "Negative" },
      { name: "Glucose", unit: "—", normalRange: "Negative" },
      { name: "Ketones", unit: "—", normalRange: "Negative" },
      { name: "Pus cells", unit: "/HPF", normalMin: 0, normalMax: 5 },
    ],
  },
  {
    code: "UPT",
    name: "Urine Pregnancy Test",
    price: 300,
    sampleType: "Urine",
    parameters: [{ name: "β-hCG qualitative", unit: "—", normalRange: "Negative" }],
  },
];

export function findLabTest(code: string): LabTest | undefined {
  return LAB_CATALOG.find((t) => t.code === code);
}
