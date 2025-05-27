"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    
    // Map error codes to user-friendly messages
    if (errorParam === "CredentialsSignin") {
      setError("Invalid credentials. Please check your username and password.");
    } else if (errorParam === "AccessDenied") {
      setError("Access denied. You don't have permission to access this resource.");
    } else if (errorParam) {
      setError(`An error occurred: ${errorParam}`);
    } else {
      setError("An unknown authentication error occurred.");
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">Authentication Error</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">{error}</p>
        <Link
          href="/auth/login"
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
} 