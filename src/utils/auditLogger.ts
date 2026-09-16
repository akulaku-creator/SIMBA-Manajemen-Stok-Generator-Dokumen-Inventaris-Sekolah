import { AuditLog, AuditAction, UserRole } from '../types';

const AUDIT_STORAGE_KEY = 'simba_audit_logs';

export const getAuditLogs = (): AuditLog[] => {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse audit logs:', err);
    return [];
  }
};

export const saveAuditLogs = (logs: AuditLog[]): void => {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save audit logs:', err);
  }
};

export const logAuditEvent = (params: {
  userId: string;
  username: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction | string;
  title: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  meta?: Record<string, unknown>;
}): AuditLog => {
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(now);

  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now.toISOString(),
    formattedDate,
    userId: params.userId,
    username: params.username,
    userName: params.userName,
    userRole: params.userRole,
    action: params.action,
    title: params.title,
    details: params.details,
    status: params.status,
    meta: params.meta
  };

  const current = getAuditLogs();
  // Keep the latest 200 logs
  const updated = [newLog, ...current].slice(0, 200);
  saveAuditLogs(updated);

  return newLog;
};

export const clearAuditLogs = (): void => {
  localStorage.removeItem(AUDIT_STORAGE_KEY);
};

export const exportAuditLogsToJSON = (): void => {
  const logs = getAuditLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Audit_Log_SIMBA_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
