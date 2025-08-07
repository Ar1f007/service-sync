import EmployeeForm from "@/components/EmployeeForm";
import { PrismaClient } from "@/generated/prisma";
import { getSession } from "@/lib/session";

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 403 });
  }

const prisma = new PrismaClient();
  const services = await prisma.service.findMany({
    select: { id: true, title: true },
  });

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add New Employee</h1>
      <EmployeeForm services={services} />
    </div>
  );
}