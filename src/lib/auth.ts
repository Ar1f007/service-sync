import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ObjectId } from "mongodb"
import prismaInstance from "./db";


export const auth = betterAuth({
  database: prismaAdapter(prismaInstance, {
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
   session: {
    cookieCache: {
      enabled: true,
      maxAge: 120 * 60, // Cache duration in seconds 2hr
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