"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ReleasesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    // Redirect to project detail page with releases tab active
    router.replace(`/projects/${projectId}?tab=releases`);
  }, [projectId, router]);

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
    </div>
  );
} 