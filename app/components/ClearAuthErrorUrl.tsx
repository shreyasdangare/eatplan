"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * When Supabase redirects with ?error=access_denied&error_code=otp_expired (e.g. expired
 * email link), we show a message on the server and this component clears the URL.
 */
export function ClearAuthErrorUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get("error");
    const code = searchParams.get("error_code");
    if (error === "access_denied" && code === "otp_expired") {
      router.replace("/", { scroll: false });
    }
  }, [router, searchParams]);

  return null;
}
