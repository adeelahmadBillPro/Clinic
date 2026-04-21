import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // PKR pricing — local market realistic
  const plans = [
    {
      name: "BASIC",
      monthlyPrice: 3000,
      yearlyPrice: 30000, // ~17% off
      oneTimePrice: 9000,
      maxDoctors: 1,
      maxPatients: 2000,
      features: {
        pharmacy: false,
        inventory: false,
        ipd: false,
        lab: false,
        whatsapp: false,
        analytics: "basic",
        branches: 1,
        auditDays: 0,
      },
    },
    {
      name: "STANDARD",
      monthlyPrice: 7500,
      yearlyPrice: 75000,
      oneTimePrice: 22500,
      maxDoctors: 5,
      maxPatients: 20000,
      features: {
        pharmacy: true,
        inventory: true,
        ipd: false,
        lab: true,
        whatsapp: true,
        analytics: "standard",
        branches: 1,
        auditDays: 30,
      },
    },
    {
      name: "PRO",
      monthlyPrice: 15000,
      yearlyPrice: 150000,
      oneTimePrice: 45000,
      maxDoctors: -1,
      maxPatients: -1,
      features: {
        pharmacy: true,
        inventory: true,
        ipd: true,
        lab: true,
        whatsapp: true,
        analytics: "full",
        branches: 5,
        auditDays: 365,
      },
    },
  ] as const;

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: {
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        oneTimePrice: p.oneTimePrice,
        maxDoctors: p.maxDoctors,
        maxPatients: p.maxPatients,
        features: p.features,
        isActive: true,
      },
      create: {
        name: p.name,
        monthlyPrice: p.monthlyPrice,
        yearlyPrice: p.yearlyPrice,
        oneTimePrice: p.oneTimePrice,
        maxDoctors: p.maxDoctors,
        maxPatients: p.maxPatients,
        features: p.features,
      },
    });
  }

  const count = await prisma.plan.count();
  console.log(`✅ Seeded ${count} plans in PKR.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
