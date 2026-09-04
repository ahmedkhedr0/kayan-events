import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  Bus,
  CheckCircle2,
  AlertTriangle,
  Shirt,
  UtensilsCrossed,
  ArrowUpDown,
  Download,
  Trash2,
  RefreshCw,
  Compass,
  X,
  FileSpreadsheet,
  SlidersHorizontal,
} from 'lucide-react';
import { ActivityLog, AppUserRole, ActivityActionType } from '../types';

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedUserRole, setSelectedUserRole] = useState<string>('all');
  const [selectedBus, setSelectedBus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');

  if (!isOpen) return null;

  // Distinct dates and user names for filtering
  const distinctDates = Array.from(new Set(logs.map((l) => l.dateString))).filter(Boolean);
  const distinctUsers = Array.from(new Set(logs.map((l) => l.userName))).filter(Boolean);

  const filteredLogs = logs.filter((log) => {
    // Action Type filter
    if (selectedActionType !== 'all' && log.actionType !== selectedActionType) return false;

    // User Role filter
    if (selectedUserRole !== 'all' && log.userRole !== selectedUserRole) return false;

    // Bus filter
    if (selectedBus !== 'all') {
      if (selectedBus === 'none' && log.busNumber !== undefined) return false;
      if (selectedBus !== 'none' && String(log.busNumber) !== selectedBus) return false;
    }

    // Date filter
    if (selectedDate !== 'all' && log.dateString !== selectedDate) return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchUser = log.userName.toLowerCase().includes(q);
      const matchTitle = log.actionTitle.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchTarget = (log.targetName || '').toLowerCase().includes(q);
      const matchTrip = (log.tripName || '').toLowerCase().includes(q);
      if (!matchUser && !matchTitle && !matchDetails && !matchTarget && !matchTrip) {
        return false;
      }
    }

    return true;
  });

  const getActionBadge = (type: ActivityActionType) => {
    switch (type) {
      case 'login':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: ShieldCheck,
          label: 'تسجيل دخول',
        };
      case 'login_blocked':
        return {
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          icon: AlertTriangle,
          label: 'محاولة محظورة',
        };
      case 'checkin_departure':
        return {
          bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          icon: CheckCircle2,
          label: 'صعود الذهاب',
        };
      case 'checkin_return':
        return {
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: CheckCircle2,
          label: 'صعود العودة',
        };
      case 'deliver_tshirt':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: Shirt,
          label: 'تسليم تيشرت',
        };
      case 'deliver_meal':
        return {
          bg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
          icon: UtensilsCrossed,
          label: 'تسليم وجبة',
        };
      case 'seat_change':
      case 'bus_transfer':
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          icon: ArrowUpDown,
          label: 'تعديل مقعد/باص',
        };
      case 'student_add':
      case 'student_update':
      case 'student_delete':
        return {
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          icon: User,
          label: 'بيانات المشتركين',
        };
      case 'treasury_transfer':
      case 'expense_add':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: Activity,
          label: 'ماليات وخزنة',
        };
      case 'staff_update':
        return {
          bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
          icon: ShieldCheck,
          label: 'إدارة الموظفين',
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Activity,
          label: 'إجراء عام',
        };
    }
  };

  const getRoleBadge = (role: AppUserRole) => {
    switch (role) {
      case 'admin':
        return { label: '👑 أدمن', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'field_supervisor':
        return { label: '📷 مشرف ميداني', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'pr_ticketing':
        return { label: '🎫 علاقات عامة', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      default:
        return { label: role, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'التاريخ',
      'الوقت',
      'اسم الموظف',
      'الصفة / الصلاحية',
      'نوع الإجراء',
      'عنوان الإجراء',
      'التفاصيل الكاملة',
      'الطرف المستهدف',
      'الرحلة',
      'رقم الحافلة',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.dateString}"`,
      `"${l.timeString}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.actionType}"`,
      `"${l.actionTitle.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.targetName || ''}"`,
      `"${l.tripName || ''}"`,
      `"${l.busNumber || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_نشاطات_موظفي_كيان_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-amber-500/20 border border-indigo-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  سجل نشاط الموظفين المتطور (Audit & Live Log)
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                  {filteredLogs.length} حركة مسجلة
                </span>
              </div>
              <p className="text-xs text-slate-400">
                متابعة لحظية ودقيقة بالاسم والتوقيت واليوم والتفاصيل لكل خطوة ينفذها فريق العمل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow"
              title="تصدير السجل إلى Excel / CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>
            {onClearLogs && (
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد من رغبتك في تفريغ وتصفير سجل النشاط؟')) {
                    onClearLogs();
                  }
                }}
                className="bg-rose-950 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-bold text-xs p-2 rounded-xl transition"
                title="مسح السجل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-slate-950/70 p-3 sm:p-4 border-b border-slate-800/80 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في السجل باسم الموظف، اسم الطالب، تفاصيل الحركة، أو الرحلة..."
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={selectedUserRole}
              onChange={(e) => setSelectedUserRole(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">كل الرتب والصلاحيات</option>
              <option value="admin">المدير العام (الأدمن)</option>
              <option value="field_supervisor">مشرف ميداني</option>
              <option value="pr_ticketing">علاقات عامة وحجوزات</option>
            </select>

            {/* Action Type Filter */}
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">كافة أنواع الإجراءات</option>
              <option value="login">تسجيلات الدخول</option>
              <option value="login_blocked">المحاولات المحظورة ⛔</option>
              <option value="checkin_departure">حضور الذهاب (التحرك)</option>
              <option value="checkin_return">حضور العودة (المساء)</option>
              <option value="deliver_tshirt">تسليم التيشرتات</option>
              <option value="deliver_meal">تسليم الوجبات</option>
              <option value="seat_change">تغيير وتبديل المقاعد</option>
              <option value="bus_transfer">نقل بين الحافلات</option>
              <option value="student_add">إضافة وحجز طالب</option>
              <option value="student_update">تعديل بيانات طالب</option>
              <option value="treasury_transfer">حركات الخزنة والماليات</option>
              <option value="staff_update">تعديلات طاقم الموظفين</option>
            </select>

            {/* Bus Filter */}
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">كل الحافلات</option>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <option key={b} value={String(b)}>
                  حافلة #{b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Logs Timeline List */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <Activity className="w-12 h-12 mx-auto text-slate-700 opacity-50" />
              <p className="text-sm font-bold">لا توجد حركات مسجلة تطابق معايير البحث والفلترة</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedActionType('all');
                  setSelectedUserRole('all');
                  setSelectedBus('all');
                  setSelectedDate('all');
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                إعادة ضبط الفلاتر 🔄
              </button>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const actionMeta = getActionBadge(log.actionType);
              const roleMeta = getRoleBadge(log.userRole);
              const ActionIcon = actionMeta.icon;

              return (
                <div
                  key={log.id}
                  className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 transition-all space-y-2 shadow-sm relative overflow-hidden group"
                >
                  {/* Colored indicator bar */}
                  <div
                    className={`absolute top-0 right-0 w-1.5 h-full ${
                      log.actionType === 'login_blocked'
                        ? 'bg-rose-500'
                        : log.actionType.includes('checkin')
                        ? 'bg-emerald-500'
                        : log.actionType.includes('deliver')
                        ? 'bg-amber-500'
                        : 'bg-indigo-500'
                    }`}
                  ></div>

                  {/* Top Row: User & Timestamp */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-xs sm:text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        {log.userName}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${roleMeta.bg}`}
                      >
                        {roleMeta.label}
                      </span>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 ${actionMeta.bg}`}
                      >
                        <ActionIcon className="w-3 h-3" />
                        {actionMeta.label}
                      </span>
                    </div>

                    {/* Timestamp & Date */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 text-slate-300">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {log.timeString}
                      </span>
                      <span className="hidden sm:inline bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800/60 text-slate-400">
                        {log.dateString}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Action Title & Detailed Description */}
                  <div className="space-y-1 pr-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                      {log.actionTitle}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans bg-slate-900/40 p-2 rounded-xl border border-slate-800/40">
                      {log.details}
                    </p>
                  </div>

                  {/* Bottom Row: Context tags (Trip, Bus, Target) */}
                  <div className="flex items-center gap-2 flex-wrap text-[10px] pt-1 pr-2">
                    {log.targetName && (
                      <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                        👤 المستهدف: <strong className="text-amber-300">{log.targetName}</strong>
                      </span>
                    )}
                    {log.busNumber && log.busNumber > 0 ? (
                      <span className="bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40 font-mono">
                        🚌 حافلة #{log.busNumber}
                      </span>
                    ) : null}
                    {log.tripName && (
                      <span className="bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px]">
                        🏕️ {log.tripName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
          <span>
            إجمالي الحركات المسجلة في الذاكرة: <strong className="text-white">{logs.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-1.5 rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
