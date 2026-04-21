import { prisma } from "./prisma";

const TENANT_MODELS = new Set([
  "patient",
  "doctor",
  "token",
  "appointment",
  "consultation",
  "vitalSigns",
  "prescription",
  "medicine",
  "pharmacyOrder",
  "supplier",
  "purchaseOrder",
  "stockMovement",
  "bed",
  "ipdAdmission",
  "nursingNote",
  "labOrder",
  "bill",
  "cashShift",
  "auditLog",
  "notification",
]);

const READ_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const WRITE_OPS_WITH_WHERE = new Set([
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

const CREATE_OPS = new Set(["create", "createMany", "createManyAndReturn"]);

export function db(clinicId: string) {
  if (!clinicId) {
    throw new Error("tenant-db: clinicId is required");
  }

  return prisma.$extends({
    name: "tenant-scoping",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (!TENANT_MODELS.has(modelKey)) {
            return query(args);
          }

          const a = (args ?? {}) as Record<string, unknown>;

          if (READ_OPS.has(operation) || WRITE_OPS_WITH_WHERE.has(operation)) {
            const prevWhere = (a.where as Record<string, unknown>) ?? {};
            a.where = { ...prevWhere, clinicId };
          }

          if (CREATE_OPS.has(operation)) {
            const data = a.data;
            if (Array.isArray(data)) {
              a.data = data.map((row) => ({ ...row, clinicId }));
            } else if (data && typeof data === "object") {
              a.data = { ...(data as Record<string, unknown>), clinicId };
            }
          }

          if (operation === "upsert") {
            const create = (a.create as Record<string, unknown>) ?? {};
            a.create = { ...create, clinicId };
          }

          return query(a);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof db>;
