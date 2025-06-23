"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, X, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { UserService } from '@/lib/api/services';

interface User {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  roles: {
    role: {
      id: string;
      name: string;
    }
  }[];
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState("username");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const userService = new UserService();

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, sortField, sortDirection, statusFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      
      const result = await userService.getUsers({
        skip: page * pageSize,
        take: pageSize,
        sortBy: sortField,
        sortDirection: sortDirection,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined
      });
      
      setUsers(result.users);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(field: string) {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  async function handleStatusChange(userId: string, isActive: boolean) {
    try {
      await userService.updateUserStatus(userId, isActive);
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
      
      toast.success(`User ${isActive ? "enabled" : "disabled"} successfully`);
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    }
  }

  function clearSearch() {
    setSearchTerm("");
    loadUsers();
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-semibold">Users</h1>
        </div>
        <p className="text-muted-foreground">
          Manage user accounts, roles, and permissions. Control access levels and monitor user activity across the system.
        </p>
      </div>

      <div className="bg-background rounded-lg border">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative">
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  loadUsers();
                }}
                placeholder="Search users..."
                className="w-[180px] h-9 pl-9 shadow-md hover:shadow-lg transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px] h-9 shadow-md hover:shadow-lg transition-shadow">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" asChild className="h-9">
                <Link href="/users/new">Create User</Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter ? "Try different search criteria" : "Get started by creating your first user"}
              </p>
              {!searchTerm && !statusFilter && (
                <Button asChild>
                  <Link href="/users/new">Create User</Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="h-10 hover:bg-transparent">
                      <TableHead 
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground" 
                        onClick={() => handleSort("username")}
                      >
                        <div className="flex items-center">
                          Username
                          {sortField === "username" && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center">
                          Email
                          {sortField === "email" && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</TableHead>
                      <TableHead 
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                        onClick={() => handleSort("isActive")}
                      >
                        <div className="flex items-center">
                          Status
                          {sortField === "isActive" && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:text-accent-foreground"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center">
                          Created At
                          {sortField === "createdAt" && (
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell className="px-4 py-2 text-foreground">{user.username}</TableCell>
                        <TableCell className="px-4 py-2">{user.email || "-"}</TableCell>
                        <TableCell className="px-4 py-2">
                          {user.roles && user.roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.roles.map(({ role }) => (
                                <Badge key={role.id} variant="outline">{role.name}</Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline">No Role</Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-2">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/users/${user.id}/edit`}>Edit</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, !user.isActive)}>
                                {user.isActive ? "Disable" : "Enable"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} users
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={(page + 1) * pageSize >= total}
                    onClick={() => setPage((prev) => {
                      if ((prev + 1) * pageSize < total) {
                        return prev + 1;
                      }
                      return prev;
                    })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 