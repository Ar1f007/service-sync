import ServiceForm from "@/components/ServiceForm";
import { getSession } from "@/lib/session";

export default async function NewServicePage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    return new Response("Unauthorized", { status: 403 });
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Service</h1>
      <ServiceForm />
    </div>
  );
}