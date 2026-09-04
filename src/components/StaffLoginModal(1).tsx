import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  QrCode,
  Users,
  LogOut,
  Sparkles,
  AlertCircle,
  Bus,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
} from 'lucide-react';
import { StaffAccount, ActiveUserSession, AppUserRole, DEFAULT_ROLE_PERMISSIONS, StaffPermissions } from '../types';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffAccounts: StaffAccount[];
  currentSession: ActiveUserSession;
  onLogin: (session: ActiveUserSession) => void;
  onManageAccounts?: () => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  staffAccounts,
  currentSession,
  onLogin,
  onManageAccounts,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = currentSession.role === 'admin';

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg(null);
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setErrorMsg('يرجى إدخال رمز الدخول السري (PIN)');
      return;
    }

    const matched = staffAccounts.find((acc) => acc.pin === cleanPin);

    if (matched) {
      // Check if account is suspended / blocked
      if (matched.status === 'suspended') {
        const warningReason =
          matched.suspensionReason ||
          'تم إلغاء وتجميد كود الموظف بناءً على تعليمات إدارة شركة كيان. يرجى مراجعة إدارة الرحلة.';
        setErrorMsg(`⛔ تنبيه إيقاف الحساب: ${warningReason}`);
        return;
      }

      const permissions: StaffPermissions = matched.permissions || DEFAULT_ROLE_PERMISSIONS[matched.role];
      const newSession: ActiveUserSession = {
        role: matched.role,
        name: matched.name,
        pin: matched.pin,
        permissions,
        assignedBus: matched.assignedBus,
        allowedTripIds: matched.allowedTripIds,
      };
      setSuccessMsg(`مرحباً ${matched.name} 👋 (${getRoleLabel(matched.role)})`);
      setTimeout(() => {
        onLogin(newSession);
        setPinInput('');
        setSuccessMsg(null);
        onClose();
      }, 400);
    } else {
      setErrorMsg('رمز الدخول السري غير صحيح! يرجى مراجعة إدارة الرحلة.');
    }
  };

  const getRoleLabel = (role: AppUserRole) => {
    switch (role) {
      case 'admin':
        return 'المدير العام / الأدمن 👑';
      case 'field_supervisor':
        return 'مشرف ميداني 📷';
      case 'pr_ticketing':
        return 'علاقات عامة وحجوزات 🎫';
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header with High-end Gradient */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-700 p-4 sm:p-5 text-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950/20 backdrop-blur flex items-center justify-center font-black">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                تبديل المستخدم والرمز السري
              </h3>
              <p className="text-xs font-bold text-slate-900 opacity-90">
                أدخل رمز PIN السري للدخول إلى حسابك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 flex items-center justify-center transition font-bold"
          >
            ✕
          </button>
        </div>

        {/* Current Active User Status Bar */}
        <div className="bg-slate-950 p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>المستخدم الحالي:</span>
                <span className="text-amber-400 font-extrabold">{currentSession.name}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                الصلاحية: {getRoleLabel(currentSession.role)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && onManageAccounts && (
              <button
                onClick={onManageAccounts}
                className="text-[11px] bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-300 px-3 py-1 rounded-xl transition font-bold flex items-center gap-1 cursor-pointer"
                title="تعديل صلاحيات الموظفين وإعطاء كل موظف خيارات متعددة"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>إدارة الصلاحيات</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* PIN Input Screen */}
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>أدخل رمز الدخول السريع (PIN):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'إخفاء' : 'إظهار'}</span>
                </button>
              </div>

              {/* PIN Screen / Display */}
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/[^0-9]/g, ''));
                    setErrorMsg(null);
                  }}
                  placeholder="••••"
                  className="w-full bg-slate-950 border-2 border-slate-800 text-center font-mono text-2xl tracking-[0.5em] text-amber-400 rounded-2xl py-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-inner"
                  autoFocus
                />
              </div>
            </div>

            {/* Virtual Numerical Keypad for Touch / Mobile devices */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-11 bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-white transition flex items-center justify-center cursor-pointer shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-11 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer"
                >
                  مسح الكل
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-11 bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800 rounded-xl text-lg font-mono font-bold text-white transition flex items-center justify-center cursor-pointer shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-11 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-rose-400 transition flex items-center justify-center cursor-pointer"
                >
                  ⌫
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 p-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!pinInput}
              className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-2xl transition cursor-pointer shadow-xl shadow-amber-500/20 active:scale-98 text-sm flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>تأكيد الدخول</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
