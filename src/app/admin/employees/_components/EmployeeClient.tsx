"use client";

import {
	Briefcase,
	CalendarDays,
	Edit,
	Mail,
	PlusCircle,
	Settings,
	Trash2,
	UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";


interface Service {
	id: string;
	title: string;
}

interface User {
	id: string;
	name: string | null;
	email: string;
	role: string | null;
}


interface Employee {
	id: string;
	user: { name: string | null; email: string };
	serviceEmployees: { service: { id: string; title: string } }[];
	appointmentsToday: number;
}

interface EmployeesClientProps {
	initialEmployees: Employee[];
	availableUsers: User[];
	availableServices: Service[];
}

export default function EmployeesClient({
	initialEmployees,
	availableUsers,
	availableServices,
}: EmployeesClientProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();
	const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [selectedUser, setSelectedUser] = useState("");
	const [selectedEmployee, setSelectedEmployee] = useState("");
	const [selectedServices, setSelectedServices] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";

	useEffect(() => {
		if (isPending) return;
		if (!session || session.user.role !== "admin") {
			router.push("/sign-in");
		}
	}, [session, isPending, router]);

	const handleAddEmployee = async () => {
		try {
			if (!selectedUser) {
				setError("Please select a user.");
				return;
			}

			const response = await fetch(`/api/employees?timezone=${encodeURIComponent(timezone)}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: selectedUser, serviceIds: selectedServices, timezone }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to add employee");
			}

			const newEmployee = await response.json();
			setEmployees([...employees, newEmployee]);
			setIsAddDialogOpen(false);
			setSelectedUser("");
			setSelectedServices([]);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to add employee");
		}
	};

	const handleAssignServices = async () => {
		try {
			if (!selectedEmployee) {
				setError("Please select an employee.");
				return;
			}

			const response = await fetch(`/api/employees/${selectedEmployee}?timezone=${encodeURIComponent(timezone)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ serviceIds: selectedServices }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to assign services");
			}

			const updatedEmployee = await response.json();
			setEmployees(employees.map((e) => (e.id === selectedEmployee ? updatedEmployee : e)));
			setIsAssignDialogOpen(false);
			setSelectedEmployee("");
			setSelectedServices([]);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to assign services");
		}
	};

	const handleEditEmployee = (employee: Employee) => {
		setEditingEmployee(employee);
		setSelectedServices(employee.serviceEmployees.map((se) => se.service.id));
		setIsEditDialogOpen(true);
	};

	const handleUpdateEmployee = async () => {
		if (!editingEmployee) return;

		try {
			const response = await fetch(`/api/employees/${editingEmployee.id}?timezone=${encodeURIComponent(timezone)}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ serviceIds: selectedServices }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to update employee");
			}

			const updatedEmployee = await response.json();
			setEmployees(employees.map((e) => (e.id === editingEmployee.id ? updatedEmployee : e)));
			setIsEditDialogOpen(false);
			setEditingEmployee(null);
			setSelectedServices([]);
			setError(null);
		} catch (err: any) {
			setError(err.message || "Failed to update employee");
		}
	};

	const handleDeleteEmployee = async (employeeId: string) => {
		try {
			const response = await fetch(`/api/employees/${employeeId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to delete employee");
			}

			setEmployees(employees.filter((e) => e.id !== employeeId));
		} catch (err: any) {
			setError(err.message || "Failed to delete employee");
		}
	};

	const handleServiceToggle = (serviceId: string) => {
		setSelectedServices((prev) =>
			prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
		);
	};

	if (isPending) {
		return (
			<div className="min-h-screen bg-slate-50 flex items-center justify-center">
				<p className="text-slate-600">Loading...</p>
			</div>
		);
	}

	if (!session || session.user.role !== "admin") {
		return null; // Redirect handled by useEffect
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-3xl font-bold text-slate-900">Manage Employees</h1>
					<div className="flex gap-2 items-center">
						<Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
							<DialogTrigger asChild>
								<Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50 bg-transparent">
									<Settings className="w-4 h-4" />
									<span className="hidden md:inline-block ml-2">
										Assign Services
									</span>
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Assign Services to Employee</DialogTitle>
									<DialogDescription>Select an employee and the services they can perform.</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									{error && <p className="text-red-500 text-sm">{error}</p>}
									<div>
										<Label>Select Employee</Label>
										<Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
											<SelectTrigger>
												<SelectValue placeholder="Choose an employee" />
											</SelectTrigger>
											<SelectContent>
												{employees.map((employee) => (
													<SelectItem key={employee.id} value={employee.id}>
														{employee.user.name || "Unnamed"} ({employee.user.email})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div>
										<Label>Select Services</Label>
										<div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
											{availableServices.map((service) => (
												<div key={service.id} className="flex items-center space-x-2">
													<Checkbox
														id={`assign-${service.id}`}
														checked={selectedServices.includes(service.id)}
														onCheckedChange={() => handleServiceToggle(service.id)}
													/>
													<Label htmlFor={`assign-${service.id}`} className="text-sm">
														{service.title}
													</Label>
												</div>
											))}
										</div>
									</div>
									<div className="flex justify-end space-x-2 pt-4">
										<Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
											Cancel
										</Button>
										<Button onClick={handleAssignServices} className="bg-teal-700 hover:bg-teal-800">
											Assign Services
										</Button>
									</div>
								</div>
							</DialogContent>
						</Dialog>

						<Button onClick={() => setIsAddDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white">
							<PlusCircle className="w-4 h-4" />
							<span className="hidden md:inline-block ml-2">
								Add New Employee
							</span>
						</Button>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Employee List</CardTitle>
						<CardDescription>View and manage all staff members.</CardDescription>
					</CardHeader>
					<CardContent>
						{employees.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Services</TableHead>
										<TableHead>Appointments Today</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{employees.map((employee) => (
										<TableRow key={employee.id}>
											<TableCell className="font-medium">
												<div className="flex items-center">
													<UserIcon className="w-4 h-4 mr-2" />
													{employee.user.name || "Unnamed"}
												</div>
											</TableCell>
											<TableCell className="text-slate-600 flex items-center">
												<Mail className="w-4 h-4 mr-2" />
												{employee.user.email}
											</TableCell>
											<TableCell>
												<Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
													<Briefcase className="w-3 h-3 mr-1" />
													Staff
												</Badge>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{employee.serviceEmployees.map((se, index) => (
														// biome-ignore lint/suspicious/noArrayIndexKey: noneed
														<Badge key={index} variant="outline" className="text-slate-700">
															{se.service.title}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell className="flex items-center">
												<CalendarDays className="w-4 h-4 mr-2" />
												{employee.appointmentsToday}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex items-center justify-end">
													<Button
														variant="ghost"
														size="icon"
														className="mr-2"
														onClick={() => handleEditEmployee(employee)}
													>
														<Edit className="w-4 h-4" />
														<span className="sr-only">Edit</span>
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-600 hover:text-red-800"
														onClick={() => handleDeleteEmployee(employee.id)}
													>
														<Trash2 className="w-4 h-4" />
														<span className="sr-only">Delete</span>
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className="text-center text-slate-600 py-8">No employees found.</p>
						)}
					</CardContent>
				</Card>

				<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Add New Employee</DialogTitle>
							<DialogDescription>Convert a user to an employee and assign services.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							{error && <p className="text-red-500 text-sm">{error}</p>}
							<div>
								<Label>Select User</Label>
								<Select value={selectedUser} onValueChange={setSelectedUser}>
									<SelectTrigger>
										<SelectValue placeholder="Choose a user" />
									</SelectTrigger>
									<SelectContent>
										{availableUsers.map((user) => (
											<SelectItem key={user.id} value={user.id}>
												{user.name || "Unnamed"} ({user.email})
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Assign Services</Label>
								<div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
									{availableServices.map((service) => (
										<div key={service.id} className="flex items-center space-x-2">
											<Checkbox
												id={`new-${service.id}`}
												checked={selectedServices.includes(service.id)}
												onCheckedChange={() => handleServiceToggle(service.id)}
											/>
											<Label htmlFor={`new-${service.id}`} className="text-sm">
												{service.title}
											</Label>
										</div>
									))}
								</div>
							</div>
							<div className="flex justify-end space-x-2 pt-4">
								<Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
									Cancel
								</Button>
								<Button onClick={handleAddEmployee} className="bg-teal-700 hover:bg-teal-800">
									Add Employee
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Edit Employee Services</DialogTitle>
							<DialogDescription>Update the services this employee can perform.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							{error && <p className="text-red-500 text-sm">{error}</p>}
							<div>
								<Label>Employee: {editingEmployee?.user.name || "Unnamed"}</Label>
								<p className="text-sm text-slate-500">{editingEmployee?.user.email}</p>
							</div>
							<div>
								<Label>Assigned Services</Label>
								<div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
									{availableServices.map((service) => (
										<div key={service.id} className="flex items-center space-x-2">
											<Checkbox
												id={`edit-${service.id}`}
												checked={selectedServices.includes(service.id)}
												onCheckedChange={() => handleServiceToggle(service.id)}
											/>
											<Label htmlFor={`edit-${service.id}`} className="text-sm">
												{service.title}
											</Label>
										</div>
									))}
								</div>
							</div>
							<div className="flex justify-end space-x-2 pt-4">
								<Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
									Cancel
								</Button>
								<Button onClick={handleUpdateEmployee} className="bg-teal-700 hover:bg-teal-800">
									Update Services
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}