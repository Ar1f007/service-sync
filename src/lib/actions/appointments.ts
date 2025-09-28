"use server";

import { revalidatePath } from "next/cache";
import prismaInstance from "@/lib/db";
import {
	sendAppointmentCancellation,
	sendAppointmentConfirmation,
} from "@/lib/email";
import { RiskAssessmentService } from "@/lib/risk-assessment";
import { updateCustomerRiskOnAppointmentChange } from "@/lib/risk-updater";
import { getSession } from "../session";

export async function updateAppointmentStatus(
	appointmentId: string,
	status: string,
	cancellationReason?: string,
) {
	const session = await getSession();

	if (!session || session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	try {
		// Get appointment details before updating
		const appointment = await prismaInstance.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
					},
				},
				employee: { include: { user: { select: { id: true, name: true } } } },
				appointmentAddons: {
					include: {
						addon: {
							select: { id: true, name: true, price: true, duration: true },
						},
					},
				},
			},
		});

		if (!appointment) {
			throw new Error("Appointment not found");
		}

		// Prepare update data with cancellation tracking
		const updateData: Record<string, unknown> = {
			status,
			updatedAt: new Date(),
		};

		if (status === "cancelled") {
			updateData.cancelledBy = session.user.id;
			updateData.cancelledByRole = "admin";
			updateData.cancellationReason =
				cancellationReason || "Cancelled by admin";
		}

		// Update appointment
		const updatedAppointment = await prismaInstance.appointment.update({
			where: { id: appointmentId },
			data: updateData,
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: { select: { id: true, name: true, email: true } },
				employee: { include: { user: { select: { id: true, name: true } } } },
				appointmentAddons: {
					include: {
						addon: {
							select: { id: true, name: true, price: true, duration: true },
						},
					},
				},
			},
		});

		// Send appropriate email based on status change
		if (status === "confirmed" && appointment.status !== "confirmed") {
			try {
				// Transform appointment data to include addons in the format expected by email template
				const appointmentWithAddons = {
					...updatedAppointment,
					addons:
						updatedAppointment.appointmentAddons?.map((appointmentAddon) => ({
							id: appointmentAddon.addon.id,
							name: appointmentAddon.addon.name,
							price: appointmentAddon.addon.price,
							duration: appointmentAddon.addon.duration,
						})) || [],
				};

				await sendAppointmentConfirmation(
					appointmentWithAddons,
					updatedAppointment.client,
				);
			} catch (error) {
				console.error("Failed to send confirmation email:", error);
			}
		} else if (status === "cancelled" && appointment.status !== "cancelled") {
			try {
				await sendAppointmentCancellation(
					updatedAppointment,
					updatedAppointment.client,
				);
			} catch (error) {
				console.error("Failed to send cancellation email:", error);
			}
		}

		// Update customer risk assessment
		try {
			await updateCustomerRiskOnAppointmentChange(appointmentId);
		} catch (error) {
			console.error("Failed to update customer risk assessment:", error);
		}

		revalidatePath("/admin/all-appointments");
		revalidatePath("/admin/risk-assessment");

		return { success: true, appointment: updatedAppointment };
	} catch (error) {
		console.error("Failed to update appointment:", error);
		throw error;
	}
}

export async function deleteAppointment(appointmentId: string) {
	const session = await getSession();

	if (!session || session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	try {
		// Get appointment details before deleting
		const appointment = await prismaInstance.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: { select: { id: true, name: true, email: true } },
				employee: { include: { user: { select: { id: true, name: true } } } },
				appointmentAddons: {
					include: {
						addon: {
							select: { id: true, name: true, price: true, duration: true },
						},
					},
				},
			},
		});

		if (!appointment) {
			throw new Error("Appointment not found");
		}

		await prismaInstance.appointment.delete({
			where: { id: appointmentId },
		});

		// Send cancellation email
		try {
			await sendAppointmentCancellation(appointment, appointment.client);
		} catch (error) {
			console.error("Failed to send cancellation email:", error);
		}

		// Update customer risk assessment
		try {
			await updateCustomerRiskOnAppointmentChange(appointmentId);
		} catch (error) {
			console.error("Failed to update customer risk assessment:", error);
		}

		revalidatePath("/admin/all-appointments");
		revalidatePath("/admin/risk-assessment");

		return { success: true };
	} catch (error) {
		console.error("Failed to delete appointment:", error);
		throw error;
	}
}

export async function getAppointmentWithRiskData(appointmentId: string) {
	const session = await getSession();

	if (!session || session.user.role !== "admin") {
		throw new Error("Unauthorized");
	}

	try {
		const appointment = await prismaInstance.appointment.findUnique({
			where: { id: appointmentId },
			include: {
				service: {
					select: { id: true, title: true, price: true, duration: true },
				},
				client: {
					select: {
						id: true,
						name: true,
						email: true,
						role: true,
					},
				},
				employee: { include: { user: { select: { id: true, name: true } } } },
				appointmentAddons: {
					include: {
						addon: {
							select: { id: true, name: true, price: true, duration: true },
						},
					},
				},
			},
		});

		if (!appointment) {
			throw new Error("Appointment not found");
		}

		// Get customer risk data
		const customerRisk = await RiskAssessmentService.getCustomerRisk(
			appointment.clientId,
		);

		return {
			appointment,
			customerRisk,
		};
	} catch (error) {
		console.error("Failed to fetch appointment with risk data:", error);
		throw error;
	}
}
