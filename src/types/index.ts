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
  name: string;
  description?: string;
  price: number;
  category?: string;
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
