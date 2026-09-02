import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Bus,
  FileText,
  BadgeDollarSign,
  Package,
  Clock,
  Camera,
  QrCode,
  Download,
  Settings,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Menu,
  X,
  PlusCircle,
  Compass,
  Landmark,
  Layers,
  ClipboardList,
  Printer,
  ShieldCheck,
  UserCheck,
  KeyRound,
  LogOut,
  Lock,
  Activity,
} from 'lucide-react';
import { TripSettings, ActiveUserSession } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tripSettings: TripSettings;
  userSession: ActiveUserSession;
  onOpenSettings: () => void;
  onOpenQRScanner: () => void;
  onOpenStudentPass: () => void;
  onResetData: () => void;
  isPWAInstallable?: boolean;
  onInstallPWA?: () => void;
  onOpenTripSwitcher: () => void;
  onOpenTreasuryModal: () => void;
  onOpenStaffLogin: () => void;
  onOpenStaffManagement: () => void;
  onOpenActivityLogs?: () => void;
  onLockApp?: () => void;
  treasuryBalance?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tripSettings,
  userSession,
  onOpenSettings,
  onOpenQRScanner,
  onOpenStudentPass,
  onResetData,
  isPWAInstallable,
  onInstallPWA,
  onOpenTripSwitcher,
  onOpenTreasuryModal,
  onOpenStaffLogin,
  onOpenStaffManagement,
  onOpenActivityLogs,
  onLockApp,
  treasuryBalance = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const perms = userSession.permissions;
  const isAdmin = userSession.role === 'admin';

  // Base list of items
  const allNavItems = [
    { id: 'dashboard', label: 'لوحة التحكم', shortLabel: 'الرئيسية', icon: LayoutDashboard, visible: true },
    {
      id: 'students',
      label: 'الحجوزات والطلاب',
      shortLabel: 'الطلاب',
      icon: Users,
      visible: Boolean(perms?.canRegisterStudents || isAdmin),
    },
    {
      id: 'buses',
      label: 'الأتوبيسات والتسكين',
      shortLabel: 'الحافلات',
      icon: Bus,
      visible: Boolean(perms?.canManageBuses || perms?.canCheckInOut || isAdmin),
    },
    {
      id: 'manifests',
      label: 'الكشوفات والطباعة المعتمدة',
      shortLabel: 'الكشوفات 🖨️',
      icon: ClipboardList,
      visible: Boolean(perms?.canExportPrint || perms?.canCheckInOut || isAdmin),
    },
    {
      id: 'financials',
      label: 'المصروفات والماليات',
      shortLabel: 'المصروفات 💰',
      icon: BadgeDollarSign,
      visible: Boolean(perms?.canViewFinancials || isAdmin),
    },
    {
      id: 'contracts',
      label: 'العقود والإيصالات',
      shortLabel: 'العقود',
      icon: FileText,
      visible: Boolean(perms?.canExportPrint || isAdmin),
    },
    { id: 'logistics', label: 'اللوجستيات والمخزون', shortLabel: 'اللوجستيات', icon: Package, visible: true },
    { id: 'timeline', label: 'الجدول واليوم', shortLabel: 'الجدول', icon: Clock, visible: true },
    { id: 'portal', label: 'بوابة الطلاب والميديا', shortLabel: 'الميديا', icon: Camera, visible: true },
  ];

  const visibleNavItems = allNavItems.filter((i) => i.visible);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 shadow-xl">
        {/* Top Announcement Bar - Clean single-row layout on mobile */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-700 text-slate-950 text-[11px] sm:text-xs py-1.5 px-3 sm:px-4 font-bold flex justify-between items-center gap-2">
          {/* Trip Selector Trigger */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] uppercase font-black tracking-wider shrink-0 shadow-sm">
              KAYAN
            </span>
            <button
              onClick={onOpenTripSwitcher}
              className="hover:underline text-right truncate flex items-center gap-1 text-slate-950 font-black cursor-pointer min-w-0"
              title="انقر لتبديل الرحلة الحالية"
            >
              <Compass className="w-3.5 h-3.5 shrink-0 text-slate-950" />
              <span className="truncate max-w-[130px] xs:max-w-[170px] sm:max-w-[260px] md:max-w-[340px] font-black">
                {tripSettings.tripName}
              </span>
              <span className="bg-slate-950/20 px-1.5 py-0.2 text-[9px] rounded font-mono shrink-0 hidden sm:inline">
                تبديل 🔄
              </span>
            </button>
          </div>

          {/* User Session & Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Active User Status Button */}
            <button
              onClick={onOpenStaffLogin}
              className="bg-slate-950/95 hover:bg-slate-900 text-amber-300 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] flex items-center gap-1 font-extrabold transition shadow-md active:scale-95 cursor-pointer border border-slate-800 shrink-0"
              title="تبديل حساب المستخدم أو رمز الدخول السريع"
            >
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
              <span className="text-white font-black truncate max-w-[70px] xs:max-w-[110px] sm:max-w-[140px]">
                {userSession.name}
              </span>
              <span className="text-[8px] sm:text-[9px] bg-amber-500 text-slate-950 font-black px-1 sm:px-1.5 py-0.2 rounded font-mono shrink-0">
                {userSession.role === 'admin' ? 'أدمن' : userSession.role === 'field_supervisor' ? 'مشرف' : 'موظف'}
              </span>
            </button>

            {/* Main Treasury Header Button (Desktop / Tablet) */}
            {(perms?.canAccessTreasury || isAdmin) && (
              <button
                onClick={onOpenTreasuryModal}
                className="bg-slate-950 text-amber-300 hover:bg-slate-900 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] hidden md:flex items-center gap-1 font-extrabold transition shadow-sm active:scale-95 cursor-pointer"
                title="الخزنة الرئيسية لشركة كيان"
              >
                <Landmark className="w-3 h-3 text-amber-400" />
                <span>الخزنة: {(treasuryBalance ?? 0).toLocaleString()} ج.م</span>
              </button>
            )}

            {/* Lock App button */}
            {onLockApp && (
              <button
                onClick={onLockApp}
                className="bg-slate-950 text-rose-300 hover:bg-rose-950 hover:text-rose-200 p-1 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-[11px] flex items-center gap-1 font-bold transition shadow-sm active:scale-95 cursor-pointer border border-rose-900/40 shrink-0"
                title="قفل التطبيق وتسجيل الخروج"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">قفل</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-black text-amber-400 text-base sm:text-xl tracking-tighter">
                K
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-xl font-extrabold text-white tracking-wide truncate">
                  كيان <span className="text-amber-400">EVENTS</span>
                </h1>
                <button
                  onClick={onOpenTripSwitcher}
                  className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Layers className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>الرحلات</span>
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate max-w-xs">
                {tripSettings.destination || 'الوجهة المحددة'}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Staff Passcodes & Multi-options Manager Button (Admin only) */}
            {isAdmin && (
              <>
                <button
                  onClick={onOpenStaffManagement}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 font-bold p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm hidden sm:flex items-center gap-1.5 transition border border-slate-800 active:scale-95 cursor-pointer"
                  title="إدارة الموظفين وتحديد خياراتهم المتعددة وأرقام PIN السرية"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span className="hidden lg:inline">صلاحيات الموظفين</span>
                </button>

                {onOpenActivityLogs && (
                  <button
                    onClick={onOpenActivityLogs}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 font-bold p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm hidden md:flex items-center gap-1.5 transition border border-slate-800 active:scale-95 cursor-pointer"
                    title="سجل نشاط وحركات الموظفين المتطور (Audit Logs)"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="hidden xl:inline">سجل النشاط ⚡</span>
                  </button>
                )}
              </>
            )}

            {(perms?.canAccessTreasury || isAdmin) && (
              <button
                onClick={onOpenTreasuryModal}
                className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-bold p-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition border border-indigo-700/60 active:scale-95 cursor-pointer"
                title="الخزنة الرئيسية"
              >
                <Landmark className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline font-bold">الخزنة</span>
              </button>
            )}

            {(perms?.canScanQR || isAdmin) && (
              <button
                onClick={onOpenQRScanner}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                title="مسح كود QR لتحضير الطلاب"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline font-black">مسح QR</span>
              </button>
            )}

            {(perms?.canIssueTickets || isAdmin) && (
              <button
                onClick={onOpenStudentPass}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold p-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm hidden sm:flex items-center gap-1.5 transition border border-indigo-400/30 active:scale-95 cursor-pointer"
                title="تذكرة الطالب الرقمية"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="hidden md:inline">التذكرة</span>
              </button>
            )}

            {(perms?.canEditSettings || isAdmin) && (
              <button
                onClick={onOpenSettings}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition active:scale-95 cursor-pointer"
                title="إعدادات الرحلة"
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Mobile Menu Drawer Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white bg-slate-900 rounded-xl border border-slate-800 transition md:hidden active:scale-95 cursor-pointer"
              aria-label="القائمة"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Pill Bar for ALL screens (Desktop & Mobile) */}
        <div className="border-t border-slate-800/80 bg-slate-950/80 overflow-x-auto no-scrollbar scroll-smooth">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex space-x-1 space-x-reverse min-w-max py-1.5 sm:py-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 bg-slate-900/30'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                  <span className="whitespace-nowrap">{item.shortLabel || item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Full Screen / Drawer Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400">{userSession.name}</span>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-400 font-mono">
                  {userSession.role}
                </span>
              </div>
              <button
                onClick={onOpenStaffLogin}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                تبديل الـ PIN
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 text-right transition border ${
                      isActive
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs flex-wrap gap-2">
              <button
                onClick={() => {
                  onOpenStaffLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="text-amber-400 hover:underline flex items-center gap-1 py-1 font-bold"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> تسجيل دخول موظف (PIN)
              </button>
              {onLockApp && (
                <button
                  onClick={() => {
                    onLockApp();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-rose-400 hover:underline flex items-center gap-1 py-1 font-bold"
                >
                  <Lock className="w-3.5 h-3.5" /> قفل التطبيق
                </button>
              )}
              <button
                onClick={() => {
                  onResetData();
                  setIsMobileMenuOpen(false);
                }}
                className="text-slate-400 hover:underline flex items-center gap-1 py-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> إعادة الضبط
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Bottom Mobile Navigation Bar for Phone Screens */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 md:hidden px-1.5 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="grid grid-cols-5 gap-1 text-center items-center">
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 ${
                  isActive
                    ? 'text-amber-400 font-black bg-amber-500/15 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-amber-400 scale-110' : ''}`} />
                <span className="text-[10px] leading-tight font-medium truncate w-full px-0.5">{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Menu / All Tabs Trigger */}
          {(() => {
            const isMoreActive = isMobileMenuOpen || visibleNavItems.slice(4).some((item) => item.id === activeTab);
            return (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition active:scale-95 cursor-pointer ${
                  isMoreActive
                    ? 'text-amber-400 font-black bg-amber-500/15 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Menu className="w-5 h-5 mb-0.5 text-amber-400" />
                <span className="text-[10px] leading-tight font-bold">المزيد</span>
              </button>
            );
          })()}
        </div>
      </nav>
    </>
  );
};
