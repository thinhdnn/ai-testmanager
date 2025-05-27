'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { UserService } from '@/lib/api/services';

interface User {
  id: string;
  username: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  roles: {
    role: {
      id: string;
      name: string;
    }
  }[];
}

interface UserDetailProps {
  userId: string;
}

export function UserDetail({ userId }: UserDetailProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const userService = new UserService();

  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        const userData = await userService.getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user information');
        
        // Redirect to users page if user not found (404 error)
        if (error instanceof Error && error.message.includes('404')) {
          toast.error('User not found');
          router.push('/users');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [userId, router]);

  async function handleStatusChange() {
    if (!user) return;
    
    try {
      const updatedUser = await userService.updateUserStatus(user.id, !user.isActive);
      
      setUser({
        ...user,
        isActive: updatedUser.isActive,
      });
      
      toast.success(`User ${user.isActive ? 'disabled' : 'enabled'} successfully`);
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  }

  async function handleDeleteUser() {
    if (!user) return;
    
    try {
      setIsDeleting(true);
      await userService.deleteUser(user.id);
      
      toast.success('User deleted successfully');
      router.push('/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="animate-spin h-8 w-8 border-4 border-green-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h3 className="text-xl font-medium mb-2">User not found</h3>
        <Button variant="outline" onClick={() => router.push('/users')}>
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Details</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/users')}>
            Back to Users
          </Button>
        </div>
      </div>

      <Card className="max-w-3xl mx-auto shadow-sm">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{user.username}</CardTitle>
              <CardDescription>
                {user.email || 'No email provided'}
              </CardDescription>
            </div>
            <Badge variant={user.isActive ? 'default' : 'destructive'} className={user.isActive ? 'bg-green-500 hover:bg-green-600 text-white' : ''}>
              {user.isActive ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Active
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Inactive
                </span>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Username</h3>
              <p>{user.username}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
              <p>{user.email || '—'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
              <p>{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
              <p>{new Date(user.updatedAt).toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Roles</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {user.roles && user.roles.length > 0 ? (
                  user.roles.map(({ role }) => (
                    <Badge key={role.id} variant="outline" className="px-3 py-0.5">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t flex justify-between pt-6">
          <div className="flex gap-2">
            <Button
              variant={user.isActive ? 'destructive' : 'default'}
              onClick={handleStatusChange}
            >
              {user.isActive ? 'Disable User' : 'Enable User'}
            </Button>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-1">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure you want to delete this user?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will permanently delete the user
                    and remove their data from our servers.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteUser}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Button className="gap-1" asChild>
            <Link href={`/users/${user.id}/edit`}>
              <Edit className="h-4 w-4" /> Edit
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
} 