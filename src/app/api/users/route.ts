import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismaInstance from "@/lib/db";


export async function GET(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || session.user.role !== "admin") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { searchParams } = new URL(request.url);
	const excludeEmployees = searchParams.get("excludeEmployees") === "true";

	const users = await prismaInstance.user.findMany({
		where: excludeEmployees ? { employeeInfo: { none: {} } } : {},
		select: { id: true, name: true, email: true },
	});

	return NextResponse.json({ users });
}
