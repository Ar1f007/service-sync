import { Suspense } from "react";

export default function SigninLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense>
            {children}
        </Suspense>
    )
}