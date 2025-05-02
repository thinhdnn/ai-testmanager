"use client";

import { Table } from "@tanstack/react-table";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./data-table-faceted-filter";

interface DataTableFilterProps<TData> {
  table: Table<TData>;
  filterColumn: string;
  placeholder?: string;
  showFilterOptions?: boolean;
  filterOptions?: {
    title: string;
    options: {
      label: string;
      value: string;
      icon?: React.ReactNode;
    }[];
  };
}

export function DataTableFilter<TData>({
  table,
  filterColumn,
  placeholder = "Filter...",
  showFilterOptions = false,
  filterOptions,
}: DataTableFilterProps<TData>) {
  const column = table.getColumn(filterColumn);
  
  if (!column) {
    return null;
  }

  const filterValue = column.getFilterValue() as string;

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder={placeholder}
        value={filterValue ?? ""}
        onChange={(event) => column.setFilterValue(event.target.value)}
        className="h-9 w-[150px] lg:w-[250px]"
      />
      {filterValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.setFilterValue("")}
          className="h-9 px-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear filter</span>
        </Button>
      )}
      
      {showFilterOptions && filterOptions && (
        <DataTableFacetedFilter
          column={column}
          title={filterOptions.title}
          options={filterOptions.options}
        />
      )}
    </div>
  );
} 