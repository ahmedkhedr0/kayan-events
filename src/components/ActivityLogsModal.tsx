import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
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
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
  DollarSign,
  UserPlus,
  Users,
  Compass,
  BellRing,
  FileText,
  Printer,
  Sparkles,
  KeyRound,
  Filter,
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
  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | 'field' | 'students' | 'financial' | 'auth' | 'trips'>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedUserRole, setSelectedUserRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedBus, setSelectedBus] = useState<string>('all');
  const [selectedTimeSpan, setSelectedTimeSpan] = useState<'all' | 'today' | '24h' | '7days'>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Distinct values for filtering
  const distinctUsers = useMemo(() => Array.from(new Set(logs.map((l) => l.userName))).filter(Boolean), [logs]);
  const distinctBuses = useMemo(() => {
    const busNumbers: number[] = logs
      .map((l) => l.busNumber)
      .filter((b): b is number => typeof b === 'number' && b > 0);
    return Array.from(new Set(busNumbers)).sort((a, b) => a - b);
  }, [logs]);

  // KPIs & Stats calculation
  const stats = useMemo(() => {
    const total = logs.length;
    const fieldOps = logs.filter((l) =>
      ['checkin_departure', 'checkin_return', 'deliver_tshirt', 'tshirt_delivery', 'deliver_meal', 'meal_delivery', 'seat_change', 'seat_transfer', 'bus_transfer'].includes(
        l.actionType
      )
    ).length;
    const studentOps = logs.filter((l) =>
      ['student_add', 'student_register', 'student_update', 'student_delete'].includes(l.actionType)
    ).length;
    const financialOps = logs.filter((l) =>
      ['expense_add', 'expense_update', 'expense_delete', 'treasury_transfer', 'treasury_deposit', 'treasury_withdraw', 'contract_add', 'receipt_add'].includes(
        l.actionType
      )
    ).length;
    const securityOps = logs.filter((l) => ['login', 'login_blocked', 'staff_update'].includes(l.actionType)).length;
    const uniqueOperators = new Set(logs.map((l) => l.userName)).size;

    return { total, fieldOps, studentOps, financialOps, securityOps, uniqueOperators };
  }, [logs]);

  // Filtering Logic
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const todayDateString = new Date().toISOString().split('T')[0];

    return logs.filter((log) => {
      // Category Tab Filter
      if (activeCategoryTab === 'field') {
        const isField = ['checkin_departure', 'checkin_return', 'deliver_tshirt', 'tshirt_delivery', 'deliver_meal', 'meal_delivery', 'seat_change', 'seat_transfer', 'bus_transfer'].includes(
          log.actionType
        );
        if (!isField) return false;
      } else if (activeCategoryTab === 'students') {
        const isStudent = ['student_add', 'student_register', 'student_update', 'student_delete', 'seat_change', 'seat_transfer'].includes(
          log.actionType
        );
        if (!isStudent) return false;
      } else if (activeCategoryTab === 'financial') {
        const isFin = ['expense_add', 'expense_update', 'expense_delete', 'treasury_transfer', 'treasury_deposit', 'treasury_withdraw', 'contract_add', 'receipt_add'].includes(
          log.actionType
        );
        if (!isFin) return false;
      } else if (activeCategoryTab === 'auth') {
        const isAuth = ['login', 'login_blocked', 'staff_update'].includes(log.actionType);
        if (!isAuth) return false;
      } else if (activeCategoryTab === 'trips') {
        const isTrip = ['trip_create', 'trip_switch', 'trip_status_change', 'trip_delete', 'broadcast_notice', 'system'].includes(
          log.actionType
        );
        if (!isTrip) return false;
      }

      // Action Type Filter
      if (selectedActionType !== 'all' && log.actionType !== selectedActionType) return false;

      // User Role Filter
      if (selectedUserRole !== 'all' && log.userRole !== selectedUserRole) return false;

      // Specific User Filter
      if (selectedUser !== 'all' && log.userName !== selectedUser) return false;

      // Bus Filter
      if (selectedBus !== 'all') {
        if (selectedBus === 'none' && log.busNumber !== undefined) return false;
        if (selectedBus !== 'none' && String(log.busNumber) !== selectedBus) return false;
      }

      // Time Filter
      const logTime = typeof log.timestamp === 'number' ? log.timestamp : new Date(log.timestamp).getTime();
      if (selectedTimeSpan === 'today') {
        if (log.dateString !== todayDateString) return false;
      } else if (selectedTimeSpan === '24h') {
        if (now - logTime > oneDayMs) return false;
      } else if (selectedTimeSpan === '7days') {
        if (now - logTime > sevenDaysMs) return false;
      }

      // Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchTitle = log.actionTitle?.toLowerCase().includes(term);
        const matchDetails = log.details?.toLowerCase().includes(term);
        const matchUser = log.userName?.toLowerCase().includes(term);
        const matchTarget = log.targetName?.toLowerCase().includes(term);
        const matchId = log.id?.toLowerCase().includes(term);
        const matchTrip = log.tripName?.toLowerCase().includes(term);
        if (!matchTitle && !matchDetails && !matchUser && !matchTarget && !matchId && !matchTrip) {
          return false;
        }
      }

      return true;
    });
  }, [
    logs,
    activeCategoryTab,
    selectedActionType,
    selectedUserRole,
    selectedUser,
    selectedBus,
    selectedTimeSpan,
    searchTerm,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setActiveCategoryTab('all');
    setSelectedActionType('all');
    setSelectedUserRole('all');
    setSelectedUser('all');
    setSelectedBus('all');
    setSelectedTimeSpan('all');
  };

  const hasActiveCustomFilters =
    selectedTimeSpan !== 'all' || selectedUser !== 'all' || selectedBus !== 'all';

  // Toggle JSON Technical inspection
  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Copy Log ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedLogId(id);
    setTimeout(() => {
      setCopiedLogId(null);
    }, 2000);
  };

  // Visual Badges
  const getActionBadge = (type: ActivityActionType) => {
    switch (type) {
      case 'login':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          accent: 'border-r-emerald-500',
          icon: ShieldCheck,
          label: 'تسجيل دخول موظف 🔐',
          tagColor: 'text-emerald-400',
        };
      case 'login_blocked':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          accent: 'border-r-rose-500',
          icon: AlertTriangle,
          label: 'محاولة دخول محظورة ⛔',
          tagColor: 'text-rose-400',
        };
      case 'staff_update':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          accent: 'border-r-amber-500',
          icon: KeyRound,
          label: 'تعديل صلاحيات وموظفين 🔑',
          tagColor: 'text-amber-400',
        };
      case 'checkin_departure':
        return {
          bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          accent: 'border-r-indigo-500',
          icon: CheckCircle2,
          label: 'صعود الذهاب 🚌',
          tagColor: 'text-indigo-400',
        };
      case 'checkin_return':
        return {
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          accent: 'border-r-purple-500',
          icon: CheckCircle2,
          label: 'صعود العودة 🌙',
          tagColor: 'text-purple-400',
        };
      case 'deliver_tshirt':
      case 'tshirt_delivery':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          accent: 'border-r-amber-500',
          icon: Shirt,
          label: 'تسليم تيشرت 👕',
          tagColor: 'text-amber-400',
        };
      case 'deliver_meal':
      case 'meal_delivery':
        return {
          bg: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
          accent: 'border-r-fuchsia-500',
          icon: UtensilsCrossed,
          label: 'تسليم وجبة 🍱',
          tagColor: 'text-fuchsia-400',
        };
      case 'seat_change':
      case 'seat_transfer':
      case 'bus_transfer':
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          accent: 'border-r-cyan-500',
          icon: ArrowUpDown,
          label: 'تعديل مقعد / حافلة 🔄',
          tagColor: 'text-cyan-400',
        };
      case 'student_add':
      case 'student_register':
        return {
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          accent: 'border-r-blue-500',
          icon: UserPlus,
          label: 'تسجيل مشترك 👤',
          tagColor: 'text-blue-400',
        };
      case 'student_update':
        return {
          bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          accent: 'border-r-sky-500',
          icon: User,
          label: 'تحديث بيانات مشترك ✏️',
          tagColor: 'text-sky-400',
        };
      case 'student_delete':
        return {
          bg: 'bg-red-500/15 text-red-300 border-red-500/30',
          accent: 'border-r-red-500',
          icon: Trash2,
          label: 'حذف مشترك ❌',
          tagColor: 'text-red-400',
        };
      case 'treasury_transfer':
      case 'treasury_deposit':
      case 'treasury_withdraw':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          accent: 'border-r-emerald-500',
          icon: DollarSign,
          label: 'حركة خزنة مركزية 💰',
          tagColor: 'text-emerald-400',
        };
      case 'expense_add':
      case 'expense_update':
      case 'expense_delete':
        return {
          bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          accent: 'border-r-rose-500',
          icon: DollarSign,
          label: 'بند مصروفات 🧾',
          tagColor: 'text-rose-400',
        };
      case 'contract_add':
      case 'receipt_add':
        return {
          bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          accent: 'border-r-teal-500',
          icon: FileText,
          label: 'عقد / سند مالي 📑',
          tagColor: 'text-teal-400',
        };
      case 'trip_create':
      case 'trip_switch':
      case 'trip_status_change':
      case 'trip_delete':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          accent: 'border-r-amber-500',
          icon: Compass,
          label: 'إدارة الرحلات 🏕️',
          tagColor: 'text-amber-400',
        };
      case 'broadcast_notice':
        return {
          bg: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
          accent: 'border-r-violet-500',
          icon: BellRing,
          label: 'إشعار جماعي 📢',
          tagColor: 'text-violet-400',
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          accent: 'border-r-slate-500',
          icon: Activity,
          label: 'إجراء نظام عام',
          tagColor: 'text-slate-400',
        };
    }
  };

  const getRoleBadge = (role: AppUserRole) => {
    switch (role) {
      case 'admin':
        return { label: '👑 المدير العام', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'field_supervisor':
        return { label: '🚌 مشرف ميداني', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
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
      'معرف الحركة (ID)',
      'التاريخ',
      'الوقت الكامل',
      'اليوم',
      'اسم الموظف / المسؤول',
      'الرتبة / الصلاحية',
      'نوع الحركة (Action)',
      'عنوان الحركة',
      'التفاصيل والبيان',
      'اسم المشترك / المستهدف',
      'رقم الحافلة',
      'اسم الرحلة',
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id}"`,
      `"${log.dateString || ''}"`,
      `"${log.timeString || ''}"`,
      `"${log.dayName || ''}"`,
      `"${log.userName || ''}"`,
      `"${log.userRole || ''}"`,
      `"${log.actionType || ''}"`,
      `"${(log.actionTitle || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${(log.targetName || '').replace(/"/g, '""')}"`,
      `"${log.busNumber || ''}"`,
      `"${(log.tripName || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `kayan_audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print logs
  const handlePrintLogs = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-1 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[98dvh] sm:max-h-[92vh]">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER WITH HIGH-VISIBILITY CLOSE, EXPORT & RESET BUTTONS */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500/20 via-indigo-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-lg font-black text-white truncate">
                    سجل نشاط العمليات والرقابة
                  </h3>
                  <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                    KAYAN Audit
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  رصد حي للحضور، تسجيل الدخول، تسليم العهد والمصروفات
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="md:hidden flex items-center justify-center bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs p-2 rounded-xl border border-slate-700 shadow shrink-0"
              title="إغلاق السجل"
            >
              <X className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black text-xs px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-md shadow-emerald-950/60 border border-emerald-400/40"
              title="تصدير السجل إلى Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>تصدير Excel</span>
            </button>

            {onClearLogs && (
              <button
                onClick={() => setIsConfirmingClear(true)}
                disabled={logs.length === 0}
                className="bg-rose-950/80 hover:bg-rose-900 active:scale-95 disabled:opacity-40 disabled:pointer-events-none border border-rose-700/80 text-rose-200 font-bold text-xs px-2.5 sm:px-3.5 py-2 rounded-xl flex items-center justify-center gap-1 transition"
                title="تصفير ومسح السجل"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">تصفير</span>
              </button>
            )}

            <button
              onClick={handlePrintLogs}
              className="hidden sm:flex bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 py-2 rounded-xl border border-slate-700 items-center gap-1.5 transition"
              title="طباعة تقرير السجل"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="hidden md:flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 transition"
              title="إغلاق السجل"
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* Confirmation Banner for Clear */}
        {isConfirmingClear && (
          <div className="bg-rose-950/95 border-b border-rose-800 p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-rose-100 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>تأكيد الحذف: هل تريد حقاً تصفير ومسح جميع الحركات ({logs.length} حركة)؟</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  onClearLogs?.();
                  setIsConfirmingClear(false);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
              >
                نعم، مسح نهائي
              </button>
              <button
                onClick={() => setIsConfirmingClear(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STATS KPI RIBBON (COMPACT & MOBILE RESPONSIVE) */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/70 p-2 sm:p-3 border-b border-slate-800 grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2.5 shrink-0">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">إجمالي الحركات</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-white font-mono">{stats.total}</strong>
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">الميدان والتحضير</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-indigo-400 font-mono">{stats.fieldOps}</strong>
              <Bus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">المشتركين</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-blue-400 font-mono">{stats.studentOps}</strong>
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">الخزنة والمصروفات</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-emerald-400 font-mono">{stats.financialOps}</strong>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">الأمان والدخول</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-purple-400 font-mono">{stats.securityOps}</strong>
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">طاقم العمل</span>
            <div className="flex items-center justify-between mt-0.5">
              <strong className="text-xs sm:text-base font-black text-amber-300 font-mono">{stats.uniqueOperators} مسؤول</strong>
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CATEGORY TABS & ADVANCED SEARCH FILTERS */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/90 p-2.5 sm:p-3.5 border-b border-slate-800 space-y-2.5 shrink-0">
          {/* Category Tabs - Scrollable Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <button
              onClick={() => setActiveCategoryTab('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الكل ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('field')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'field'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>🚌 الميدان والتحضير ({stats.fieldOps})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('auth')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'auth'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🛡️ الأمان والدخول ({stats.securityOps})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('students')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'students'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>👥 المشتركين ({stats.studentOps})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('financial')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'financial'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>💰 الخزنة ({stats.financialOps})</span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('trips')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                activeCategoryTab === 'trips'
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>⛺ الرحلات</span>
            </button>
          </div>

          {/* Search bar & filter controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في السجل: اسم الموظف، الطالب، نوع الإجراء، أو التفاصيل..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-9 pl-8 py-2 text-xs focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute left-2.5 top-2 text-[10px] text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded-md"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Mobile Filter Expand Toggle */}
              <button
                onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
                className={`sm:hidden px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                  hasActiveCustomFilters || isMobileFiltersOpen
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>فلاتر</span>
                {hasActiveCustomFilters && (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </button>
            </div>

            {/* Dropdown Filters (Always visible on SM+, toggleable on mobile) */}
            <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1`}>
              {/* Time Span Filter */}
              <select
                value={selectedTimeSpan}
                onChange={(e) => setSelectedTimeSpan(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">📅 كل الفترات الزمنية</option>
                <option value="today">اليوم فقط</option>
                <option value="24h">آخر 24 ساعة</option>
                <option value="7days">آخر 7 أيام</option>
              </select>

              {/* User Filter */}
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">👤 كل الموظفين المنفذين</option>
                {distinctUsers.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>

              {/* Bus Filter */}
              <select
                value={selectedBus}
                onChange={(e) => setSelectedBus(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
              >
                <option value="all">🚌 كافة الحافلات</option>
                {distinctBuses.length > 0 ? (
                  distinctBuses.map((b) => (
                    <option key={b} value={String(b)}>
                      حافلة #{b}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="1">حافلة #1</option>
                    <option value="2">حافلة #2</option>
                    <option value="3">حافلة #3</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(searchTerm || activeCategoryTab !== 'all' || selectedTimeSpan !== 'all' || selectedUser !== 'all' || selectedBus !== 'all') && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
              <span>
                عرض <strong>{filteredLogs.length}</strong> من أصل <strong>{logs.length}</strong> حركة
              </span>
              <button
                onClick={handleResetFilters}
                className="text-amber-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                إعادة ضبط الفلاتر
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. DETAILED AUDIT TIMELINE */}
        {/* ========================================================================= */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar bg-slate-950/30">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-slate-500 space-y-3 max-w-md mx-auto px-4">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <Activity className="w-7 h-7 opacity-40" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">لا توجد حركات مطابقة</h4>
                <p className="text-xs text-slate-500 mt-1">
                  {logs.length === 0
                    ? 'سجل النشاط فارغ وجاهز لتسجيل العمليات وحركات الفريق الحية.'
                    : 'لا توجد حركات تطابق خيارات الفلترة المحددة في هذا القسم.'}
                </p>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  عرض كافة السجلات
                </button>
              )}
            </div>
          ) : (
            filteredLogs.map((log) => {
              const actionMeta = getActionBadge(log.actionType);
              const roleMeta = getRoleBadge(log.userRole);
              const ActionIcon = actionMeta.icon;
              const isExpanded = expandedLogIds.has(log.id);

              return (
                <div
                  key={log.id}
                  className={`bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-200 space-y-2.5 shadow-md relative overflow-hidden group border-r-4 ${actionMeta.accent}`}
                >
                  {/* Top Bar: User Name, Role, Action Type, Accurate Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {/* User Badge */}
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                        <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[9px] flex items-center justify-center">
                          {log.userName.slice(0, 1)}
                        </div>
                        <span className="text-white font-black text-xs">
                          {log.userName}
                        </span>
                      </div>

                      {/* Role Pill */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${roleMeta.bg}`}>
                        {roleMeta.label}
                      </span>

                      {/* Action Pill */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border flex items-center gap-1 ${actionMeta.bg}`}>
                        <ActionIcon className="w-3 h-3 shrink-0" />
                        <span>{actionMeta.label}</span>
                      </span>
                    </div>

                    {/* Accurate Timing Badge */}
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0 self-end sm:self-auto">
                      <span className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-amber-300 font-bold">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {log.timeString}
                      </span>
                      <span className="bg-slate-950/80 px-1.5 py-0.5 rounded-lg border border-slate-800 text-slate-400">
                        {log.dayName ? `${log.dayName}، ` : ''}{log.dateString}
                      </span>
                    </div>
                  </div>

                  {/* Action Title & Full Description */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                        <span className={actionMeta.tagColor}>●</span>
                        {log.actionTitle}
                      </h4>

                      {/* Copy ID Button */}
                      <button
                        onClick={() => handleCopyId(log.id)}
                        className="text-[9px] sm:text-[10px] text-slate-500 hover:text-slate-300 font-mono flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 transition shrink-0"
                        title="نسخ معرف الحركة"
                      >
                        {copiedLogId === log.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">تم</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>#{log.id.slice(-6)}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80 select-text break-words">
                      {log.details}
                    </p>
                  </div>

                  {/* Context Pills & Inspector Toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                      {log.targetName && (
                        <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1">
                          👤 المستهدف: <strong className="text-amber-300">{log.targetName}</strong>
                        </span>
                      )}
                      {log.busNumber && log.busNumber > 0 ? (
                        <span className="bg-indigo-950/70 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-800/50 font-mono font-bold flex items-center gap-1">
                          <Bus className="w-3 h-3" /> حافلة #{log.busNumber}
                        </span>
                      ) : null}
                      {log.tripName && (
                        <span className="bg-slate-950 text-slate-400 px-2 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1 max-w-[200px] truncate">
                          <Compass className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{log.tripName}</span>
                        </span>
                      )}
                    </div>

                    {/* Drill-down JSON & Technical Details Toggle */}
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="text-[10px] sm:text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 transition"
                    >
                      <span>{isExpanded ? 'إخفاء الفني' : 'تفاصيل فنية'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded Technical Inspector */}
                  {isExpanded && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 text-xs font-mono animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-bold text-amber-400">
                          <Sparkles className="w-3 h-3" /> بيانات التدقيق الفني (Audit Payload)
                        </span>
                        <span>ID: {log.id}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-300 pt-0.5">
                        <div>
                          <span className="text-slate-500">Timestamp: </span>
                          <span className="text-amber-300">{log.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Action Type: </span>
                          <span className="text-indigo-300 font-bold">{log.actionType}</span>
                        </div>
                        {log.targetId && (
                          <div>
                            <span className="text-slate-500">Target ID: </span>
                            <span className="text-emerald-300">{log.targetId}</span>
                          </div>
                        )}
                        {log.tripId && (
                          <div>
                            <span className="text-slate-500">Trip ID: </span>
                            <span className="text-blue-300">{log.tripId}</span>
                          </div>
                        )}
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                          <span className="text-[9px] text-slate-500 block mb-0.5">Metadata:</span>
                          <pre className="bg-slate-900 p-2 rounded text-[9px] text-emerald-300 overflow-x-auto custom-scrollbar">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. BOTTOM FOOTER WITH EXPLICIT CLOSE BUTTON & SYSTEM INFO */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-between sm:justify-start">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              نظام المراقبة والتدقيق الفوري متصل
            </span>
            <span className="text-slate-500 text-[11px]">
              المعروض: <strong className="text-white">{filteredLogs.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition active:scale-95 text-center flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>إغلاق السجل ✕</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
