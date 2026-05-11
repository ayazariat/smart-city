'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, X, CheckCircle, ChevronDown } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/useAuthStore';
import { Notification } from '@/types';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const BackButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  if (pathname === '/dashboard') return null;
  return (
    <button
      onClick={() => router.back()}
      className="btn secondary sm icon-only"
      style={{ marginRight: 8 }}
      title={t('common.back')}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
};

const NotificationBell = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const getNotifStyle = (type: string | undefined) => {
    if (!type) return { icon: Bell, color: 'text-gray-600' };
    const typeLower = type.toLowerCase();
    if (
      typeLower.includes('validated') ||
      typeLower.includes('resolved') ||
      typeLower.includes('closed')
    )
      return { icon: CheckCircle, color: 'text-emerald-600' };
    if (typeLower.includes('rejected') || typeLower.includes('reject'))
      return { icon: X, color: 'text-red-600' };
    if (typeLower.includes('assigned') || typeLower.includes('assign'))
      return { icon: ChevronDown, color: 'text-purple-600' };
    return { icon: Bell, color: 'text-gray-600' };
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return t('common.timeAgo.now');
    if (diff < 3600000)
      return t('common.timeAgo.minutes', { n: Math.floor(diff / 60000) });
    if (diff < 86400000)
      return t('common.timeAgo.hours', { n: Math.floor(diff / 3600000) });
    return t('common.timeAgo.days', { n: Math.floor(diff / 86400000) });
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif._id);
    if (notif.complaint?._id || notif.relatedId) {
      const id = notif.complaint?._id || notif.relatedId;
      if (user?.role === 'CITIZEN') {
        window.location.href = `/my-complaints/${id}`;
      } else {
        window.location.href = `/dashboard/complaints/${id}`;
      }
    }
    setDropdownOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNotifs = notifications.filter(
    (n) => new Date(n.createdAt) >= today
  );
  const earlierNotifs = notifications.filter(
    (n) => new Date(n.createdAt) < today
  );

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="relative p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
        title={t('sidebar.notifications')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold min-w-[20px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 animate-in slide-in-from-top-2 duration-200 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {t('notifications.title')}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary hover:underline"
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
            <Link
              href="/notifications"
              className="block mt-2 text-xs text-primary hover:underline"
            >
              {t('notifications.seeAll')}
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {todayNotifs.length > 0 && (
              <div>
                <h4 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('notifications.today')}
                </h4>
                {todayNotifs.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notif.isRead
                        ? 'border-l-4 border-blue-500 bg-blue-50'
                        : ''
                    }`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg bg-blue-100 flex-shrink-0 ${getNotifStyle(notif.type).color}`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">
                          {notif.message || notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {earlierNotifs.length > 0 && (
              <div>
                <h4 className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('notifications.earlier')}
                </h4>
                {earlierNotifs.slice(0, 5).map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notif.isRead
                        ? 'border-l-4 border-blue-500 bg-blue-50'
                        : ''
                    }`}
                    onClick={() => handleNotifClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg bg-blue-100 flex-shrink-0 ${getNotifStyle(notif.type).color}`}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 line-clamp-2">
                          {notif.message || notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelativeTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {notifications.length === 0 && (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500">{t('notifications.empty')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TopbarProps {
  title: string;
  rightContent?: React.ReactNode;
}

const Topbar: React.FC<TopbarProps> = ({ title, rightContent }) => {
  return (
    <div className="topbar">
      <div
        className="topbar-left"
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <BackButton />
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        <NotificationBell />
        {rightContent}
      </div>
    </div>
  );
};

export default Topbar;
