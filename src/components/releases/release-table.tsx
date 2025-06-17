import React, { useState, useMemo } from 'react';
import { Release } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent,
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils/date";
import { Search, X, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import Link from "next/link";
import { useRouter } from 'next/navigation';

// Type for sorting direction
type SortDirection = 'asc' | 'desc' | null;

// Type for sorting field  
type SortField = 'createdAt' | 'startDate' | 'endDate' | null;

interface ReleaseWithTestCount extends Release {
  testCaseCount: number;
}

interface ReleaseTableProps {
  projectId: string;
  releases: ReleaseWithTestCount[];
}

const getReleaseStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'planning':
      return 'bg-blue-100 text-blue-800';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ReleaseTable({
  projectId,
  releases,
}: ReleaseTableProps) {
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Filter and sort releases
  const filteredAndSortedReleases = useMemo(() => {
    // Filter releases
    let result = releases.filter(release => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.version.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by status
      const matchesStatus = statusFilter === 'all' || 
        release.status.toLowerCase() === statusFilter.toLowerCase();
      
      return matchesSearch && matchesStatus;
    });
    
    // Sort releases if field and direction exist
    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let valueA, valueB;
        
        // Get comparison values based on sortField
        if (sortField === 'createdAt') {
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
        } else if (sortField === 'startDate') {
          valueA = new Date(a.startDate).getTime();
          valueB = new Date(b.startDate).getTime();
        } else if (sortField === 'endDate') {
          valueA = a.endDate ? new Date(a.endDate).getTime() : 0;
          valueB = b.endDate ? new Date(b.endDate).getTime() : 0;
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
  }, [releases, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSearch = () => {
    // Search is handled automatically via useMemo
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField(null);
    setSortDirection(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Input
                placeholder="Search releases..."
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
            
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] h-9 shadow-[2px_2px_0px_0px_hsl(var(--foreground))]">
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
            
            <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}/releases/new`)}>
              New Release
            </Button>
          </div>
          
          {/* Display count information */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredAndSortedReleases.length > 0 ? '1' : '0'}-{filteredAndSortedReleases.length} of {filteredAndSortedReleases.length} releases
          </div>
          
          {/* Display active filters */}
          {(searchTerm || statusFilter !== 'all') && (
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
              
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('all')} className="ml-1">
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
        {filteredAndSortedReleases.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No releases found matching your filters.</p>
            <Button
              variant="link"
              onClick={resetFilters}
              className="mt-2"
            >
              Clear all filters
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/projects/${projectId}/releases/new`)}
              className="mt-4"
            >
              Create your first release
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="h-10 hover:bg-transparent">
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</TableHead>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Version</TableHead>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</TableHead>
                  <TableHead 
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground" 
                    onClick={() => handleSort('startDate')}
                  >
                    <div className="flex items-center">
                      Start Date {renderSortIcon('startDate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                    onClick={() => handleSort('endDate')}
                  >
                    <div className="flex items-center">
                      End Date {renderSortIcon('endDate')}
                    </div>
                  </TableHead>
                  <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Test Cases</TableHead>
                  <TableHead 
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Created {renderSortIcon('createdAt')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReleases.map((release) => (
                  <TableRow key={release.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <TableCell className="p-4 align-middle font-medium">
                      <Link 
                        href={`/projects/${projectId}/releases/${release.id}`}
                        className="text-black hover:underline text-sm"
                      >
                        {release.name}
                      </Link>
                    </TableCell>
                    <TableCell className="p-4 align-middle">
                      <Badge variant="outline" className="text-xs">
                        {release.version}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 align-middle">
                      <Badge className={getReleaseStatusColor(release.status)}>
                        {release.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 align-middle text-sm text-muted-foreground">
                      {formatDate(release.startDate)}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-sm text-muted-foreground">
                      {release.endDate ? formatDate(release.endDate) : "-"}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-sm">
                      {release.testCaseCount}
                    </TableCell>
                    <TableCell className="p-4 align-middle text-sm text-muted-foreground">
                      {formatDate(release.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 