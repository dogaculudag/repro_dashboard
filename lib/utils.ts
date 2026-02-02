import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatInTimeZone } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Timezone configuration
const TIMEZONE = 'Europe/Istanbul';

// Date formatting utilities
export function formatDisplayDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'dd.MM.yyyy HH:mm');
}

export function formatDisplayDateOnly(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'dd.MM.yyyy');
}

export function formatDisplayTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TIMEZONE, 'HH:mm:ss');
}

// Duration formatting
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}s ${minutes}d ${secs}sn`;
  } else if (minutes > 0) {
    return `${minutes}d ${secs}sn`;
  }
  return `${secs}sn`;
}

export function formatDurationShort(seconds: number): string {
  if (seconds < 0) seconds = 0;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}s ${minutes}d`;
  }
  return `${minutes}d`;
}

// Calculate elapsed seconds from start time
export function calculateElapsedSeconds(startTime: Date): number {
  return Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
}

// Calculate duration between two dates
export function calculateDuration(startTime: Date, endTime: Date): number {
  return Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
}

// Status display utilities
export const STATUS_LABELS: Record<string, string> = {
  AWAITING_ASSIGNMENT: 'Atama Bekliyor',
  ASSIGNED: 'Atandı',
  IN_REPRO: 'Tasarımda',
  APPROVAL_PREP: 'Onay Hazırlığı',
  CUSTOMER_APPROVAL: 'Müşteri Onayı',
  REVISION_REQUIRED: 'Revizyon Gerekli',
  IN_QUALITY: 'Kalite Kontrolde',
  IN_KOLAJ: 'Kolajda',
  SENT_TO_PRODUCTION: 'Üretime Gönderildi',
};

export const STATUS_COLORS: Record<string, string> = {
  AWAITING_ASSIGNMENT: 'bg-gray-100 text-gray-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_REPRO: 'bg-purple-100 text-purple-800',
  APPROVAL_PREP: 'bg-yellow-100 text-yellow-800',
  CUSTOMER_APPROVAL: 'bg-orange-100 text-orange-800',
  REVISION_REQUIRED: 'bg-red-100 text-red-800',
  IN_QUALITY: 'bg-cyan-100 text-cyan-800',
  IN_KOLAJ: 'bg-indigo-100 text-indigo-800',
  SENT_TO_PRODUCTION: 'bg-green-100 text-green-800',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Yönetici',
  ONREPRO: 'Ön Repro',
  GRAFIKER: 'Grafiker',
  KALITE: 'Kalite',
  KOLAJ: 'Kolaj',
};

export const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Oluşturuldu',
  ASSIGN: 'Atandı',
  TAKEOVER: 'Devralındı',
  TRANSFER: 'Transfer Edildi',
  CUSTOMER_SENT: 'Müşteriye Gönderildi',
  CUSTOMER_OK: 'Müşteri Onayladı',
  CUSTOMER_NOK: 'Müşteri Reddetti',
  QUALITY_OK: 'Kalite Onayladı',
  QUALITY_NOK: 'Kalite Reddetti',
  RESTART_MG: 'MG Yeniden Başlatıldı',
  CLOSE: 'Kapatıldı',
  OVERRIDE: 'Yönetici Müdahalesi',
  LOCATION_UPDATE: 'Konum Güncellendi',
  NOTE_ADDED: 'Not Eklendi',
  STATUS_CHANGE: 'Durum Değişti',
};
