'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  XCircle,
  UserCheck,
  Wrench,
  Loader2,
  Check,
  CheckCheck,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import { useAuthStore } from '@/store/useAuthStore';
import { Notification } from '@/types';
import { useTranslation } from 'react-i18next';

// Map notification type → icon + color
function getNotifStyle(type?: string): {
  icon: typeof Bell;
  color: string;
  bg: string;
} {
  const t = (type || '').toLowerCase();
  if (t.includes('validated') || t.includes('approved') || t.includes('closed'))
    return {
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
    };
  if (t.includes('rejected') || t.includes('reject'))
    return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
  if (t.includes('assigned') || t.includes('assignment'))
    return { icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-100' };
  if (t.includes('progress') || t.includes('in_progress'))
    return { icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-100' };
  if (t.includes('resolved') || t.includes('resolution'))
    return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
  if (t.includes('submitted') || t.includes('new_complaint'))
    return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' };
  if (t.includes('warning') || t.includes('alert'))
    return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' };
  return { icon: Bell, color: 'text-primary', bg: 'bg-primary/10' };
}

function formatRelativeTime(
  date: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t('time.justNow', { defaultValue: 'Just now' });
  if (minutes < 60)
    return t('time.minutesAgo', {
      count: minutes,
      defaultValue: `${minutes}m ago`,
    });
  if (hours < 24)
    return t('time.hoursAgo', { count: hours, defaultValue: `${hours}h ago` });
  return t('time.daysAgo', { count: days, defaultValue: `${days}d ago` });
}

interface NotificationsPanelProps {
  maxItems?: number;
  role: string;
}

export default function NotificationsPanel({
  maxItems = 8,
  role,
}: NotificationsPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationService.getNotifications(),
        notificationService.getNotificationCount(),
      ]);
      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data.slice(0, maxItems));
      }
      if (countRes.success && typeof countRes.count === 'number') {
        setUnreadCount(countRes.count);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    await notificationService.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const getComplaintLink = (notif: Notification) => {
    const id = notif.complaint?._id || notif.relatedId;
    if (!id) return null;
    if (role === 'CITIZEN') return `/my-complaints/${id}`;
    return `/dashboard/complaints/${id}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {t('dashboard.notifications', { defaultValue: 'Notifications' })}
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              title={t('dashboard.markAllRead', {
                defaultValue: 'Mark all as read',
              })}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {t('dashboard.markAllRead', { defaultValue: 'Mark all read' })}
              </span>
            </button>
          )}
          <Link
            href="/notifications"
            className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center gap-1"
          >
            {t('dashboard.seeAll', { defaultValue: 'See all' })}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Bell className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-500">
              {t('dashboard.noNotifications', {
                defaultValue: 'No notifications yet',
              })}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {role === 'CITIZEN'
                ? t('dashboard.noNotifCitizen', {
                    defaultValue:
                      "You'll be notified when your complaint status changes.",
                  })
                : t('dashboard.noNotifStaff', {
                    defaultValue:
                      'New complaints and updates will appear here.',
                  })}
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const style = getNotifStyle(notif.type);
            const Icon = style.icon;
            const link = getComplaintLink(notif);
            const title =
              !notif.title || notif.title.startsWith('notification.')
                ? notif.message
                : notif.title;
            const message =
              notif.message && !notif.message.startsWith('notification.')
                ? notif.message
                : undefined;

            const content = (
              <div
                className={`flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50 cursor-pointer ${
                  !notif.isRead ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  if (!notif.isRead) handleMarkRead(notif._id);
                }}
              >
                {/* Unread dot */}
                <div
                  className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 transition-colors ${
                    !notif.isRead ? 'bg-primary' : 'bg-transparent'
                  }`}
                />
                {/* Icon */}
                <div
                  className={`w-9 h-9 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${style.color}`} />
                </div>
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-tight line-clamp-2 ${
                      !notif.isRead
                        ? 'font-semibold text-slate-800'
                        : 'font-medium text-slate-700'
                    }`}
                  >
                    {title}
                  </p>
                  {message && message !== title && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {message}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatRelativeTime(notif.createdAt, t)}
                  </p>
                </div>
                {/* Mark read button */}
                {!notif.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(notif._id);
                    }}
                    className="p-1.5 hover:bg-slate-200 rounded-lg flex-shrink-0 transition-colors"
                    title={t('dashboard.markRead', {
                      defaultValue: 'Mark as read',
                    })}
                  >
                    <Check className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            );

            return (
              <div key={notif._id}>
                {link ? (
                  <Link href={link} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
