import React, { useState } from 'react';
import {
  QrCode,
  Users,
  CheckCircle2,
  Phone,
  Search,
  Bus,
  Shirt,
  UtensilsCrossed,
  Sparkles,
  LogOut,
  ShieldAlert,
  ArrowRight,
  Maximize2,
} from 'lucide-react';
import { Student, TripSettings, ActiveUserSession, PARTICIPANT_ROLES_CONFIG, getStudentMealInfo } from '../types';

interface FieldSupervisorViewProps {
  students: Student[];
  tripSettings: TripSettings;
  session: ActiveUserSession;
  onOpenQRScanner: () => void;
  onLogoutToStaffModal: () => void;
  onOpenTripSwitcher?: () => void;
  onToggleCheckInDeparture: (studentId: string) => void;
  onToggleCheckInReturn: (studentId: string) => void;
  onToggleTShirtReceived: (studentId: string) => void;
  onToggleMealReceived: (studentId: string) => void;
}

export const FieldSupervisorView: React.FC<FieldSupervisorViewProps> = ({
  students,
  tripSettings,
  session,
  onOpenQRScanner,
  onLogoutToStaffModal,
  onOpenTripSwitcher,
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onToggleTShirtReceived,
  onToggleMealReceived,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // If supervisor is assigned to a specific bus (> 0), lock the filter exclusively to that bus
  const isAssignedToSpecificBus = Boolean(session.assignedBus && session.assignedBus > 0);
  const userBusNumber = isAssignedToSpecificBus ? (session.assignedBus as number) : 1;

  const [busFilter, setBusFilter] = useState<number | 'all'>(
    isAssignedToSpecificBus ? userBusNumber : 'all'
  );
  const [filterType, setFilterType] = useState<'all' | 'pending_departure' | 'checked_departure' | 'pending_meal' | 'pending_tshirt'>('all');

  // Filter students - Strictly enforce bus restriction
  const filteredStudents = students.filter((s) => {
    // Strict Bus filter: If supervisor assigned to a bus, they can NEVER see other buses
    if (isAssignedToSpecificBus) {
      if (s.busNumber !== userBusNumber) return false;
    } else if (busFilter !== 'all' && s.busNumber !== busFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      const matchTicket = s.ticketCode.toLowerCase().includes(q);
      const matchSeat = s.seatNumber?.toString() === q;
      if (!matchName && !matchPhone && !matchTicket && !matchSeat) return false;
    }

    // Status filter
    if (filterType === 'pending_departure' && s.checkInDeparture) return false;
    if (filterType === 'checked_departure' && !s.checkInDeparture) return false;
    if (filterType === 'pending_meal') {
      const meal = getStudentMealInfo(s, tripSettings);
      if (!meal.hasMeal || s.mealReceived) return false;
    }
    if (filterType === 'pending_tshirt') {
      const hasTshirt = s.tshirtSize && s.tshirtSize !== 'none' && s.tshirtSize !== 'None' && s.tshirtSize !== 'بدون';
      if (!hasTshirt || s.tshirtReceived) return false;
    }

    return true;
  });

  // Calculate Field Statistics - Strictly restricted to assigned bus if applicable
  const targetStudents = isAssignedToSpecificBus
    ? students.filter((s) => s.busNumber === userBusNumber)
    : busFilter === 'all'
    ? students
    : students.filter((s) => s.busNumber === busFilter);
  const totalCount = targetStudents.length;
  const departureChecked = targetStudents.filter((s) => s.checkInDeparture).length;
  const returnChecked = targetStudents.filter((s) => s.checkInReturn).length;
  const mealsDelivered = targetStudents.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = targetStudents.filter((s) => s.tshirtReceived).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Field Mode Bar - Mobile-First Precision */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 sm:px-4 sm:py-3 shadow-xl">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Row 1: Profile & Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* User Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-amber-400 text-sm sm:text-base">
                  📷
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded uppercase shrink-0">
                    مشرف ميداني
                  </span>
                  {session.assignedBus && session.assignedBus > 0 ? (
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-700 text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                      حافلة #{session.assignedBus}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs mt-0.5">
                  {session.name}
                </h1>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Direct Open QR Camera Button */}
              <button
                onClick={onOpenQRScanner}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>ماسح الـ QR</span>
              </button>

              {/* Switch / Logout account */}
              <button
                onClick={onLogoutToStaffModal}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95 cursor-pointer border border-slate-700"
                title="تبديل الحساب أو الرجوع للأدمن"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
              </button>
            </div>
          </div>

          {/* Row 2: Trip & Destination Switcher Badge */}
          {onOpenTripSwitcher && (
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-xl px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-1.5 min-w-0 text-slate-300">
                <span className="text-amber-400 shrink-0">📍</span>
                <span className="text-[11px] sm:text-xs font-bold truncate text-slate-200">
                  {tripSettings.destination || tripSettings.tripName}
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenTripSwitcher}
                className="text-[10px] sm:text-[11px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg transition active:scale-95 cursor-pointer shrink-0"
              >
                تبديل الرحله 🔄
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-3.5 sm:space-y-4">
        {/* Quick Launch QR Hero */}
        <div
          onClick={onOpenQRScanner}
          className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center space-y-2 cursor-pointer hover:border-amber-500 transition shadow-xl group active:scale-[0.99]"
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-0.5 shadow-lg group-hover:scale-110 transition duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <QrCode className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 animate-pulse" />
            </div>
          </div>
          <h2 className="text-sm sm:text-base md:text-lg font-black text-white">
            انقر هنا لفتح كاميرا ماسح التذاكر الفوري
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            امسح تذكرة المشترك للتحقق الفوري وتسجيل الصعود وتسليم التيشرت والوجبة بنقرة واحدة مع صوت تنبيه.
          </p>
        </div>

        {/* Live Counters (Clean 2x2 Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-bold">إجمالي ركاب الحافلة</div>
            <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">{totalCount} مشترك</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl">
            <div className="text-[10px] sm:text-[11px] text-emerald-400 font-bold">صعود الذهاب</div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-0.5">
              {departureChecked} / {totalCount}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl">
            <div className="text-[10px] sm:text-[11px] text-purple-400 font-bold">تسليم التيشرتات</div>
            <div className="text-lg sm:text-xl font-black text-purple-400 font-mono mt-0.5">{tshirtsDelivered}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl">
            <div className="text-[10px] sm:text-[11px] text-amber-400 font-bold">تسليم الوجبات</div>
            <div className="text-lg sm:text-xl font-black text-amber-400 font-mono mt-0.5">{mealsDelivered}</div>
          </div>
        </div>

        {/* Search and Bus Selector */}
        <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، المقعد، الهاتف، أو الكود..."
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                مسح
              </button>
            )}
          </div>

          {/* Bus Filter Tabs */}
          {!isAssignedToSpecificBus && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
              <button
                onClick={() => setBusFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  busFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                كافة الحافلات
              </button>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <button
                  key={b}
                  onClick={() => setBusFilter(b)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    busFilter === b
                      ? 'bg-indigo-600 text-white font-black'
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  حافلة #{b}
                </button>
              ))}
            </div>
          )}

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                filterType === 'all' ? 'bg-slate-200 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              الكل ({filteredStudents.length})
            </button>
            <button
              onClick={() => setFilterType('pending_departure')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                filterType === 'pending_departure'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              لم يصعدوا بعد ⏳
            </button>
            <button
              onClick={() => setFilterType('checked_departure')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                filterType === 'checked_departure'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              تم الصعود ✅
            </button>
            <button
              onClick={() => setFilterType('pending_meal')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                filterType === 'pending_meal'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              بانتظار الوجبة 🍔
            </button>
            <button
              onClick={() => setFilterType('pending_tshirt')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition shrink-0 ${
                filterType === 'pending_tshirt'
                  ? 'bg-purple-500 text-white font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800'
              }`}
            >
              بانتظار التيشرت 👕
            </button>
          </div>
        </div>

        {/* Student Cards List */}
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              لا توجد نتائج مطابقة للبحث أو الفلتر المحدد.
            </div>
          ) : (
            filteredStudents.map((student, idx) => {
              const mealInfo = getStudentMealInfo(student, tripSettings);
              const hasTshirt = Boolean(
                student.tshirtSize &&
                student.tshirtSize !== 'none' &&
                student.tshirtSize !== 'None' &&
                student.tshirtSize !== 'بدون' &&
                student.tshirtSize !== '-'
              );

              return (
                <div
                  key={student.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 space-y-3 shadow transition"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2 py-0.5 rounded-lg font-mono font-bold text-xs">
                        حافلة #{student.busNumber}
                      </span>
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-lg font-mono font-bold text-xs">
                        {student.seatNumber ? `مقعد #${student.seatNumber}` : 'بدون مقعد'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-950 px-2 py-0.5 rounded-lg text-amber-400 font-bold border border-slate-800">
                        {student.ticketCode}
                      </span>
                    </div>
                  </div>

                  {/* Student Details */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-white">{student.name}</h3>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            student.gender === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                          }`}
                        >
                          {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <a href={`tel:${student.phone}`} className="text-amber-400 hover:underline font-mono flex items-center gap-1 font-bold">
                          <Phone className="w-3 h-3" />
                          <span>{student.phone}</span>
                        </a>
                        {student.faculty && <span>• {student.faculty}</span>}
                      </div>
                      {student.pickupPoint && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          📍 نقطة التجمع: <strong className="text-slate-200">{student.pickupPoint}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onToggleCheckInDeparture(student.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm ${
                        student.checkInDeparture
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {student.checkInDeparture ? '✅ صعد الذهاب' : '🔲 صعود الذهاب'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleCheckInReturn(student.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-sm ${
                        student.checkInReturn
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {student.checkInReturn ? '✅ صعد العودة' : '🔲 صعود العودة'}
                    </button>
                  </div>

                  {/* T-Shirt & Meal Delivery Fast Toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    {hasTshirt ? (
                      <button
                        type="button"
                        onClick={() => onToggleTShirtReceived(student.id)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                          student.tshirtReceived
                            ? 'bg-purple-950/90 border-purple-500 text-purple-300'
                            : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-purple-500/50'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">👕 تيشرت ({student.tshirtSize})</span>
                        <span>{student.tshirtReceived ? '✅ تم التسليم' : '🔲 اضغط للتسليم'}</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-xl text-[10px] bg-slate-950/60 border border-slate-800 text-slate-500 flex items-center justify-center text-center font-medium">
                        بدون تيشيرت
                      </div>
                    )}

                    {mealInfo.hasMeal ? (
                      <button
                        type="button"
                        onClick={() => onToggleMealReceived(student.id)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center cursor-pointer ${
                          student.mealReceived
                            ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-amber-300 hover:border-amber-500/50'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 truncate max-w-full">🍔 {mealInfo.mealName}</span>
                        <span>{student.mealReceived ? '✅ استلم الوجبة' : '🔲 اضغط للتسليم'}</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-xl text-[10px] bg-slate-950/60 border border-slate-800 text-slate-500 flex items-center justify-center text-center font-medium">
                        بدون وجبة
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
