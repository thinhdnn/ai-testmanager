import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface CustomPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function CustomPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  hasNextPage,
  hasPreviousPage
}: CustomPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getVisiblePages = () => {
    const delta = 1; // Show 1 page on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Always show first page
    if (totalPages > 0) {
      rangeWithDots.push(1);
    }

    // Calculate the range around current page
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    // Add dots after first page if needed
    if (start > 2) {
      rangeWithDots.push('...');
    }

    // Add pages around current page
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }

    // Add dots before last page if needed
    if (end < totalPages - 1) {
      rangeWithDots.push('...');
    }

    // Always show last page if it's different from first
    if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Results info - smaller text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{startItem}</span> to{' '}
          <span className="font-medium text-foreground">{endItem}</span> of{' '}
          <span className="font-medium text-foreground">{totalCount}</span> results
        </span>
        <span>Page {currentPage} of {totalPages}</span>
      </div>

      {/* Pagination controls - smaller buttons */}
      <div className="flex items-center justify-center">
        <nav className="flex items-center gap-1" aria-label="Pagination">
          {/* Previous button - smaller */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            className="h-8 px-2 text-xs gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Prev</span>
          </Button>

          {/* Page numbers - smaller */}
          <div className="flex items-center gap-1 mx-2">
            {getVisiblePages().map((page, index) => (
              page === '...' ? (
                <Button
                  key={`dots-${index}`}
                  variant="ghost"
                  size="sm"
                  disabled
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={`h-8 w-8 p-0 text-xs ${
                    page === currentPage 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {page}
                </Button>
              )
            ))}
          </div>

          {/* Next button - smaller */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className="h-8 px-2 text-xs gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </nav>
      </div>

      {/* Mobile pagination - more compact */}
      <div className="flex items-center justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="h-8 px-2 text-xs gap-1"
        >
          <ChevronLeft className="h-3 w-3" />
          Prev
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentPage}/{totalPages}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="h-8 px-2 text-xs gap-1"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
} 