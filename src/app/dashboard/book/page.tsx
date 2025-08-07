"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


import { z } from "zod";

const bookingSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  employeeId: z.string().min(1, "Employee is required"),
  dateTime: z.string().min(1, "Date and time are required").refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Invalid date and time" }
  ),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export default function BookAppointment() {
  const [services, setServices] = useState<{ id: string; title: string; duration: number }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; user: { name: string } }[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: "",
      employeeId: "",
      dateTime: "",
    },
  });

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services));
  }, []);

  const serviceId = form.watch("serviceId");

  useEffect(() => {
    if (serviceId) {
      fetch(`/api/employees?serviceId=${serviceId}`)
        .then((res) => res.json())
        .then((data) => setEmployees(data.employees));
    }
  }, [serviceId]);

  const onSubmit = async (data: BookingFormData) => {
    setError("");
    setSuccess("");

    const { data: session } = await authClient.getSession();
    if (!session) {
      router.push("/sign-in");
      return;
    }

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        dateTime: new Date(data.dateTime).toISOString(),
      }),
    });

    const result = await response.json();
    if (response.ok) {
      setSuccess("Appointment booked successfully!");
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setError(result.error || "Failed to book appointment");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Book Appointment</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
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
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch("serviceId")}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.user.name}
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
            name="dateTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}
          <Button type="submit" className="w-full">
            Book Appointment
          </Button>
        </form>
      </Form>
    </div>
  );
}