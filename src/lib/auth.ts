import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PrismaClient } from "@/generated/prisma";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ObjectId } from "mongodb"

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  emailAndPassword: {
    enabled: true,    
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        default: "client", 
      },      
    },
  },
  plugins: [nextCookies()],
  advanced: {
    database: {
      generateId() {        
         return new ObjectId().toString();
      },
    }
  }
});