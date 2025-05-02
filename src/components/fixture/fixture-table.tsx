'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { Edit, Code, MoreHorizontal, Copy, Trash, Search, X, ArrowUpDown, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Type for sorting direction
type SortDirection = 'asc' | 'desc' | null;

// Type for sorting field
type SortField = 'createdAt' | 'updatedAt' | null;

interface Fixture {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  exportName?: string | null;
  filename?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    Steps: number;
  };
}

interface FixtureTableProps {
  fixtures: Fixture[];
  projectId: string;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    search: string;
    type: string;
  };
}

export function FixtureTable({ fixtures = [], projectId, pagination, filters }: FixtureTableProps) {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
  const [currentPage, setCurrentPage] = useState(pagination.page);
  const [itemsPerPage, setItemsPerPage] = useState(pagination.limit);
  
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fixtureToDelete, setFixtureToDelete] = useState<Fixture | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Local state to track fixtures for immediate UI updates
  const [localFixtures, setLocalFixtures] = useState<Fixture[]>(Array.isArray(fixtures) ? fixtures : []);
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalFixtures(Array.isArray(fixtures) ? fixtures : []);
  }, [fixtures]);
  
  // Type options
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'data', label: 'Data' },
    { value: 'setup', label: 'Setup' },
    { value: 'teardown', label: 'Teardown' },
    { value: 'utility', label: 'Utility' },
  ];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } 
      else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } 
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Function to filter and sort fixtures based on filters and sort options
  const filteredAndSortedFixtures = useMemo(() => {
    // Filter fixtures
    let result = localFixtures.filter(fixture => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        fixture.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fixture.description && fixture.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by type
      const matchesType = typeFilter === 'all' || 
        fixture.type.toLowerCase() === typeFilter.toLowerCase();
      
      return matchesSearch && matchesType;
    });
    
    // Sort fixtures if field and direction exist
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valueA, valueB;
        
        // Get comparison values based on sortField
        if (sortField === 'createdAt') {
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
        } else if (sortField === 'updatedAt') {
          valueA = new Date(a.updatedAt).getTime();
          valueB = new Date(b.updatedAt).getTime();
        } else {
          return 0;
        }
        
        // Compare and return results based on sortDirection
        if (sortDirection === 'asc') {
          return valueA - valueB;
        } else {
          return valueB - valueA;
        }
      });
    }
    
    return result;
  }, [localFixtures, searchTerm, typeFilter, sortField, sortDirection]);
  
  // Paginate filtered and sorted data
  const paginatedFixtures = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedFixtures.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedFixtures, currentPage, itemsPerPage]);
  
  // Total pages after filtering
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedFixtures.length / itemsPerPage));
  
  // Ensure currentPage doesn't exceed totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  
  // Function to render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 inline text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 inline text-primary" />;
  };
  
  // Function to get type badge color
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'data':
        return 'bg-blue-500';
      case 'setup':
        return 'bg-green-500';
      case 'teardown':
        return 'bg-red-500';
      case 'utility':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Handle search input
  const handleSearch = () => {
    setCurrentPage(1); // Reset to page 1 when changing filters
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Handle type change
  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    setCurrentPage(1); // Reset to page 1 when changing filters
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setCurrentPage(1);
    setSortField(null);
    setSortDirection(null);
  };

  // Handle fixture deletion
  const handleDeleteFixture = async () => {
    if (!fixtureToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixtureToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete fixture');
      }
      
      toast.success('Fixture deleted successfully');
      
      // Update the local fixtures array by removing the deleted fixture
      setLocalFixtures(prevFixtures => prevFixtures.filter(f => f.id !== fixtureToDelete.id));
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setFixtureToDelete(null);
      
      // Also update the router state to keep UI and URL in sync, but the UI will
      // update immediately thanks to our state update
      router.refresh();
    } catch (error) {
      console.error('Error deleting fixture:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate pagination range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(startItem + itemsPerPage - 1, filteredAndSortedFixtures.length);
  
  const [isCloning, setIsCloning] = useState(false);

  // Handle fixture cloning
  const handleCloneFixture = async (fixture: Fixture) => {
    try {
      setIsCloning(true);
      
      const response = await fetch(`/api/projects/${projectId}/fixtures/${fixture.id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone fixture');
      }

      const result = await response.json();
      
      toast.success('Fixture cloned successfully');
      
      // Add the new fixture to the local state
      setLocalFixtures(prevFixtures => [...prevFixtures, result.fixture]);
      
      // Refresh the router to update the UI
      router.refresh();
    } catch (error) {
      console.error('Error cloning fixture:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>
            Showing {filteredAndSortedFixtures.length > 0 ? startItem : 0}-{endItem} of {filteredAndSortedFixtures.length} fixtures
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="flex w-full sm:w-auto gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search fixtures..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full sm:w-auto pl-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                {searchTerm && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/fixtures/new`)}>
                New Fixture
              </Button>
            </div>
          </div>
          
          {/* Display active filters */}
          {(searchTerm || typeFilter !== 'all') && (
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="text-sm text-muted-foreground mr-2">Active filters:</div>
              
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <button onClick={clearSearch} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {typeFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter('all')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-6">
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {filteredAndSortedFixtures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No fixtures found matching your filters.</p>
              <Button
                variant="link"
                onClick={resetFilters}
                className="mt-2"
              >
                Clear all filters
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}/fixtures/new`)}
                className="mt-4"
              >
                Create your first fixture
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="h-10 hover:bg-transparent">
                    <TableHead className="py-2">Name</TableHead>
                    <TableHead className="py-2">Type</TableHead>
                    <TableHead 
                      className="py-2 cursor-pointer" 
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created {renderSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="py-2 cursor-pointer"
                      onClick={() => handleSort('updatedAt')}
                    >
                      <div className="flex items-center">
                        Updated {renderSortIcon('updatedAt')}
                      </div>
                    </TableHead>
                    <TableHead className="py-2">Steps</TableHead>
                    <TableHead className="py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFixtures.map((fixture) => (
                    <TableRow key={fixture.id} className="h-10 hover:bg-muted/50">
                      <TableCell className="font-medium py-1">
                        <Link 
                          href={`/projects/${projectId}/fixtures/${fixture.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          {fixture.name}
                        </Link>
                        {fixture.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {fixture.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <Badge className={cn("text-white text-xs", getTypeColor(fixture.type))}>
                          {fixture.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1 text-sm">{formatDate(fixture.createdAt)}</TableCell>
                      <TableCell className="py-1 text-sm">{formatDate(fixture.updatedAt)}</TableCell>
                      <TableCell className="py-1 text-sm">
                        {fixture._count?.Steps || 0}
                      </TableCell>
                      <TableCell className="py-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/projects/${projectId}/fixtures/${fixture.id}`)}>
                              <Code className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/projects/${projectId}/fixtures/${fixture.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleCloneFixture(fixture)}
                              disabled={isCloning}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {isCloning ? 'Cloning...' : 'Clone'}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setFixtureToDelete(fixture);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <span className="sr-only">Previous</span>
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => 
                        page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 1
                      )
                      .map((page, i, arr) => (
                        <div key={page} className="flex items-center">
                          {i > 0 && arr[i - 1] !== page - 1 && (
                            <span className="px-2">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      ))
                  }
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="sr-only">Next</span>
                    Next
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fixture</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the fixture "{fixtureToDelete?.name}"?
              This action cannot be undone and will permanently remove this fixture and all its steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFixture();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 