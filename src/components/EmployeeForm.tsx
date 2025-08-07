"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { z } from "zod";

export const employeeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service must be selected"),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;


export default function EmployeeForm({ services }: { services: { id: string; title: string }[] }) {
  const [users, setUsers] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      userId: "",
      serviceIds: [],
    },
  });

  useEffect(() => {
    fetch("/api/users?excludeEmployees=true")
      .then((res) => res.json())
      .then((data) => setUsers(data.users));
  }, []);

  const onSubmit = async (data: EmployeeFormData) => {
    setError("");
    setSuccess("");

    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (response.ok) {
      setSuccess("Employee added successfully!");
      setTimeout(() => router.push("/admin/employees"), 2000);
    } else {
      setError(result.error || "Failed to add employee");
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add New Employee</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name ? `${user.name} (${user.email})` : user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign Services</FormLabel>
                <div className="space-y-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={service.id}
                        checked={field.value.includes(service.id)}
                        onCheckedChange={(checked) => {
                          const newValue = checked
                            ? [...field.value, service.id]
                            : field.value.filter((id) => id !== service.id);
                          field.onChange(newValue);
                        }}
                      />
                      <label htmlFor={service.id} className="capitalize">{service.title}</label>
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          <Button type="submit" className="w-full">
            Add Employee
          </Button>
        </form>
      </Form>
    </DialogContent>
  );
}