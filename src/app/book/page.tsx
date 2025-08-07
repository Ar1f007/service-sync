import BookClient from "./_components/BookClient";
import { Suspense } from "react";
import prismaInstance from "@/lib/db";

interface Service {
  id: string;
  title: string;
  description: string | null;
  features: string[];
  duration: number;
  price: number;
}

async function fetchServices(): Promise<Service[]> {
  try {
    const services = await prismaInstance.service.findMany({
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
  }
}

export default async function BookPage() {
  const services = await fetchServices();
  return <Suspense><BookClient services={services} /></Suspense>;
}