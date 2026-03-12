// Firebase/Firestore type definitions for the application

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed';
  teamId?: string;
  customerId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Team {
  id: string;
  name: string;
  department?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Inactive';
  canAccessProjects?: boolean;
  canAccessTasks?: boolean;
  canAccessCRM?: boolean;
  canAccessInvoices?: boolean;
  canAccessReports?: boolean;
  canAccessSettings?: boolean;
  canAccessGoals?: boolean;
  canAccessTeams?: boolean;
  canAccessChat?: boolean;
  canAccessCustomers?: boolean;
  canAccessServices?: boolean;
  canAccessExpenses?: boolean;
  canAccessProfile?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string;
  assignedToUserId?: string;
  dueDate?: Date;
  parentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Invoice {
  id: string;
  invoiceNumber?: string;
  customerId?: string;
  projectId?: string;
  amount: number;
  total?: number;
  status: 'Draft' | 'Pending' | 'Paid' | 'Overdue';
  paymentMethod?: string;
  dueDate?: Date;
  paidAt?: Date;
  emailSent?: boolean;
  reminderSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Service {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price: number;
  category?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  date?: Date;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  dueDate?: Date;
  status: 'Not Started' | 'In Progress' | 'Completed';
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
  source?: string;
  value?: number;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  serviceId?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskComment {
  id: string;
  taskId: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCollaborator {
  id: string;
  taskId: string;
  userId: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdByUserId: string | null;
}

export interface TimeEntry {
  id: string;
  taskId?: string;
  projectId?: string;
  userId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  completed?: boolean;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: string;
  token?: string;
  expiresAt?: Date;
  invitedByUserId?: string;
  canAccessProjects?: boolean;
  canAccessTasks?: boolean;
  canAccessCRM?: boolean;
  canAccessInvoices?: boolean;
  canAccessReports?: boolean;
  canAccessSettings?: boolean;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message?: string;
  read?: boolean;
  createdAt: Date;
}
