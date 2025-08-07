import { NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { auth } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { searchParams } = new URL(request.url);
	const excludeEmployees = searchParams.get("excludeEmployees") === "true";

	const users = await prisma.user.findMany({
		where: excludeEmployees ? { employeeInfo: { none: {} } } : {},
		select: { id: true, name: true, email: true },
	});

	return NextResponse.json({ users });
}
