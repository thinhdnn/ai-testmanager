import { ApiClient } from '../api-client';

interface Role {
  id: string;
  name: string;
}

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
    roleId: string;
    role: {
      id: string;
      name: string;
    }
  }[];
}

export class UserService {
  private apiClient: ApiClient;

  constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  async getUsers(params?: {
    skip?: number;
    take?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: string;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.take !== undefined) searchParams.append('take', params.take.toString());
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) searchParams.append('sortDirection', params.sortDirection);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    return this.apiClient.get<{ users: User[]; total: number }>(
      `/users?${searchParams.toString()}`
    );
  }

  async getUser(userId: string): Promise<User> {
    return this.apiClient.get<User>(`/users/${userId}`);
  }

  async createUser(user: {
    username: string;
    email: string | null;
    password: string;
    roleIds?: string[];
    isActive?: boolean;
  }): Promise<User> {
    return this.apiClient.post<User>('/users', user);
  }

  async updateUser(userId: string, user: {
    email?: string | null;
    password?: string;
    roleIds?: string[];
    isActive?: boolean;
  }): Promise<User> {
    return this.apiClient.put<User>(`/users/${userId}`, user);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    return this.apiClient.patch<User>(`/users/${userId}/status`, { isActive });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.apiClient.delete(`/users/${userId}`);
  }
  
  async getRoles(): Promise<{ roles: Role[] }> {
    return this.apiClient.get<{ roles: Role[] }>('/roles');
  }
} 