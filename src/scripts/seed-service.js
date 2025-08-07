import { ObjectId } from "mongodb";
import { PrismaClient } from "../../src/generated/prisma/index.js"; 

const prisma = new PrismaClient();

async function seed() {
	const admin = await prisma.user.findFirst({
  where: { email: "admin@gmail.com" }
});

	await prisma.service.createMany({
		data: [
			{
				id: new ObjectId().toString(),
				title: "Premium Haircut & Style",
				description:
					"Professional haircut with wash, style, and finishing touches.",
				features: ["Consultation", "Wash & Cut", "Professional Styling"],
				duration: 60,
				price: 85.0,
				createdBy: admin.id,
			},
			{
				id: new ObjectId().toString(),
				title: "Relaxing Deep Tissue Massage",
				description:
					"Therapeutic massage targeting muscle tension and stress relief.",
				features: [
					"Deep Tissue Technique",
					"Aromatherapy",
					"Hot Towel Treatment",
				],
				duration: 90,
				price: 120.0,
				createdBy: admin.id,
			},
		],
	});
	console.log("Services seeded");
}

seed().finally(() => prisma.$disconnect());
