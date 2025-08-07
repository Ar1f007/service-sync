import { PrismaClient } from "@/generated/prisma";
import BookClient from "./_components/BookClient";
import { Suspense } from "react";

interface Service {
  id: string;
  title: string;
  description: string | null;
  features: string[];
  duration: number;
  price: number;
}

async function fetchServices(): Promise<Service[]> {
  const prisma = new PrismaClient();
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        features: true,
        duration: true,
        price: true,
      },
    });
    return services;
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

export default async function BookPage() {
  const services = await fetchServices();
  return <Suspense><BookClient services={services} /></Suspense>;
}