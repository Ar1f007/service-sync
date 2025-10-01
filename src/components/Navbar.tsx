"use client";

import { Calendar, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";

export default function Navbar() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	const handleSignOut = async () => {
		authClient.signOut()
		router.push("/");
	};

	const isAdmin = session?.user?.role === "admin";

	// @ts-ignore
	const isEmployee = session?.user?.role === "staff";
	const navigationLinks = [
		{ href: "/services", label: "Services", public: true },
		{ href: "/book", label: "Book Appointment", auth: true },
		{
			href: "/dashboard/appointments", label: "My Appointments", auth: true
		},
		{
			href: "/dashboard/employee",
			label: "Employee Dashboard",
			employee: true,
		},
		{ href: "/admin/services", label: "Manage Services", admin: true },
		{ href: "/admin/addons", label: "Service Add-ons", admin: true },
		{ href: "/admin/employees", label: "Manage Staff", admin: true },
		{ href: "/admin/all-appointments", label: "All Appointments", admin: true },
		{ href: "/admin/payments", label: "Payment Management", admin: true },
		{ href: "/admin/waitlist", label: "Waitlist Management", admin: true },
		{ href: "/admin/risk-assessment", label: "Risk Assessment", admin: true },
		{ href: "/admin/emails", label: "Email Management", admin: true },
	];

	const visibleLinks = navigationLinks.filter((link) => {
		if (link.public) return true;
		if (link.auth && session) return true;
		if (link.employee && isEmployee) return true;
		if (link.admin && isAdmin) return true;
		return false;
	});

	return (
		<nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					{/* Logo */}
					<Link href="/" className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
							<Calendar className="w-5 h-5 text-white" />
						</div>
						<span className="text-xl font-bold text-slate-900">
							ServiceSync
						</span>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center space-x-1">
						{visibleLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors duration-200"
							>
								{link.label}
							</Link>
						))}

						{isPending ? (
							<Button variant="ghost" disabled className="ml-4">
								Loading...
							</Button>
						) : session ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="ml-4 h-8 w-8 rounded-full bg-teal-100 hover:bg-teal-200"
									>
										<User className="h-4 w-4 text-teal-700" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<div className="px-2 py-1.5">
										<p className="text-sm font-medium text-slate-900">
											{session.user.name || "User"}
										</p>
										<p className="text-xs text-slate-500">
											{session.user.email}
										</p>
									</div>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={handleSignOut}
										className="text-red-600 focus:text-red-600"
									>
										<LogOut className="mr-2 h-4 w-4" />
										Sign Out
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<Button
								asChild
								className="ml-4 bg-teal-700 hover:bg-teal-800 text-white"
							>
								<Link href="/sign-in">Sign In</Link>
							</Button>
						)}
					</div>

					{/* Mobile menu button */}
					<Button
						variant="ghost"
						size="sm"
						className="md:hidden"
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					>
						{isMobileMenuOpen ? (
							<X className="h-5 w-5" />
						) : (
							<Menu className="h-5 w-5" />
						)}
					</Button>
				</div>

				{/* Mobile Navigation */}
				{isMobileMenuOpen && (
					<div className="md:hidden border-t border-slate-200 py-4">
						<div className="space-y-1">
							{visibleLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:text-teal-700 hover:bg-teal-50 transition-colors duration-200"
									onClick={() => setIsMobileMenuOpen(false)}
								>
									{link.label}
								</Link>
							))}

							{isPending ? (
								<div className="pt-4 border-t border-slate-200 mt-4">
									<Button
										variant="ghost"
										disabled
										className="w-full justify-start"
									>
										Loading...
									</Button>
								</div>
							) : session ? (
								<div className="pt-4 border-t border-slate-200 mt-4">
									<div className="px-3 py-2">
										<p className="text-sm font-medium text-slate-900">
											{session.user.name || "User"}
										</p>
										<p className="text-xs text-slate-500">
											{session.user.email}
										</p>
									</div>
									<Button
										variant="ghost"
										onClick={handleSignOut}
										className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
									>
										<LogOut className="mr-2 h-4 w-4" />
										Sign Out
									</Button>
								</div>
							) : (
								<div className="pt-4 border-t border-slate-200 mt-4">
									<Button
										asChild
										className="w-full bg-teal-700 hover:bg-teal-800 text-white"
									>
										<Link href="/sign-in">Sign In</Link>
									</Button>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</nav>
	);
}
