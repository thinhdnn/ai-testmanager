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
import { PlusIcon } from "@radix-ui/react-icons";
import { DataTable } from "@/components/ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";

interface ReleaseWithTestCount extends Release {
  testCaseCount: number;
}

interface ReleaseTableProps {
  projectId: string;
  releases: ReleaseWithTestCount[];
  pagination: {
    pageSize: number;
    page: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (field: string, order: 'asc' | 'desc') => void;
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
  pagination,
  onPageChange,
  onPageSizeChange,
  onSort,
}: ReleaseTableProps) {
  const columns: ColumnDef<ReleaseWithTestCount>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const release = row.original;
        return (
          <Link
            href={`/projects/${projectId}/releases/${release.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            {release.name}
          </Link>
        );
      },
    },
    {
      accessorKey: "version",
      header: "Version",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge className={getReleaseStatusColor(status)}>
            {status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.getValue("startDate") as Date),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => {
        const endDate = row.getValue("endDate") as Date | null;
        return endDate ? formatDate(endDate) : "-";
      },
    },
    {
      accessorKey: "testCaseCount",
      header: "Test Cases",
      cell: ({ row }) => row.original.testCaseCount,
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => formatDate(row.getValue("updatedAt") as Date),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Releases</h2>
        <Link href={`/projects/${projectId}/releases/new`}>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Release
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={releases}
      />
    </div>
  );
} 