import { Role, FileStatus } from '@prisma/client';
import type { Permission, WorkflowAction, SessionUser } from './types';

// Permission definitions per role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'file:create',
    'file:assign',
    'file:takeover',
    'file:transfer',
    'file:view_all',
    'note:create',
    'customer:approve',
    'quality:approve',
    'production:send',
    'report:view',
    'user:manage',
    'override:execute',
  ],
  ONREPRO: [
    'file:create',
    'file:takeover',
    'file:transfer',
    'file:view_all',
    'note:create',
    'customer:approve',
  ],
  GRAFIKER: ['file:takeover', 'file:transfer', 'note:create'],
  KALITE: ['file:takeover', 'file:transfer', 'note:create', 'quality:approve'],
  KOLAJ: ['file:takeover', 'file:transfer', 'note:create', 'production:send'],
};

// Department code mapping
const ROLE_DEPARTMENT_MAP: Record<Role, string> = {
  ADMIN: 'ADMIN',
  ONREPRO: 'ONREPRO',
  GRAFIKER: 'REPRO',
  KALITE: 'KALITE',
  KOLAJ: 'KOLAJ',
};

/**
 * Check if session user has one of the given roles
 */
export function hasRole(user: SessionUser, roles: Role[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get the department code for a role
 */
export function getDepartmentForRole(role: Role): string {
  return ROLE_DEPARTMENT_MAP[role];
}

/**
 * Check if user can perform action on file
 */
export function canPerformAction(
  user: SessionUser,
  action: WorkflowAction,
  file: {
    status: FileStatus;
    assignedDesignerId: string | null;
    currentDepartmentId: string;
    pendingTakeover: boolean;
    requiresApproval: boolean;
  },
  hasActiveTimer: boolean = false
): boolean {
  const { role, id: userId, departmentId } = user;

  switch (action) {
    case 'ASSIGN':
      return role === 'ADMIN' && file.status === 'AWAITING_ASSIGNMENT';

    case 'TAKEOVER':
      // Can take over if:
      // 1. File is pending takeover to user's department, OR
      // 2. File is ASSIGNED/REVISION_REQUIRED and user is assigned designer
      if (file.pendingTakeover && file.currentDepartmentId === departmentId) {
        return true;
      }
      if (
        (file.status === 'ASSIGNED' || file.status === 'REVISION_REQUIRED') &&
        file.assignedDesignerId === userId
      ) {
        return true;
      }
      return false;

    case 'REQUEST_APPROVAL':
      return (
        role === 'GRAFIKER' &&
        file.status === 'IN_REPRO' &&
        file.requiresApproval &&
        file.assignedDesignerId === userId &&
        hasActiveTimer
      );

    case 'DIRECT_TO_QUALITY':
      return (
        role === 'GRAFIKER' &&
        file.status === 'IN_REPRO' &&
        !file.requiresApproval &&
        file.assignedDesignerId === userId &&
        hasActiveTimer
      );

    case 'SEND_TO_CUSTOMER':
      return (
        (role === 'ADMIN' || role === 'ONREPRO') &&
        file.status === 'APPROVAL_PREP'
      );

    case 'CUSTOMER_OK':
    case 'CUSTOMER_NOK':
    case 'RESTART_MG':
      return (
        (role === 'ADMIN' || role === 'ONREPRO') &&
        file.status === 'CUSTOMER_APPROVAL'
      );

    case 'QUALITY_OK':
    case 'QUALITY_NOK':
      return (
        (role === 'ADMIN' || role === 'KALITE') &&
        file.status === 'IN_QUALITY' &&
        hasActiveTimer
      );

    case 'SEND_TO_PRODUCTION':
      return (
        (role === 'ADMIN' || role === 'KOLAJ') &&
        file.status === 'IN_KOLAJ' &&
        hasActiveTimer
      );

    case 'ADD_NOTE':
      return file.status !== 'SENT_TO_PRODUCTION';

    case 'TRANSFER':
      return hasActiveTimer && file.currentDepartmentId === departmentId;

    default:
      return false;
  }
}

/**
 * Get available actions for a user on a file
 */
export function getAvailableActions(
  user: SessionUser,
  file: {
    status: FileStatus;
    assignedDesignerId: string | null;
    currentDepartmentId: string;
    pendingTakeover: boolean;
    requiresApproval: boolean;
  },
  hasActiveTimer: boolean = false
): WorkflowAction[] {
  const actions: WorkflowAction[] = [];

  const allActions: WorkflowAction[] = [
    'ASSIGN',
    'TAKEOVER',
    'REQUEST_APPROVAL',
    'DIRECT_TO_QUALITY',
    'SEND_TO_CUSTOMER',
    'CUSTOMER_OK',
    'CUSTOMER_NOK',
    'RESTART_MG',
    'QUALITY_OK',
    'QUALITY_NOK',
    'SEND_TO_PRODUCTION',
    'ADD_NOTE',
  ];

  for (const action of allActions) {
    if (canPerformAction(user, action, file, hasActiveTimer)) {
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Validate state transition
 */
export function isValidTransition(from: FileStatus, to: FileStatus): boolean {
  const validTransitions: Record<FileStatus, FileStatus[]> = {
    AWAITING_ASSIGNMENT: ['ASSIGNED'],
    ASSIGNED: ['IN_REPRO'],
    IN_REPRO: ['APPROVAL_PREP', 'IN_QUALITY'],
    APPROVAL_PREP: ['CUSTOMER_APPROVAL'],
    CUSTOMER_APPROVAL: ['IN_QUALITY', 'REVISION_REQUIRED', 'APPROVAL_PREP'],
    REVISION_REQUIRED: ['IN_REPRO'],
    IN_QUALITY: ['IN_KOLAJ', 'REVISION_REQUIRED'],
    IN_KOLAJ: ['SENT_TO_PRODUCTION'],
    SENT_TO_PRODUCTION: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}
