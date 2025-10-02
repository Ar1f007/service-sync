import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { ObjectId } from "mongodb"
import prismaInstance from "./db";
import { sendEmail } from "./email";


export const auth = betterAuth({
  database: prismaAdapter(prismaInstance, {
    provider: "mongodb",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password - ServiceSync",
        template: "passwordReset",
        data: { user, url, token },
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
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