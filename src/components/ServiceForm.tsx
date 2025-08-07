"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const serviceSchema = z.object({
	title: z
		.string()
		.min(1, "Title is required")
		.max(100, "Title must be 100 characters or less"),
	description: z.string().optional(),
	features: z.string().optional(),
	duration: z
		.number()
		.min(1, "Duration must be at least 1 minute")
		.max(480, "Duration must be 8 hours or less"),
	price: z
		.number()
		.min(0, "Price cannot be negative")
		.max(10000, "Price must be reasonable"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export default function ServiceForm() {
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const router = useRouter();

	const form = useForm({
		resolver: zodResolver(serviceSchema),
		defaultValues: {
			title: "",
			description: "",
			features: "",
			duration: 0,
			price: 0,
		},
	});

	const onSubmit = async (data: ServiceFormData) => {
		setError("");
		setSuccess("");
 
		const response = await fetch("/api/services", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...data,
				features: data.features?.split(",").map((f) => f.trim()) || [],
			}),
		});

		const result = await response.json();
		if (response.ok) {
			setSuccess("Service created successfully!");
			setTimeout(() => router.push("/admin/services"), 2000);
		} else {
			setError(result.error || "Failed to create service");
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Title</FormLabel>
							<FormControl>
								<Input placeholder="Enter service title" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea placeholder="Enter service description" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="features"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Features (comma-separated)</FormLabel>
							<FormControl>
								<Input
									placeholder="e.g., Shampoo, Blow Dry"
									{...field}
									onChange={(e) => field.onChange(e.target.value)} // Handle string input
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="duration"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Duration (minutes)</FormLabel>
							<FormControl>
								<Input
									type="number"
									placeholder="Enter duration in minutes"
									{...field}
									onChange={(e) =>
										field.onChange(parseInt(e.target.value) || 0)
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="price"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Price</FormLabel>
							<FormControl>
								<Input
									type="number"
									step="0.01"
									placeholder="Enter price"
									{...field}
									onChange={(e) =>
										field.onChange(parseFloat(e.target.value) || 0)
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{error && <p className="text-red-500">{error}</p>}
				{success && <p className="text-green-500">{success}</p>}
				<Button type="submit" className="w-full">
					Create Service
				</Button>
			</form>
		</Form>
	);
}
