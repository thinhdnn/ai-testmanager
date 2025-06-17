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
import { CustomPagination } from '@/components/ui/custom-pagination';
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
import { FixtureService } from '@/lib/api/services';

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
  const fixtureService = new FixtureService();
  
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
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/70" />;
    }
    
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary" />;
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
      
      await fixtureService.deleteFixture(projectId, fixtureToDelete.id);
      
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
      
      const clonedFixture = await fixtureService.cloneFixture(projectId, fixture.id);
      
      toast.success('Fixture cloned successfully');
      
      // Add the new fixture to the local state
      setLocalFixtures(prevFixtures => [...prevFixtures, clonedFixture]);
      
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex w-full sm:w-auto gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search fixtures..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-[180px] h-9 pl-9 shadow-[2px_2px_0px_0px_hsl(var(--foreground))]"
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
                  <SelectTrigger className="w-[180px] h-9 shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
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
                
                <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}/fixtures/new`)}>
                  New Fixture
                </Button>
              </div>
            </div>
            
            {/* Display count information */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedFixtures.length > 0 ? startItem : 0}-{endItem} of {filteredAndSortedFixtures.length} fixtures
            </div>
            
            {/* Display active filters */}
            {(searchTerm || typeFilter !== 'all') && (
              <div className="flex flex-wrap gap-2">
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
          </div>
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
                  <TableRow>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</TableHead>
                    <TableHead 
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground" 
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center">
                        Created {renderSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                      onClick={() => handleSort('updatedAt')}
                    >
                      <div className="flex items-center">
                        Updated {renderSortIcon('updatedAt')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Steps</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFixtures.map((fixture) => (
                    <TableRow key={fixture.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <TableCell className="p-4 align-middle font-medium">
                        <Link 
                          href={`/projects/${projectId}/fixtures/${fixture.id}`}
                          className="text-black hover:underline text-sm"
                        >
                          {fixture.name}
                        </Link>
                        {fixture.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {fixture.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <Badge className={cn("text-white text-xs", getTypeColor(fixture.type))}>
                          {fixture.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 align-middle text-sm">{formatDate(fixture.createdAt)}</TableCell>
                      <TableCell className="p-4 align-middle text-sm">{formatDate(fixture.updatedAt)}</TableCell>
                      <TableCell className="p-4 align-middle text-sm">
                        {fixture._count?.Steps || 0}
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <div className="flex items-center justify-end gap-1">
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <CustomPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={filteredAndSortedFixtures.length}
                  pageSize={itemsPerPage}
                  onPageChange={handlePageChange}
                  hasNextPage={currentPage < totalPages}
                  hasPreviousPage={currentPage > 1}
                />
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