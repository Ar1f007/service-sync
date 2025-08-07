"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type AssignServiceFormData,
	assignServiceSchema,
} from "@/lib/schema/assign-service";

export default function AssignServiceForm({
	services,
}: {
	services: { id: string; title: string }[];
}) {
	const [employees, setEmployees] = useState<
		{ id: string; user: { name: string | null; email: string } }[]
	>([]);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const router = useRouter();

	const form = useForm({
		resolver: zodResolver(assignServiceSchema),
		defaultValues: {
			employeeId: "",
			serviceIds: [],
		},
	});

	useEffect(() => {
		// Fetch employees
		fetch("/api/employees")
			.then((res) => res.json())
			.then((data) => setEmployees(data.employees));
	}, []);

	const onSubmit = async (data: AssignServiceFormData) => {
		setError("");
		setSuccess("");

		const response = await fetch("/api/employees/assign", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		const result = await response.json();
		if (response.ok) {
			setSuccess("Services assigned successfully!");
			setTimeout(() => router.push("/admin/employees"), 2000);
		} else {
			setError(result.error || "Failed to assign services");
		}
	};

	return (
		<DialogContent>
			<DialogHeader>
				<DialogTitle>Assign Services to Employee</DialogTitle>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="employeeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Employee</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select an employee" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{employees.map((employee) => (
											<SelectItem key={employee.id} value={employee.id}>
												{employee.user.name
													? `${employee.user.name} (${employee.user.email})`
													: employee.user.email}
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
										<div
											key={service.id}
											className="flex items-center space-x-2"
										>
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
											<label htmlFor={service.id} className="capitalize">
												{service.title}
											</label>
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
						Assign Services
					</Button>
				</form>
			</Form>
		</DialogContent>
	);
}
