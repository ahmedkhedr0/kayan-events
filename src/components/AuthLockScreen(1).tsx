import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Compass,
  ArrowRight,
  Shield,
  HelpCircle,
  PhoneCall,
  Send,
  MessageCircle,
  X,
  BellRing,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { StaffAccount, ActiveUserSession, DEFAULT_ROLE_PERMISSIONS } from '../types';
import kayanLogoImg from '../assets/images/kayan_events_logo_1787933987535.jpg';

interface AuthLockScreenProps {
  staffAccounts: StaffAccount[];
  tripName: string;
  destination: string;
  supportPhone?: string;
  onAuthenticate: (session: ActiveUserSession) => void;
  onBlockedAttempt?: (account: StaffAccount) => void;
}

export const AuthLockScreen: React.FC<AuthLockScreenProps> = ({
  staffAccounts,
  tripName,
  destination,
  supportPhone = '01023456789',
  onAuthenticate,
  onBlockedAttempt,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockedWarning, setBlockedWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [alertSentSuccess, setAlertSentSuccess] = useState(false);

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg(null);
      setBlockedWarning(null);
      checkPinMatch(nextPin);
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
    setBlockedWarning(null);
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg(null);
    setBlockedWarning(null);
  };

  const checkPinMatch = (pinCandidate: string) => {
    const cleanPin = pinCandidate.trim();
    if (!cleanPin) return;

    const matched = staffAccounts.find((acc) => acc.pin === cleanPin);
    if (matched) {
      executeLogin(matched);
    }
  };

  const executeLogin = (matched: StaffAccount) => {
    // Check if employee account is suspended/blocked
    if (matched.status === 'suspended') {
      const reason =
        matched.suspensionReason ||
        'تم إلغاء وتجميد كود الموظف بناءً على تعليمات إدارة شركة كيان. يرجى مراجعة إدارة الرحلة.';
      setBlockedWarning(reason);
      setErrorMsg(`⛔ الحساب معطل: ${reason}`);
      if (onBlockedAttempt) {
        onBlockedAttempt(matched);
      }
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);
    setBlockedWarning(null);
    const roleTitle =
      matched.role === 'admin'
        ? '👑 المدير العام (الأدمن)'
        : matched.role === 'field_supervisor'
        ? '📷 مشرف ميداني'
        : '🎫 علاقات عامة وحجوزات';

    setSuccessMsg(`أهلاً بك: ${matched.name} (${roleTitle}) ✨`);

    setTimeout(() => {
      const permissions = matched.permissions || DEFAULT_ROLE_PERMISSIONS[matched.role];
      const newSession: ActiveUserSession = {
        role: matched.role,
        name: matched.name,
        pin: matched.pin,
        permissions,
        assignedBus: matched.assignedBus,
        allowedTripIds: matched.allowedTripIds,
      };
      onAuthenticate(newSession);
      setIsVerifying(false);
    }, 450);
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setBlockedWarning(null);

    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setErrorMsg('يرجى إدخال الرقم السري (PIN)');
      return;
    }

    const matched = staffAccounts.find((acc) => acc.pin === cleanPin);
    if (matched) {
      executeLogin(matched);
    } else {
      setErrorMsg('الرقم السري غير صحيح! يرجى مراجعة إدارة الرحلة أو طلب المساعدة.');
    }
  };

  const handleSendAdminAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const requesterName = staffNameInput.trim() || 'عضو في طاقم العمل';
    
    // Format WhatsApp message for direct dispatch
    const cleanPhone = supportPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `20${cleanPhone.slice(1)}` : cleanPhone;
    const msg = encodeURIComponent(
      `🚨 *تنبيه طلب استعادة الرمز السري (PIN)*\n\n📌 *نظام كيان Events*\n👤 *اسم الموظف / المشرف:* ${requesterName}\n📱 *رقم التواصل:* ${staffPhoneInput.trim() || 'غير محدد'}\n🏕️ *الرحلة:* ${tripName}\n\nيرجى تزويدي برمز الـ PIN الخاص بي لتسجيل الدخول للنظام.`
    );
    const waUrl = `https://wa.me/${formattedPhone}?text=${msg}`;

    // Open WhatsApp
    window.open(waUrl, '_blank');

    setAlertSentSuccess(true);
    setTimeout(() => {
      setAlertSentSuccess(false);
      setIsForgotModalOpen(false);
      setStaffNameInput('');
      setStaffPhoneInput('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Ambient Lighting FX */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>

      {/* Brand Header with Real Company Logo */}
      <div className="relative z-10 text-center mb-6 max-w-sm flex flex-col items-center">
        <div className="relative mb-3 group">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-indigo-600 p-0.5 shadow-2xl shadow-amber-500/25 transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full bg-slate-950 rounded-[22px] overflow-hidden flex items-center justify-center">
              <img
                src={kayanLogoImg}
                alt="شركة كيان KAYAN Events"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[22px]"
              />
            </div>
          </div>
          <div className="absolute -bottom-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md">
            KAYAN EVENTS
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-1">
          شركة كيان <span className="text-amber-400">EVENTS</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          المنظومة السحابية المتكاملة لإدارة وتنظيم رحلات الشباب والجامعات
        </p>
      </div>


      {/* Main PIN Authentication Box */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/60">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-full border border-slate-800 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-slate-300">تسجيل الدخول بالرقم السري</span>
          </div>
          <p className="text-xs text-slate-400">
            أدخل رمز الـ PIN الخاص بك للدخول الفوري وتفعيل صلاحياتك
          </p>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                disabled={isVerifying}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setPinInput(val);
                  setErrorMsg(null);
                  checkPinMatch(val);
                }}
                placeholder="••••"
                className="w-full bg-slate-950 border-2 border-slate-800 focus:border-amber-500 text-center font-mono text-3xl sm:text-4xl tracking-[0.4em] text-amber-400 rounded-2xl py-3.5 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition shadow-inner font-black"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition"
                title={showPin ? 'إخفاء الرقم' : 'إظهار الرقم'}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Numeric Touch Keypad */}
          <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 sm:h-13 bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800/80 rounded-2xl text-xl font-mono font-bold text-white transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                disabled={isVerifying || !pinInput}
                onClick={handleClear}
                className="h-12 sm:h-13 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-2xl text-xs font-bold text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30"
              >
                مسح
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleKeypadPress('0')}
                className="h-12 sm:h-13 bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-800/80 rounded-2xl text-xl font-mono font-bold text-white transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                disabled={isVerifying || !pinInput}
                onClick={handleBackspace}
                className="h-12 sm:h-13 bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 rounded-2xl text-base font-bold text-slate-400 hover:text-rose-400 transition flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-30"
              >
                ⌫
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {blockedWarning ? (
            <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-200 p-3.5 rounded-2xl text-xs font-bold space-y-2 animate-in zoom-in-95 shadow-xl shadow-rose-950/60">
              <div className="flex items-center gap-2 text-rose-400">
                <Ban className="w-5 h-5 shrink-0" />
                <span className="text-sm font-black">تحذير أمني: تم إيقاف هذا الكود!</span>
              </div>
              <p className="text-xs text-rose-200 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-rose-900/60">
                {blockedWarning}
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>يرجى مراجعة إدارة الرحلة لإعادة تفعيل الصلاحية</span>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          ) : null}

          {successMsg && (
            <div className="bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!pinInput || isVerifying}
            className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3.5 rounded-2xl transition cursor-pointer shadow-xl shadow-amber-500/20 active:scale-98 text-sm flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            <span>{isVerifying ? 'جاري التحقق...' : 'دخول للنظام'}</span>
          </button>
        </form>

        {/* Forgot PIN & Help Action */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setIsForgotModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 transition py-1 hover:underline cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>نسيت كلمة المرور؟ (تنبيه الأدمن)</span>
          </button>

          <span className="text-[11px] text-slate-500 font-medium">
            نظام الصلاحيات الموحد 🔒
          </span>
        </div>
      </div>

      {/* Forgot Password / Alert Admin Modal */}
      {isForgotModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsForgotModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 to-indigo-700 p-4 text-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950/20 flex items-center justify-center">
                  <BellRing className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black">طلب استعادة الرمز السري</h3>
                  <p className="text-xs font-bold opacity-90">إرسال تنبيه فوري للأدمن</p>
                </div>
              </div>
              <button
                onClick={() => setIsForgotModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 flex items-center justify-center font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                إذا نسيت رمز الـ PIN المخصص لك، يمكنك إرسال تنبيه مباشر للأدمن عبر الواتساب أو التواصل معه لتزويدك بالرمز فوراً:
              </p>

              <form onSubmit={handleSendAdminAlert} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسمك (الموظف / المشرف):
                  </label>
                  <input
                    type="text"
                    required
                    value={staffNameInput}
                    onChange={(e) => setStaffNameInput(e.target.value)}
                    placeholder="مثال: أحمد محمود"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رقم هاتفك للتواصل (اختياري):
                  </label>
                  <input
                    type="tel"
                    value={staffPhoneInput}
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none text-left"
                  />
                </div>

                {alertSentSuccess && (
                  <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>تم تجهيز وإرسال تنبيه طلب الرمز للأدمن بنجاح 🔔</span>
                  </div>
                )}

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>إرسال تنبيه مباشر للأدمن عبر WhatsApp</span>
                  </button>

                  <a
                    href={`tel:${supportPhone}`}
                    className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-xs border border-slate-700 text-center"
                  >
                    <PhoneCall className="w-4 h-4 text-amber-400" />
                    <span>اتصال هاتفي مباشر بالأدمن ({supportPhone})</span>
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
