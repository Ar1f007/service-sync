"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Don't show navbar for admin or dashboard routes (they have their own sidebars)
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    return null;
  }
  
  return <Navbar />;
}
