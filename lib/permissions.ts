export const PERMISSION_MODULES = [
  'roster',
  'kiosk',
  'events',
  'forms',
  'prayers',
  'notifications',
  'staff'
] as const;

export const PERMISSION_LEVELS = ['view', 'edit', 'manage'] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];
export type Permission = `${PermissionModule}_${PermissionLevel}`;

export const PERMISSION_MODULE_DETAILS: Record<PermissionModule, { label: string; description: string }> = {
  roster: {
    label: 'Roster',
    description: 'Teen roster access and record management.'
  },
  kiosk: {
    label: 'Kiosk',
    description: 'Attendance kiosk access.'
  },
  events: {
    label: 'Events',
    description: 'Event calendar access.'
  },
  forms: {
    label: 'Forms',
    description: 'Form builder and submissions.'
  },
  prayers: {
    label: 'Prayers',
    description: 'Prayer requests visibility and actions.'
  },
  notifications: {
    label: 'Notifications',
    description: 'Email and message sending.'
  },
  staff: {
    label: 'Staff',
    description: 'Staff roster and permissions.'
  }
};

export const PERMISSIONS = PERMISSION_MODULES.flatMap((module) =>
  PERMISSION_LEVELS.map((level) => `${module}_${level}` as Permission)
) as Permission[];

const LEGACY_PERMISSION_MAP: Record<string, Permission> = {
  roster: 'roster_manage',
  kiosk: 'kiosk_manage',
  events: 'events_manage',
  forms: 'forms_manage',
  prayers: 'prayers_manage',
  notifications: 'notifications_manage',
  staff: 'staff_manage'
};

const LEVEL_RANK: Record<PermissionLevel, number> = {
  view: 1,
  edit: 2,
  manage: 3
};

export const PERMISSION_DETAILS: Record<Permission, { label: string; description: string }> = {
  roster_view: {
    label: 'Roster · View',
    description: 'View teen lists and profiles.'
  },
  roster_edit: {
    label: 'Roster · Edit',
    description: 'Edit teen registrations and attendance notes.'
  },
  roster_manage: {
    label: 'Roster · Manage',
    description: 'Archive, restore, or delete teen records.'
  },
  kiosk_view: {
    label: 'Kiosk · View',
    description: 'View the kiosk list and attendance status.'
  },
  kiosk_edit: {
    label: 'Kiosk · Edit',
    description: 'Check teens in and out on the kiosk.'
  },
  kiosk_manage: {
    label: 'Kiosk · Manage',
    description: 'Configure kiosk settings and bulk actions.'
  },
  events_view: {
    label: 'Events · View',
    description: 'View the events calendar.'
  },
  events_edit: {
    label: 'Events · Edit',
    description: 'Create and edit event details.'
  },
  events_manage: {
    label: 'Events · Manage',
    description: 'Delete events and manage event settings.'
  },
  forms_view: {
    label: 'Forms · View',
    description: 'View form submissions and templates.'
  },
  forms_edit: {
    label: 'Forms · Edit',
    description: 'Create and update custom forms.'
  },
  forms_manage: {
    label: 'Forms · Manage',
    description: 'Delete forms and manage form settings.'
  },
  prayers_view: {
    label: 'Prayers · View',
    description: 'View prayer requests.'
  },
  prayers_edit: {
    label: 'Prayers · Edit',
    description: 'Respond to or update prayer requests.'
  },
  prayers_manage: {
    label: 'Prayers · Manage',
    description: 'Delete requests and manage prayer settings.'
  },
  notifications_view: {
    label: 'Notifications · View',
    description: 'View notification history.'
  },
  notifications_edit: {
    label: 'Notifications · Edit',
    description: 'Draft and send notifications.'
  },
  notifications_manage: {
    label: 'Notifications · Manage',
    description: 'Manage notification templates and settings.'
  },
  staff_view: {
    label: 'Staff · View',
    description: 'View the staff roster and profiles.'
  },
  staff_edit: {
    label: 'Staff · Edit',
    description: 'Edit staff profile details.'
  },
  staff_manage: {
    label: 'Staff · Manage',
    description: 'Invite staff and change permissions.'
  }
};

const parsePermission = (permission: Permission) => {
  const [module, level] = permission.split('_') as [PermissionModule, PermissionLevel];
  return { module, level };
};

export function normalizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => {
      if (typeof entry !== 'string') return null;
      if ((PERMISSIONS as readonly string[]).includes(entry)) return entry as Permission;
      return LEGACY_PERMISSION_MAP[entry] ?? null;
    })
    .filter(Boolean) as Permission[];

  return Array.from(new Set(normalized));
}

export function hasPermission(permissions: Permission[], required: Permission): boolean {
  const { module: requiredModule, level: requiredLevel } = parsePermission(required);
  const requiredRank = LEVEL_RANK[requiredLevel];

  return permissions.some((permission) => {
    const { module, level } = parsePermission(permission);
    if (module !== requiredModule) return false;
    return LEVEL_RANK[level] >= requiredRank;
  });
}
