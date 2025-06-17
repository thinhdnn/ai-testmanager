import { useState, useEffect } from "react";
import { ReleaseService } from "@/lib/api/services";

const releaseService = new ReleaseService();

export function useReleases(projectId: string) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchReleases() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await releaseService.getReleases(projectId, {
          page,
          pageSize,
          sortField,
          sortOrder,
          search,
        });
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReleases();
  }, [projectId, page, pageSize, sortField, sortOrder, search]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleSort = (field: string, order: "asc" | "desc") => {
    setSortField(field);
    setSortOrder(order);
  };

  const handleSearch = (searchTerm: string) => {
    setSearch(searchTerm);
    setPage(1); // Reset to first page when searching
  };

  return {
    releases: data?.releases || [],
    pagination: data?.pagination || {
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    },
    isLoading,
    error,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,
    onSort: handleSort,
    onSearch: handleSearch,
  };
} 