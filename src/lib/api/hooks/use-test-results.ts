import { useState, useEffect } from 'react';

interface TestResultsResponse {
  data: any[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface UseTestResultsOptions {
  projectId: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: string;
  browser?: string;
}

export function useTestResults({
  projectId,
  page = 1,
  pageSize = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  search,
  status,
  browser
}: UseTestResultsOptions) {
  const [data, setData] = useState<TestResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (browser) params.append('browser', browser);

      const response = await fetch(`/api/projects/${projectId}/test-results?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch test results');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestResults();
  }, [projectId, page, pageSize, sortBy, sortOrder, search, status, browser]);

  const refetch = () => {
    fetchTestResults();
  };

  return {
    data: data?.data || [],
    pagination: data?.pagination,
    loading,
    error,
    refetch
  };
} 