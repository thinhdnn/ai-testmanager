"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReleaseTable } from '@/components/releases/release-table';
import { useReleases } from '@/lib/api/hooks/use-releases';

export default function ReleasesPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    releases,
    pagination,
    isLoading,
    error,
    onSearch,
    onPageChange,
    onPageSizeChange,
    onSort,
  } = useReleases('all'); // 'all' indicates we want releases from all projects

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    // TODO: Add status filtering in the API
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-destructive">Error loading releases: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Releases</h1>
        <p className="text-muted-foreground">
          Manage and track your project releases. View release status, associated test cases, and overall progress.
        </p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <ReleaseTable releases={releases} />
      )}
    </div>
  );
} 