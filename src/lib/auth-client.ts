import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
  // baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000"
    // plugins: [inferAdditionalFields({
    //   user: {
    //     role: {
    //       type: "string"
    //     },
    //     employeeInfo: {
    //       type: "string"
    //     }
    //   }
    // })],
});

export const { signIn, signUp, useSession, requestPasswordReset, resetPassword } = authClient;