import { Role, FileStatus, ActionType, Priority, LocationArea } from '@prisma/client';

// Re-export Prisma enums for convenience
export { Role, FileStatus, ActionType, Priority, LocationArea };

// Session user type
export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  role: Role;
  departmentId: string;
  departmentCode: string;
}

// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// File related types
export interface FileWithRelations {
  id: string;
  fileNo: string;
  customerName: string;
  customerNo: string | null;
  ksmData: any;
  status: FileStatus;
  priority: Priority;
  iterationNumber: number;
  iterationLabel: string;
  pendingTakeover: boolean;
  requiresApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  assignedDesigner: {
    id: string;
    fullName: string;
    username: string;
  } | null;
  currentDepartment: {
    id: string;
    name: string;
    code: string;
  };
  currentLocationSlot: {
    id: string;
    code: string;
    name: string;
    area: LocationArea;
    row: number;
    column: number;
  } | null;
}

export interface ActiveTimer {
  id: string;
  departmentId: string;
  userId: string | null;
  startTime: Date;
  elapsedSeconds: number;
}

// Action types for workflow
export type WorkflowAction =
  | 'ASSIGN'
  | 'TAKEOVER'
  | 'TRANSFER'
  | 'REQUEST_APPROVAL'
  | 'SEND_TO_CUSTOMER'
  | 'CUSTOMER_OK'
  | 'CUSTOMER_NOK'
  | 'RESTART_MG'
  | 'QUALITY_OK'
  | 'QUALITY_NOK'
  | 'DIRECT_TO_QUALITY'
  | 'SEND_TO_PRODUCTION'
  | 'ADD_NOTE';

// Permission types
export type Permission =
  | 'file:create'
  | 'file:assign'
  | 'file:takeover'
  | 'file:transfer'
  | 'file:view_all'
  | 'note:create'
  | 'customer:approve'
  | 'quality:approve'
  | 'production:send'
  | 'report:view'
  | 'user:manage'
  | 'override:execute';

// Dashboard types
export interface DashboardStats {
  unassignedCount: number;
  activeFilesCount: number;
  completedToday: number;
  overdueCount: number;
}

export interface DesignerWorkload {
  userId: string;
  fullName: string;
  activeFiles: number;
  avgProcessingHours: number;
}

export interface DepartmentStat {
  departmentId: string;
  name: string;
  code: string;
  activeFiles: number;
  avgWaitHours: number;
}

export interface OverdueFile {
  id: string;
  fileNo: string;
  customerName: string;
  currentDepartment: string;
  elapsedHours: number;
  slaHours: number;
  slaStatus: 'OK' | 'WARNING' | 'CRITICAL';
}
