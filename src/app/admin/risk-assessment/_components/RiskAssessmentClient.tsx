"use client";

import {
	AlertTriangle,
	CheckCircle,
	Clock,
	Edit,
	RefreshCw,
	Search,
	Shield,
	Users,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CustomerRisk {
	id: string;
	userId: string;
	totalBookings: number;
	completedBookings: number;
	cancelledBookings: number;
	noShowBookings: number;
	lastMinuteCancellations: number;
	cancellationRate: number;
	noShowRate: number;
	lastMinuteCancelRate: number;
	riskScore: number;
	riskLevel: "low" | "medium" | "high" | "very_high";
	averageBookingFrequency: number | null;
	lastBookingDate: string | null;
	lastCancellationDate: string | null;
	consecutiveCancellations: number;
	requiresApproval: boolean;
	depositRequired: boolean;
	maxAdvanceBookingDays: number | null;
	adminNotes: string | null;
	lastCalculatedAt: string;
	user: {
		id: string;
		name: string | null;
		email: string;
	};
}

export default function RiskAssessmentClient() {
	const [customers, setCustomers] = useState<CustomerRisk[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCustomer, setSelectedCustomer] = useState<CustomerRisk | null>(
		null,
	);
	const [adminNotes, setAdminNotes] = useState("");
	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: noneed
	useEffect(() => {
		fetchCustomers();
	}, []);

	const fetchCustomers = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/risk-assessment");
			if (response.ok) {
				const data = await response.json();
				setCustomers(data);
			}
		} catch (error) {
			console.error("Error fetching customers:", error);
		} finally {
			setLoading(false);
		}
	};

	const refreshCustomerRisk = async (userId: string) => {
		try {
			setRefreshing(true);
			const response = await fetch("/api/risk-assessment", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});

			if (response.ok) {
				await fetchCustomers(); // Refresh the list
			}
		} catch (error) {
			console.error("Error refreshing customer risk:", error);
		} finally {
			setRefreshing(false);
		}
	};

	const updateAdminNotes = async (userId: string, notes: string) => {
		try {
			const response = await fetch(`/api/risk-assessment/${userId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ notes }),
			});

			if (response.ok) {
				await fetchCustomers(); // Refresh the list
				setIsNotesDialogOpen(false);
				setAdminNotes("");
				setSelectedCustomer(null);
			}
		} catch (error) {
			console.error("Error updating admin notes:", error);
		}
	};

	const openNotesDialog = (customer: CustomerRisk) => {
		setSelectedCustomer(customer);
		setAdminNotes(customer.adminNotes || "");
		setIsNotesDialogOpen(true);
	};

	const getRiskLevelColor = (level: string) => {
		switch (level) {
			case "low":
				return "bg-green-100 text-green-800";
			case "medium":
				return "bg-yellow-100 text-yellow-800";
			case "high":
				return "bg-orange-100 text-orange-800";
			case "very_high":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getRiskLevelIcon = (level: string) => {
		switch (level) {
			case "low":
				return <CheckCircle className="h-4 w-4" />;
			case "medium":
				return <Clock className="h-4 w-4" />;
			case "high":
				return <AlertTriangle className="h-4 w-4" />;
			case "very_high":
				return <XCircle className="h-4 w-4" />;
			default:
				return <Shield className="h-4 w-4" />;
		}
	};

	const filteredCustomers = customers.filter(
		(customer) =>
			customer.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			customer.user.email.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const riskStats = {
		total: customers.length,
		low: customers.filter((c) => c.riskLevel === "low").length,
		medium: customers.filter((c) => c.riskLevel === "medium").length,
		high: customers.filter((c) => c.riskLevel === "high").length,
		veryHigh: customers.filter((c) => c.riskLevel === "very_high").length,
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<RefreshCw className="h-8 w-8 animate-spin" />
				<span className="ml-2">Loading risk assessment data...</span>
			</div>
		);
	}

	console.log(riskStats, filteredCustomers);

	return (
		<div className="space-y-6">
			{/* Risk Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Customers
						</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{riskStats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Low Risk</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{riskStats.low}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
						<Clock className="h-4 w-4 text-yellow-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-yellow-600">
							{riskStats.medium}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">High Risk</CardTitle>
						<AlertTriangle className="h-4 w-4 text-orange-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-orange-600">
							{riskStats.high}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Very High Risk
						</CardTitle>
						<XCircle className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							{riskStats.veryHigh}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Search and Actions */}
			<div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
					<Input
						placeholder="Search customers..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Button onClick={fetchCustomers} disabled={refreshing}>
					<RefreshCw
						className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
					/>
					Refresh All
				</Button>
			</div>

			{/* Customer Risk List */}
			<div className="space-y-4">
				{filteredCustomers.length === 0 ? (
					<Card>
						<CardContent className="flex items-center justify-center py-12">
							<div className="text-center">
								<Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									No customers found
								</h3>
								<p className="text-gray-500">
									{searchTerm
										? "Try adjusting your search terms."
										: "No high-risk customers at this time."}
								</p>
							</div>
						</CardContent>
					</Card>
				) : (
					filteredCustomers.map((customer) => (
						<Card
							key={customer.id}
							className="hover:shadow-md transition-shadow"
						>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-lg font-semibold text-gray-900">
												{customer.user.name || "Unknown Customer"}
											</h3>
											<Badge className={getRiskLevelColor(customer.riskLevel)}>
												{getRiskLevelIcon(customer.riskLevel)}
												<span className="ml-1 capitalize">
													{customer.riskLevel.replace("_", " ")}
												</span>
											</Badge>
											<Badge variant="outline">
												Score: {customer.riskScore}/100
											</Badge>
										</div>

										<p className="text-gray-600 mb-3">{customer.user.email}</p>

										<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
											<div>
												<span className="text-gray-500">Total Bookings:</span>
												<span className="ml-1 font-medium">
													{customer.totalBookings}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Completed:</span>
												<span className="ml-1 font-medium text-green-600">
													{customer.completedBookings}
												</span>
											</div>
											<div>
												<span className="text-gray-500">Cancelled:</span>
												<span className="ml-1 font-medium text-red-600">
													{customer.cancelledBookings}
												</span>
											</div>
											<div>
												<span className="text-gray-500">No Shows:</span>
												<span className="ml-1 font-medium text-red-600">
													{customer.noShowBookings}
												</span>
											</div>
										</div>

										<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2">
											<div>
												<span className="text-gray-500">
													Cancellation Rate:
												</span>
												<span className="ml-1 font-medium">
													{(customer.cancellationRate * 100).toFixed(1)}%
												</span>
											</div>
											<div>
												<span className="text-gray-500">No-Show Rate:</span>
												<span className="ml-1 font-medium">
													{(customer.noShowRate * 100).toFixed(1)}%
												</span>
											</div>
											<div>
												<span className="text-gray-500">
													Last-Minute Cancels:
												</span>
												<span className="ml-1 font-medium">
													{customer.lastMinuteCancellations}
												</span>
											</div>
										</div>

										{/* Risk Mitigation Indicators */}
										{(customer.requiresApproval ||
											customer.depositRequired ||
											customer.maxAdvanceBookingDays) && (
											<div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
												<h4 className="text-sm font-medium text-yellow-800 mb-1">
													Risk Mitigation Active:
												</h4>
												<div className="flex flex-wrap gap-2 text-xs">
													{customer.requiresApproval && (
														<Badge
															variant="outline"
															className="text-yellow-700 border-yellow-300"
														>
															Requires Approval
														</Badge>
													)}
													{customer.depositRequired && (
														<Badge
															variant="outline"
															className="text-yellow-700 border-yellow-300"
														>
															Deposit Required
														</Badge>
													)}
													{customer.maxAdvanceBookingDays && (
														<Badge
															variant="outline"
															className="text-yellow-700 border-yellow-300"
														>
															Max {customer.maxAdvanceBookingDays} days advance
														</Badge>
													)}
												</div>
											</div>
										)}

										{/* Admin Notes */}
										{customer.adminNotes && (
											<div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
												<h4 className="text-sm font-medium text-blue-800 mb-1">
													Admin Notes:
												</h4>
												<p className="text-sm text-blue-700">
													{customer.adminNotes}
												</p>
											</div>
										)}
									</div>

									<div className="flex flex-col gap-2 ml-4">
										<Button
											variant="outline"
											size="sm"
											onClick={() => refreshCustomerRisk(customer.userId)}
											disabled={refreshing}
										>
											<RefreshCw
												className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`}
											/>
											Refresh
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => openNotesDialog(customer)}
										>
											<Edit className="h-4 w-4 mr-1" />
											Notes
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>

			{/* Admin Notes Dialog */}
			<Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Admin Notes</DialogTitle>
						<DialogDescription>
							Add or update notes for{" "}
							{selectedCustomer?.user.name || selectedCustomer?.user.email}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Textarea
							placeholder="Enter admin notes about this customer's behavior..."
							value={adminNotes}
							onChange={(e) => setAdminNotes(e.target.value)}
							rows={4}
						/>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => {
									setIsNotesDialogOpen(false);
									setAdminNotes("");
									setSelectedCustomer(null);
								}}
							>
								Cancel
							</Button>
							<Button
								onClick={() =>
									selectedCustomer &&
									updateAdminNotes(selectedCustomer.userId, adminNotes)
								}
							>
								Save Notes
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
