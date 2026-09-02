import React from 'react';
import {
  Users,
  Bus,
  DollarSign,
  TrendingUp,
  CreditCard,
  UserCheck,
  QrCode,
  PlusCircle,
  FileText,
  PieChart,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Send,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Student, DriverInfo, ExpenseItem, TripSettings } from '../types';

interface DashboardProps {
  students: Student[];
  drivers: DriverInfo[];
  expenses: ExpenseItem[];
  settings: TripSettings;
  onNavigate: (tab: string) => void;
  onOpenQRScanner: () => void;
  onOpenWhatsAppReminder?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  drivers,
  expenses,
  settings,
  onNavigate,
  onOpenQRScanner,
  onOpenWhatsAppReminder,
}) => {
  // Calculations
  const totalReserved = students.length;
  const totalCapacity = settings.totalSeats || 50;
  const occupancyPercent = Math.min(100, Math.round((totalReserved / totalCapacity) * 100));

  const maleCount = students.filter((s) => s.gender === 'male').length;
  const femaleCount = students.filter((s) => s.gender === 'female').length;

  // Participant Roles Breakdown
  const studentRoleCount = students.filter((s) => !s.participantRole || s.participantRole === 'student').length;
  const organizerCount = students.filter((s) => s.participantRole === 'organizer').length;
  const mediaCount = students.filter((s) => s.participantRole === 'photographer').length;
  const djCount = students.filter((s) => s.participantRole === 'dj').length;
  const supervisorCount = students.filter((s) => s.participantRole === 'supervisor').length;
  const staffCount = students.filter((s) => s.participantRole === 'staff').length;
  const totalStaffCount = organizerCount + mediaCount + djCount + supervisorCount + staffCount;

  const totalRevenueExpected = students.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalCollected = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const totalRemaining = students.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalCollected - totalExpenses;
  const expectedFinalProfit = totalRevenueExpected - totalExpenses;

  const checkedInDepartureCount = students.filter((s) => s.checkInDeparture).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-72 sm:w-96 h-72 sm:h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ملخص الفعالية الحالي
                </span>
                <span className="text-slate-400 text-[11px] sm:text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {settings.tripDate}
                </span>
                {settings.destination && (
                  <span className="text-cyan-300 text-[11px] sm:text-xs flex items-center gap-1 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md font-medium">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    {settings.destination}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                {settings.tripName}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                إدارة شاملة لشركة كيان: <strong className="text-amber-400">{totalReserved}</strong> طالب مسجل من أصل <strong className="text-white">{totalCapacity}</strong> مقعد.
              </p>
            </div>
          </div>

          {/* Quick Action Grid (Optimized for mobile single/2-column tap) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
            <button
              onClick={onOpenQRScanner}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black p-2.5 sm:py-3 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>مسح QR للتحضير</span>
            </button>

            <button
              onClick={() => onNavigate('students')}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold p-2.5 sm:py-3 sm:px-4 rounded-xl text-xs sm:text-sm border border-slate-700 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span>إضافة طالب</span>
            </button>

            {onOpenWhatsAppReminder && (
              <button
                onClick={onOpenWhatsAppReminder}
                className="col-span-2 sm:col-span-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold p-2.5 sm:py-3 sm:px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
                title="إرسال تذكير موحد عبر واتساب"
              >
                <Send className="w-4 h-4 text-indigo-200 animate-pulse shrink-0" />
                <span>إرسال تذكير واتساب 📢</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 1: Core Trip Metrics (2x2 Grid on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Seats Occupancy */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">نسبة الحجز والمقاعد</p>
              <h3 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                {totalReserved} <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ {totalCapacity}</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
              <Bus className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1.5">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 font-medium">
              <span>{occupancyPercent}% مكتمل</span>
              <span>متبقي {Math.max(0, totalCapacity - totalReserved)}</span>
            </div>
          </div>
        </div>

        {/* Male & Female Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">توزيع الجنسين</p>
              <h3 className="text-lg sm:text-2xl font-black text-white mt-0.5">
                {maleCount + femaleCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">طالب</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-slate-950/70 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] sm:text-xs text-blue-400 block font-bold">ذكور</span>
              <span className="text-sm sm:text-lg font-black text-white">{maleCount}</span>
            </div>
            <div className="bg-slate-950/70 p-1.5 sm:p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] sm:text-xs text-pink-400 block font-bold">إناث</span>
              <span className="text-sm sm:text-lg font-black text-white">{femaleCount}</span>
            </div>
          </div>
        </div>

        {/* Departure Check-In Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">تحضير التحرك</p>
              <h3 className="text-lg sm:text-2xl font-black text-emerald-400 mt-0.5">
                {checkedInDepartureCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ {totalReserved}</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-300 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span>الغياب:</span>
            <span className="font-bold text-rose-400">{Math.max(0, totalReserved - checkedInDepartureCount)} طالب</span>
          </div>
        </div>

        {/* Net Profit Fast Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-semibold">صافي الربح الحالي</p>
              <h3 className={`text-lg sm:text-2xl font-black mt-0.5 ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netProfit.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-slate-300">ج.م</span>
              </h3>
            </div>
            <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
            <span>المتوقع:</span>
            <span className="font-bold text-slate-200">{expectedFinalProfit.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Participant Categories & Staff Allocation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-3.5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span>توزيع صفات الحجز وطاقم الفعالية</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {studentRoleCount} طلاب + {totalStaffCount} منظمين وطاقم وميديا
            </p>
          </div>
          <button
            onClick={() => onNavigate('students')}
            className="text-[11px] sm:text-xs text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl transition cursor-pointer self-start sm:self-auto"
          >
            إدارة الحجوزات ←
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-slate-800 text-center">
            <span className="text-indigo-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">🎓 طلاب</span>
            <span className="text-sm sm:text-lg font-black text-white">{studentRoleCount}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-amber-500/30 text-center">
            <span className="text-amber-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">👑 منظمون</span>
            <span className="text-sm sm:text-lg font-black text-amber-300">{organizerCount}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-cyan-500/30 text-center">
            <span className="text-cyan-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">📸 ميديا</span>
            <span className="text-sm sm:text-lg font-black text-cyan-300">{mediaCount}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-purple-500/30 text-center">
            <span className="text-purple-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">🎧 DJ</span>
            <span className="text-sm sm:text-lg font-black text-purple-300">{djCount}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-emerald-500/30 text-center">
            <span className="text-emerald-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">🛡️ مشرفو باص</span>
            <span className="text-sm sm:text-lg font-black text-emerald-300">{supervisorCount}</span>
          </div>
          <div className="bg-slate-950 p-2 sm:p-3 rounded-xl border border-sky-500/30 text-center">
            <span className="text-sky-400 font-bold block text-[10px] sm:text-xs mb-0.5 truncate">🛠️ طاقم</span>
            <span className="text-sm sm:text-lg font-black text-sky-300">{staffCount}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Financial Metrics Grid (2x2 Grid on mobile) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex justify-between items-center gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span>المؤشرات المالية للرحلة</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">ملخص الإيرادات والمصروفات والتحصيل</p>
          </div>
          <button
            onClick={() => onNavigate('financials')}
            className="text-[11px] sm:text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition cursor-pointer"
          >
            <span>التفاصيل</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800">
            <span className="text-[10px] sm:text-xs text-slate-400 block mb-1">الإيرادات المتوقعة</span>
            <span className="text-sm sm:text-xl font-black text-white">{(totalRevenueExpected ?? 0).toLocaleString()} ج.م</span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">{students.length} تذكرة</p>
          </div>

          <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-emerald-900/40">
            <span className="text-[10px] sm:text-xs text-emerald-400 block mb-1">المبالغ المحصلة</span>
            <span className="text-sm sm:text-xl font-black text-emerald-400">{(totalCollected ?? 0).toLocaleString()} ج.م</span>
            <p className="text-[9px] sm:text-[10px] text-emerald-500/80 mt-1">
              تحصيل {totalRevenueExpected ? Math.round((totalCollected / totalRevenueExpected) * 100) : 0}%
            </p>
          </div>

          <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-rose-900/40">
            <span className="text-[10px] sm:text-xs text-rose-400 block mb-1">المتبقي للتحصيل</span>
            <span className="text-sm sm:text-xl font-black text-rose-400">{(totalRemaining ?? 0).toLocaleString()} ج.م</span>
            <p className="text-[9px] sm:text-[10px] text-rose-500/80 mt-1">مستحق قبل الصعود</p>
          </div>

          <div className="bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-amber-900/40">
            <span className="text-[10px] sm:text-xs text-amber-400 block mb-1">المصروفات المدفوعة</span>
            <span className="text-sm sm:text-xl font-black text-amber-400">{(totalExpenses ?? 0).toLocaleString()} ج.م</span>
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1">المصروفات المسجلة</p>
          </div>
        </div>
      </div>

      {/* Row 3: Bus Completion Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex justify-between items-center gap-2 mb-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 shrink-0" />
              <span>حالة الحافلات والتسكين</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">توزيع الطلاب والسائقين والمشرفين</p>
          </div>
          <button
            onClick={() => onNavigate('buses')}
            className="text-[11px] sm:text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition cursor-pointer"
          >
            <span>التسكين</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {drivers.map((driver) => {
            const busStudents = students.filter((s) => s.busNumber === driver.busNumber);
            const count = busStudents.length;
            const percent = Math.round((count / (driver.capacity || 50)) * 100);
            const checkedIn = busStudents.filter((s) => s.checkInDeparture).length;

            return (
              <div
                key={driver.busNumber}
                className="bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition rounded-xl p-3.5 sm:p-4 space-y-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow shrink-0">
                      {driver.busNumber}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">حافلة رقم {driver.busNumber}</h4>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{driver.driverName || 'سائق'}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      percent >= 100
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {count}/{driver.capacity} ({percent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div
                    className={`h-1.5 sm:h-2 rounded-full transition-all ${
                      percent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 pt-1 border-t border-slate-900">
                  <span className="truncate">المشرف: <strong className="text-slate-200">{driver.supervisorName || 'غير محدد'}</strong></span>
                  <span className="text-emerald-400 font-semibold shrink-0">حضر: {checkedIn}/{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4: Shortcuts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <button
          onClick={() => onNavigate('contracts')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 sm:p-4 rounded-xl text-right transition group cursor-pointer active:scale-95"
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mb-1.5 group-hover:scale-110 transition" />
          <h4 className="text-xs sm:text-sm font-bold text-white">مركز العقود</h4>
          <p className="text-[10px] sm:text-xs text-slate-400">العقود الـ 7 وPDF</p>
        </button>

        <button
          onClick={() => onNavigate('logistics')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 sm:p-4 rounded-xl text-right transition group cursor-pointer active:scale-95"
        >
          <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 mb-1.5 group-hover:scale-110 transition" />
          <h4 className="text-xs sm:text-sm font-bold text-white">اللوجستيات والمخزون</h4>
          <p className="text-[10px] sm:text-xs text-slate-400">المشروبات والبراندنج</p>
        </button>

        <button
          onClick={() => onNavigate('timeline')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 sm:p-4 rounded-xl text-right transition group cursor-pointer active:scale-95"
        >
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mb-1.5 group-hover:scale-110 transition" />
          <h4 className="text-xs sm:text-sm font-bold text-white">الجدول الزمني</h4>
          <p className="text-[10px] sm:text-xs text-slate-400">مواعيد فعاليات اليوم</p>
        </button>

        <button
          onClick={() => onNavigate('portal')}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 p-3 sm:p-4 rounded-xl text-right transition group cursor-pointer active:scale-95"
        >
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 mb-1.5 group-hover:scale-110 transition" />
          <h4 className="text-xs sm:text-sm font-bold text-white">بوابة الميديا</h4>
          <p className="text-[10px] sm:text-xs text-slate-400">رابط الصور والتذاكر</p>
        </button>
      </div>
    </div>
  );
};
