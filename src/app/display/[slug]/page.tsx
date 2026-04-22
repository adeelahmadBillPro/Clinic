import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DisplayBoard } from "@/components/display/DisplayBoard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: clinic ? `${clinic.name} — Live queue` : "Live queue" };
}

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clinic = await prisma.clinic.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!clinic || !clinic.isActive) notFound();

  return <DisplayBoard slug={slug} />;
}
