import { z } from "zod";

export const assignServiceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  serviceIds: z.array(z.string()).min(1, "At least one service must be selected"),
});

export type AssignServiceFormData = z.infer<typeof assignServiceSchema>;