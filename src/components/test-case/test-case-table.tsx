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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import { Edit, Play, MoreHorizontal, Copy, Trash, Search, X, ArrowUpDown, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TestCaseService } from '@/lib/api/services';

// Type for sorting direction
type SortDirection = 'asc' | 'desc' | null;

// Type for sorting field
type SortField = 'createdAt' | 'lastRun' | null;

interface TestCase {
  id: string;
  name: string;
  status: string;
  tags: string[] | string | null;
  version?: string;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
  lastRun?: string | null;
  _count?: {
    steps: number;
  };
}

interface TestCaseTableProps {
  testCases: TestCase[];
  projectId: string;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  filters: {
    search: string;
    status: string;
    tags: string[];
  };
  onRunSelected?: (testCaseIds: string[]) => void;
  onTestCaseDeleted?: (deletedTestCaseId: string) => void;
}

export function TestCaseTable({ 
  testCases = [], 
  projectId, 
  pagination, 
  filters,
  onRunSelected,
  onTestCaseDeleted
}: TestCaseTableProps) {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
  const [tagsFilter, setTagsFilter] = useState<string[]>(filters.tags || []);
  const [currentPage, setCurrentPage] = useState(pagination.page);
  const [itemsPerPage, setItemsPerPage] = useState(pagination.limit);
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // State for delete confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = useState<TestCase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Local state to track test cases for immediate UI updates
  const [localTestCases, setLocalTestCases] = useState<TestCase[]>(Array.isArray(testCases) ? testCases : []);
  
  // Create a memoized instance of TestCaseService
  const testCaseService = useMemo(() => new TestCaseService(), []);
  
  // Update local state when prop changes
  useEffect(() => {
    setLocalTestCases(Array.isArray(testCases) ? testCases : []);
  }, [testCases]);
  
  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'draft', label: 'Draft' },
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

  // Function to filter and sort test cases based on filters and sort options
  const filteredAndSortedTestCases = useMemo(() => {
    // Filter test cases
    let result = localTestCases.filter(testCase => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        testCase.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const matchesStatus = statusFilter === 'all' || 
        testCase.status.toLowerCase() === statusFilter.toLowerCase();
      
      // Filter by tags
      const matchesTags = tagsFilter.length === 0 || 
        (testCase.tags && tagsFilter.some(tag => {
          if (Array.isArray(testCase.tags)) {
            return testCase.tags.some(t => t.toLowerCase() === tag.toLowerCase());
          } else if (typeof testCase.tags === 'string') {
            return testCase.tags.toLowerCase().includes(tag.toLowerCase());
          }
          return false;
        }));
      
      return matchesSearch && matchesStatus && matchesTags;
    });
    
    // Sort test cases if field and direction exist
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valueA, valueB;
        
        // Get comparison values based on sortField
        if (sortField === 'createdAt') {
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
        } else if (sortField === 'lastRun') {
          // For lastRun, treat null values as oldest time
          valueA = a.lastRun ? new Date(a.lastRun).getTime() : 0;
          valueB = b.lastRun ? new Date(b.lastRun).getTime() : 0;
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
  }, [localTestCases, searchTerm, statusFilter, tagsFilter, sortField, sortDirection]);
  
  // Paginate filtered and sorted data
  const paginatedTestCases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTestCases.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTestCases, currentPage, itemsPerPage]);
  
  // Total pages after filtering
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedTestCases.length / itemsPerPage));
  
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
  
  // Function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'deprecated':
        return 'bg-red-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
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

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1); // Reset to page 1 when changing filters
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Tag display with click to filter
  const renderTags = (tags: string | string[] | null) => {
    if (!tags) return null;
    
    const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim());
    
    return (
      <div className="flex flex-wrap gap-1">
        {tagArray.map((tag, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            className="cursor-pointer hover:bg-primary/10 text-xs"
            onClick={() => {
              const newTagsFilter = [...tagsFilter];
              if (newTagsFilter.includes(tag)) {
                // If tag already exists in filter, remove it
                const index = newTagsFilter.indexOf(tag);
                newTagsFilter.splice(index, 1);
              } else {
                // If tag doesn't exist in filter, add it
                newTagsFilter.push(tag);
              }
              setTagsFilter(newTagsFilter);
              setCurrentPage(1);
            }}
          >
            {tag}
          </Badge>
        ))}
      </div>
    );
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTagsFilter([]);
    setCurrentPage(1);
    setSortField(null);
    setSortDirection(null);
  };

  // Handle test case deletion using service
  const handleDeleteTestCase = async () => {
    if (!testCaseToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Use the service instead of direct fetch
      await testCaseService.deleteTestCase(projectId, testCaseToDelete.id);
      
      toast.success('Test case deleted successfully');
      
      // Update the local test cases array by removing the deleted test case
      setLocalTestCases(prevTestCases => prevTestCases.filter(tc => tc.id !== testCaseToDelete.id));
      
      // Close the dialog
      setIsDeleteDialogOpen(false);
      setTestCaseToDelete(null);
      
      // Also update the router state to keep UI and URL in sync, but the UI will
      // update immediately thanks to our state update
      router.refresh();
      
      if (onTestCaseDeleted) {
        onTestCaseDeleted(testCaseToDelete.id);
      }
    } catch (error) {
      console.error('Error deleting test case:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Clone a test case using service
  const handleCloneTestCase = async (testCase: TestCase) => {
    try {
      // Use the service instead of direct fetch
      const clonedTestCase = await testCaseService.cloneTestCase(projectId, testCase.id);
      
      console.log('Cloned test case response:', clonedTestCase);
      
      if (!clonedTestCase || !clonedTestCase.id) {
        throw new Error('Invalid response: missing test case ID');
      }
      
      toast.success('Test case cloned successfully');
      
      // Navigate to the new cloned test case
      router.push(`/projects/${projectId}/test-cases/${clonedTestCase.id}`);
    } catch (error) {
      console.error('Error cloning test case:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  // Calculate pagination range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(startItem + itemsPerPage - 1, filteredAndSortedTestCases.length);
  
  // Function to toggle selection of a test case
  const toggleTestCaseSelection = (testCaseId: string) => {
    setSelectedTestCases(prev => {
      if (prev.includes(testCaseId)) {
        return prev.filter(id => id !== testCaseId);
      } else {
        return [...prev, testCaseId];
      }
    });
  };

  // Function to select all visible test cases
  const selectAllTestCases = () => {
    if (selectedTestCases.length === filteredAndSortedTestCases.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(filteredAndSortedTestCases.map(tc => tc.id));
    }
  };

  // Function to run selected test cases
  const runSelectedTestCases = () => {
    if (onRunSelected && selectedTestCases.length > 0) {
      onRunSelected(selectedTestCases);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>
            Showing {filteredAndSortedTestCases.length > 0 ? startItem : 0}-{endItem} of {filteredAndSortedTestCases.length} test cases
          </CardDescription>
          
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <div className="flex w-full sm:w-auto gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search test cases..."
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
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {onRunSelected && selectedTestCases.length > 0 && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={runSelectedTestCases}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Selected ({selectedTestCases.length})
                </Button>
              )}
              
              <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/test-cases/new`)}>
                New Test Case
              </Button>
            </div>
          </div>
          
          {/* Display active filters */}
          {(searchTerm || statusFilter !== 'all' || tagsFilter.length > 0) && (
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
              
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {tagsFilter.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  Tag: {tag}
                  <button onClick={() => {
                    const newTags = [...tagsFilter];
                    newTags.splice(index, 1);
                    setTagsFilter(newTags);
                  }} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs h-6">
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {filteredAndSortedTestCases.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No test cases found matching your filters.</p>
              <Button
                variant="link"
                onClick={resetFilters}
                className="mt-2"
              >
                Clear all filters
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}/test-cases/new`)}
                className="mt-4"
              >
                Create your first test case
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="h-10 hover:bg-transparent">
                    {onRunSelected && (
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 w-10 [&>[role=checkbox]]:translate-y-[2px]">
                        <Checkbox 
                          checked={selectedTestCases.length > 0 && selectedTestCases.length === filteredAndSortedTestCases.length}
                          onCheckedChange={selectAllTestCases}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tags</TableHead>
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
                      onClick={() => handleSort('lastRun')}
                    >
                      <div className="flex items-center">
                        Last Run {renderSortIcon('lastRun')}
                      </div>
                    </TableHead>
                    <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTestCases.map((testCase) => (
                    <TableRow key={testCase.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      {onRunSelected && (
                        <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]">
                          <Checkbox 
                            checked={selectedTestCases.includes(testCase.id)}
                            onCheckedChange={() => toggleTestCaseSelection(testCase.id)}
                            aria-label={`Select ${testCase.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="p-4 align-middle font-medium">
                        <Link 
                          href={`/projects/${projectId}/test-cases/${testCase.id}`}
                          className="text-black hover:underline text-sm"
                        >
                          {testCase.name}
                        </Link>
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <Badge className={cn("text-white text-xs", getStatusColor(testCase.status))}>
                          {testCase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {renderTags(testCase.tags)}
                        </div>
                      </TableCell>
                      <TableCell className="p-4 align-middle text-sm">{formatDate(testCase.createdAt)}</TableCell>
                      <TableCell className="p-4 align-middle text-sm">
                        {testCase.lastRun ? formatDate(testCase.lastRun) : "Never"}
                      </TableCell>
                      <TableCell className="p-4 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => router.push(`/projects/${projectId}/test-cases/${testCase.id}/edit`)}
                          >
                            <Edit className="h-3 w-3" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => onRunSelected ? onRunSelected([testCase.id]) : null}
                          >
                            <Play className="h-3 w-3" />
                            <span className="sr-only">Run</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                                <span className="sr-only">More</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCloneTestCase(testCase)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Clone</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => {
                                setTestCaseToDelete(testCase);
                                setIsDeleteDialogOpen(true);
                              }}>
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
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
                  totalCount={filteredAndSortedTestCases.length}
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
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the test case "{testCaseToDelete?.name}"?
              This action cannot be undone and will permanently remove this test case and all its steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTestCase();
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