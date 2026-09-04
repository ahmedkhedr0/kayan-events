import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Bus,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  CheckSquare,
  Square,
  FileSpreadsheet,
  QrCode,
  DollarSign,
  Printer,
  Settings,
  Sparkles,
  Compass,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import {
  StaffAccount,
  AppUserRole,
  StaffPermissions,
  DEFAULT_ROLE_PERMISSIONS,
  Trip,
} from '../types';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffAccounts: StaffAccount[];
  onSaveStaffAccounts: (accounts: StaffAccount[]) => void;
  trips?: Trip[];
  activeTrip?: Trip;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffAccounts,
  onSaveStaffAccounts,
  trips = [],
  activeTrip,
}) => {
  const [accounts, setAccounts] = useState<StaffAccount[]>(staffAccounts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<StaffAccount | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync internal state with props whenever staffAccounts change or modal opens
  useEffect(() => {
    setAccounts(staffAccounts);
  }, [staffAccounts, isOpen]);

  // Form State
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formRole, setFormRole] = useState<AppUserRole>('field_supervisor');
  const [formBus, setFormBus] = useState<number>(0);
  const [formAllowedTrips, setFormAllowedTrips] = useState<string[]>([]); // Empty = all trips
  const [formNotes, setFormNotes] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');
  const [formSuspensionReason, setFormSuspensionReason] = useState('');
  const [showPinInForm, setShowPinInForm] = useState(false);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Dynamic buses available across the trip/trips
  const availableTripBuses = useMemo(() => {
    const targetTrip = activeTrip || (trips.length > 0 ? trips[0] : null);
    const busSet = new Set<number>();
    if (targetTrip) {
      (targetTrip.drivers || []).forEach((d) => busSet.add(Number(d.busNumber)));
      (targetTrip.students || []).forEach((s) => busSet.add(Number(s.busNumber)));
      const seatsCount = targetTrip.settings?.totalSeats || 150;
      const calculatedBuses = Math.max(1, Math.ceil(seatsCount / 50));
      for (let i = 1; i <= calculatedBuses; i++) {
        busSet.add(i);
      }
    } else {
      [1, 2, 3].forEach((b) => busSet.add(b));
    }
    return Array.from(busSet).filter((b) => b > 0).sort((a, b) => a - b);
  }, [activeTrip, trips]);

  // Multi-option custom permissions state
  const [formPermissions, setFormPermissions] = useState<StaffPermissions>(
    DEFAULT_ROLE_PERMISSIONS.field_supervisor
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePinReveal = (id: string) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (acc: StaffAccount) => {
    setEditingId(acc.id);
    setFormName(acc.name);
    setFormPin(acc.pin);
    setFormRole(acc.role);
    setFormBus(acc.assignedBus || 0);
    setFormAllowedTrips(acc.allowedTripIds || []);
    setFormNotes(acc.notes || '');
    setFormPhone(acc.phone || '');
    setFormStatus(acc.status || 'active');
    setFormSuspensionReason(acc.suspensionReason || '');
    setFormPermissions(
      acc.permissions || DEFAULT_ROLE_PERMISSIONS[acc.role] || DEFAULT_ROLE_PERMISSIONS.field_supervisor
    );
    setErrorMsg(null);
  };

  const handleStartAdd = () => {
    setEditingId('new');
    setFormName('');
    setFormPin(Math.floor(1000 + Math.random() * 9000).toString());
    setFormRole('field_supervisor');
    setFormBus(0);
    setFormAllowedTrips([]);
    setFormNotes('');
    setFormPhone('');
    setFormStatus('active');
    setFormSuspensionReason('');
    setFormPermissions(DEFAULT_ROLE_PERMISSIONS.field_supervisor);
    setErrorMsg(null);
  };

  const handleRoleChange = (role: AppUserRole) => {
    setFormRole(role);
    // Preset default permissions for this role but allow user to customize any option
    setFormPermissions(DEFAULT_ROLE_PERMISSIONS[role]);
  };

  const togglePermission = (key: keyof StaffPermissions) => {
    setFormPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleTripSelection = (tripId: string) => {
    setFormAllowedTrips((prev) => {
      if (prev.includes(tripId)) {
        return prev.filter((id) => id !== tripId);
      } else {
        return [...prev, tripId];
      }
    });
  };

  const toggleAccountSuspensionDirectly = (acc: StaffAccount) => {
    if (acc.role === 'admin' && accounts.filter((a) => a.role === 'admin' && (a.status || 'active') === 'active').length <= 1 && (acc.status || 'active') === 'active') {
      alert('لا يمكن إيقاف حساب المدير العام (الأدمن) الوحيد النشط!');
      return;
    }

    const nextStatus = (acc.status || 'active') === 'active' ? 'suspended' : 'active';
    let nextReason = acc.suspensionReason;
    if (nextStatus === 'suspended' && !nextReason) {
      nextReason = 'تم إلغاء وتجميد كود الموظف بناءً على تعليمات إدارة شركة كيان';
    }

    const updated = accounts.map((a) => (a.id === acc.id ? { ...a, status: nextStatus, suspensionReason: nextReason } : a));
    setAccounts(updated);
    onSaveStaffAccounts(updated);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = formName.trim();
    const cleanPin = formPin.trim();

    if (!cleanName) {
      setErrorMsg('يرجى إدخال اسم الموظف / المشرف');
      return;
    }
    if (!cleanPin || cleanPin.length < 3) {
      setErrorMsg('رمز الدخول (PIN) يجب ألا يقل عن 3 أرقام');
      return;
    }

    // Check duplicate PIN (except current editing account)
    const duplicate = accounts.find((a) => a.pin === cleanPin && a.id !== editingId);
    if (duplicate) {
      setErrorMsg(`رمز PIN (${cleanPin}) مستخدم بالفعل لحساب: ${duplicate.name}`);
      return;
    }

    let updated: StaffAccount[];
    if (editingId === 'new') {
      const newAccount: StaffAccount = {
        id: `staff-${Date.now()}`,
        name: cleanName,
        pin: cleanPin,
        role: formRole,
        assignedBus: Number(formBus) || 0,
        allowedTripIds: formAllowedTrips.length > 0 ? formAllowedTrips : undefined,
        phone: formPhone.trim(),
        notes: formNotes.trim(),
        status: formStatus,
        suspensionReason: formStatus === 'suspended' ? (formSuspensionReason.trim() || 'تم إلغاء وتجميد كود الموظف بواسطة الإدارة') : undefined,
        permissions: formPermissions,
      };
      updated = [...accounts, newAccount];
    } else {
      updated = accounts.map((acc) => {
        if (acc.id === editingId) {
          return {
            ...acc,
            name: cleanName,
            pin: cleanPin,
            role: formRole,
            assignedBus: Number(formBus) || 0,
            allowedTripIds: formAllowedTrips.length > 0 ? formAllowedTrips : undefined,
            phone: formPhone.trim(),
            notes: formNotes.trim(),
            status: formStatus,
            suspensionReason: formStatus === 'suspended' ? (formSuspensionReason.trim() || 'تم إلغاء وتجميد كود الموظف بواسطة الإدارة') : undefined,
            permissions: formPermissions,
          };
        }
        return acc;
      });
    }

    setAccounts(updated);
    onSaveStaffAccounts(updated);
    setEditingId(null);
    setSuccessToast(`تم حفظ بيانات (${cleanName}) بنجاح`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDeleteClick = (acc: StaffAccount) => {
    if (acc.role === 'admin' && accounts.filter((a) => a.role === 'admin').length <= 1) {
      setErrorMsg('لا يمكن حذف حساب الأدمن الوحيد للنظام!');
      return;
    }
    setAccountToDelete(acc);
  };

  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    const targetId = accountToDelete.id;
    const targetName = accountToDelete.name;
    const updated = accounts.filter((a) => a.id !== targetId);
    setAccounts(updated);
    onSaveStaffAccounts(updated);
    setAccountToDelete(null);
    setSuccessToast(`تم حذف حساب (${targetName}) بنجاح نهائياً ✅`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Permissions configuration list for UI multi-options
  const permissionOptions: Array<{
    key: keyof StaffPermissions;
    label: string;
    description: string;
    icon: string;
    category: 'field' | 'pr' | 'admin';
  }> = [
    {
      key: 'canScanQR',
      label: 'ماسح الـ QR السريع',
      description: 'مسح تذاكر الطلاب بالكاميرا للتحضير الفوري',
      icon: '📷',
      category: 'field',
    },
    {
      key: 'canCheckInOut',
      label: 'كشف صعود وعودة الحافلات',
      description: 'تسجيل صعود الطلاب في الذهاب والعودة يدويًا',
      icon: '🚌',
      category: 'field',
    },
    {
      key: 'canDeliverItems',
      label: 'تسليم التيشيرت والوجبات',
      description: 'تأكيد استلام الوجبة والتيشيرت الميداني',
      icon: '👕',
      category: 'field',
    },
    {
      key: 'canRegisterStudents',
      label: 'تسجيل وحجز طلاب جدد',
      description: 'إضافة طلاب جدد وتعديل بيانات الاتصال والمرافقين',
      icon: '📝',
      category: 'pr',
    },
    {
      key: 'canIssueTickets',
      label: 'إصدار التذاكر والواتساب',
      description: 'مشاركة بطاقات التذاكر الرقمية ورسائل واتساب الرسمية',
      icon: '🎫',
      category: 'pr',
    },
    {
      key: 'canManageBuses',
      label: 'إدارة وتسكين الحافلات',
      description: 'توزيع الطلاب على المقاعد والحافلات وبيانات السائقين',
      icon: '💺',
      category: 'pr',
    },
    {
      key: 'canExportPrint',
      label: 'طباعة الكشوفات والعقود الرسمية',
      description: 'تصدير PDF، عقود المشرفين، وإيصالات القبض والختم',
      icon: '🖨️',
      category: 'admin',
    },
    {
      key: 'canViewFinancials',
      label: 'رؤية المصروفات والأرباح',
      description: 'الاطلاع على تقارير صافي الربح والتحصيلات والمصروفات',
      icon: '💰',
      category: 'admin',
    },
    {
      key: 'canAccessTreasury',
      label: 'التحويل من وإلى الخزنة',
      description: 'سحب أو توريد مبالغ نقدية من وإلى الخزنة الرئيسية',
      icon: '🏛️',
      category: 'admin',
    },
    {
      key: 'canEditSettings',
      label: 'تعديل أسعار وإعدادات الرحلة',
      description: 'تغيير سعر التذكرة، خط سير الرحلة، وتفاصيل البنك',
      icon: '⚙️',
      category: 'admin',
    },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-700 p-4 sm:p-5 text-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950/20 backdrop-blur flex items-center justify-center font-black">
              <Users className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                إدارة طاقم العمل والصلاحيات المتعددة (Permissions)
              </h3>
              <p className="text-xs font-bold text-slate-900 opacity-90">
                منح خيارات مخصصة لكل موظف والتحكم برمز الـ PIN السري
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

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Success Toast Banner */}
          {successToast && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-base">✅</span>
              <span>{successToast}</span>
            </div>
          )}

          {/* Add / Edit Form */}
          {editingId ? (
            <form onSubmit={handleSaveForm} className="bg-slate-950 p-4 sm:p-5 rounded-3xl border border-amber-500/40 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-black text-amber-400 text-sm sm:text-base flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  <span>{editingId === 'new' ? 'إضافة موظف جديد وتحديد خياراته' : 'تعديل بيانات وصلاحيات الموظف'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-slate-400 hover:text-white bg-slate-900 px-3 py-1 rounded-xl border border-slate-800"
                >
                  إلغاء
                </button>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم الموظف / المشرف *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: مروان أحمد (مشرف حافلة 1)"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-300">رمز الدخول السري (PIN) *</label>
                    <button
                      type="button"
                      onClick={() => setShowPinInForm(!showPinInForm)}
                      className="text-[10px] text-amber-400 flex items-center gap-1 hover:underline"
                    >
                      {showPinInForm ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPinInForm ? 'إخفاء' : 'إظهار'}</span>
                    </button>
                  </div>
                  <input
                    type={showPinInForm ? 'text' : 'password'}
                    required
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4 أرقام مثل 1234"
                    className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-mono text-center font-bold tracking-widest rounded-xl px-3 py-2 text-base focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">النمط الأساسي للحساب</label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as AppUserRole)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="field_supervisor">📷 مشرف ميداني (افتراضي: مسح QR + صعود)</option>
                    <option value="pr_ticketing">🎫 علاقات عامة (افتراضي: حجز + تذاكر + طباعة)</option>
                    <option value="admin">👑 مدير عام (أدمن بكامل الصلاحيات)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Dynamic Bus Assignment Selector */}
                <div className="sm:col-span-2 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-amber-400" />
                      <span>تحديد الحافلة المصرح بها للموظف (فصل المسؤوليات):</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-400">
                      {formBus === 0 ? 'متاح له كافة الحافلات 🌍' : `مقيد بحافلة رقم #${formBus} فقط 🔒`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormBus(0)}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                        formBus === 0
                          ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">كافة الحافلات 🌍</span>
                        {formBus === 0 && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">بوابة التجمع وإشراف شامل</p>
                    </button>

                    {availableTripBuses.map((b) => {
                      const driver = (activeTrip?.drivers || []).find((d) => d.busNumber === b);
                      const isSelected = formBus === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setFormBus(b)}
                          className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-indigo-500/25 border-indigo-500 text-white shadow-sm'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-indigo-300">حافلة #{b} 🚌</span>
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                            ) : (
                              <Lock className="w-3 h-3 text-slate-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-300 truncate mt-1">
                            {driver?.driverName ? `ك/ ${driver.driverName}` : `أتوبيس ${b}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                    <span className="text-amber-400 shrink-0 mt-0.5">💡</span>
                    <p className="leading-relaxed">
                      {formBus > 0 ? (
                        <span>
                          تم قفل صلاحية هذا الموظف على <strong className="text-amber-400 font-bold">حافلة رقم #{formBus}</strong> فقط. لن يتمكن من تسجيل أو رؤية أو تعديل أي طالب في الحافلات الأخرى، لضمان عدم التداخل مع زملائه المشرفين.
                        </span>
                      ) : (
                        <span>
                          هذا الموظف يمتلك صلاحية عامة على <strong className="text-slate-100 font-bold">كافة الحافلات</strong> (مناسب لمدير الرحلة ومسؤول الاستقبال الرئيسي).
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات ومهام المشرف</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="مثال: مسؤول نقطة الانطلاق في التجمع"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Account Status / Blocking */}
                <div className="sm:col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>حالة عمل الحساب / الكود:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormStatus('active')}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                          formStatus === 'active'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        نشط وشغال ✅
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormStatus('suspended')}
                        className={`text-xs px-3 py-1 rounded-lg font-bold transition ${
                          formStatus === 'suspended'
                            ? 'bg-rose-600 text-white font-black'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        ملغي / محظور ⛔
                      </button>
                    </div>
                  </div>

                  {formStatus === 'suspended' && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] text-rose-300 font-bold block">
                        رسالة التحذير التي تظهر للموظف عند محاولة تسجيل الدخول:
                      </label>
                      <input
                        type="text"
                        value={formSuspensionReason}
                        onChange={(e) => setFormSuspensionReason(e.target.value)}
                        placeholder="مثال: تم إيقاف هذا الكود بناءً على تعليمات الإدارة، يرجى التواصل مع الإدارة"
                        className="w-full bg-slate-950 border border-rose-800/80 text-rose-200 rounded-lg px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Option Granular Permissions Checkboxes Section */}
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h5 className="text-xs font-black text-white">
                      خيارات وصلاحيات الموظف المخصصة (اختر ما تشاء):
                    </h5>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    يمكنك تفعيل أو تعطيل أي أوبشن بشكل مستقل
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {permissionOptions.map((opt) => {
                    const isChecked = Boolean(formPermissions[opt.key]);
                    return (
                      <div
                        key={opt.key}
                        onClick={() => togglePermission(opt.key)}
                        className={`p-2.5 rounded-xl border transition flex items-start gap-2.5 cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs">{opt.icon}</span>
                            <span className="text-xs font-bold text-slate-100">{opt.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trip Assignment / Restriction Section */}
              {trips.length > 0 && (
                <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <h5 className="text-xs font-black text-white">
                        تحديد الرحلات المصرح بها للموظف:
                      </h5>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formAllowedTrips.length === 0
                        ? 'متاح له الوصول لكافة الرحلات'
                        : `محدد لـ ${formAllowedTrips.length} رحلة فقط`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormAllowedTrips([])}
                      className={`text-xs px-3 py-1 rounded-xl font-bold transition ${
                        formAllowedTrips.length === 0
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      كافة الرحلات (بدون تقييد) 🌍
                    </button>
                    <span className="text-xs text-slate-500">أو حدد رحلات معينة:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trips.map((trip) => {
                      const isAllowed = formAllowedTrips.includes(trip.id);
                      return (
                        <div
                          key={trip.id}
                          onClick={() => toggleTripSelection(trip.id)}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                            isAllowed
                              ? 'bg-indigo-500/15 border-indigo-500/60 text-white shadow-sm'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isAllowed ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">
                                {trip.settings.tripName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {trip.settings.destination}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 shrink-0">
                            {trip.students.length} مشترك
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="bg-rose-950/60 border border-rose-500/40 text-rose-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  حفظ الحساب والصلاحيات ✅
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="text-xs text-slate-300 font-bold">
                  قائمة طاقم العمل المصرح لهم ({accounts.length})
                </span>
                <p className="text-[11px] text-slate-500">
                  فقط المشرف المالي / الأدمن يمكنه رؤية رموز الـ PIN وتعديل الخيارات
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة موظف / كود جديد</span>
              </button>
            </div>
          )}

          {/* Accounts List */}
          <div className="space-y-2.5">
            {accounts.map((acc) => {
              const isPinRevealed = Boolean(revealedPins[acc.id]);
              const perms = acc.permissions || DEFAULT_ROLE_PERMISSIONS[acc.role];

              // Count active permissions
              const activePermsCount = Object.values(perms || {}).filter(Boolean).length;

              return (
                <div
                  key={acc.id}
                  className={`border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    (acc.status || 'active') === 'suspended'
                      ? 'bg-rose-950/20 border-rose-800/60 opacity-80'
                      : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base font-black shrink-0 ${
                        (acc.status || 'active') === 'suspended'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : acc.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : acc.role === 'field_supervisor'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {(acc.status || 'active') === 'suspended' ? '⛔' : acc.role === 'admin' ? '👑' : acc.role === 'field_supervisor' ? '📷' : '🎫'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-white truncate">{acc.name}</span>
                        {(acc.status || 'active') === 'suspended' ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-rose-950 text-rose-300 border border-rose-500/50">
                            ⛔ ملغي / مجمد
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              acc.role === 'admin'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                : acc.role === 'field_supervisor'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {acc.role === 'admin' ? 'أدمن كامل' : acc.role === 'field_supervisor' ? 'مشرف ميداني' : 'علاقات عامة'}
                          </span>
                        )}
                        {acc.assignedBus && acc.assignedBus > 0 ? (
                          <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-600/70 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>حافلة #{acc.assignedBus} فقط</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded-lg font-medium">
                            🌍 كافة الحافلات
                          </span>
                        )}
                        {acc.allowedTripIds && acc.allowedTripIds.length > 0 ? (
                          <span className="text-[10px] text-amber-300 bg-amber-950/50 border border-amber-800/60 px-2 py-0.2 rounded font-mono">
                            🧭 {acc.allowedTripIds.length} رحلة مخصصة
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded">
                            🌍 كافة الرحلات
                          </span>
                        )}
                        <span className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.2 rounded-full font-mono">
                          {activePermsCount} صلاحية مفعلة
                        </span>
                      </div>

                      {/* Summary badges of permissions */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {perms.canScanQR && (
                          <span className="text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded">
                            📷 ماسح QR
                          </span>
                        )}
                        {perms.canCheckInOut && (
                          <span className="text-[9px] bg-slate-900 text-indigo-300 px-1.5 py-0.2 rounded">
                            🚌 كشف الصعود
                          </span>
                        )}
                        {perms.canRegisterStudents && (
                          <span className="text-[9px] bg-slate-900 text-emerald-300 px-1.5 py-0.2 rounded">
                            📝 حجز طلاب
                          </span>
                        )}
                        {perms.canViewFinancials && (
                          <span className="text-[9px] bg-slate-900 text-rose-300 px-1.5 py-0.2 rounded">
                            💰 ماليات
                          </span>
                        )}
                        {perms.canExportPrint && (
                          <span className="text-[9px] bg-slate-900 text-cyan-300 px-1.5 py-0.2 rounded">
                            🖨️ طباعة
                          </span>
                        )}
                      </div>

                      {acc.notes && <p className="text-[10px] text-slate-400 truncate mt-1">{acc.notes}</p>}
                      {acc.status === 'suspended' && acc.suspensionReason && (
                        <p className="text-[10px] text-rose-400 truncate mt-1 font-bold">
                          ⚠️ سبب الإيقاف: {acc.suspensionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & PIN Reveal Controls for Admin */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-xl">
                      <span className="font-mono text-xs font-black text-amber-400">
                        {isPinRevealed ? acc.pin : '••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePinReveal(acc.id)}
                        className="text-slate-400 hover:text-white p-0.5 ml-1 transition"
                        title={isPinRevealed ? 'إخفاء PIN' : 'إظهار PIN للأدمن'}
                      >
                        {isPinRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Quick Freeze / Unfreeze Button */}
                    <button
                      type="button"
                      onClick={() => toggleAccountSuspensionDirectly(acc)}
                      className={`p-2 rounded-xl border transition cursor-pointer ${
                        (acc.status || 'active') === 'suspended'
                          ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-800/60'
                          : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border-rose-800/60'
                      }`}
                      title={(acc.status || 'active') === 'suspended' ? 'إعادة تفعيل الكود' : 'إلغاء / تجميد كود الموظف'}
                    >
                      <Ban className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(acc)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition cursor-pointer"
                      title="تعديل الصلاحيات والأوبشنز"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(acc)}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-900/40 transition cursor-pointer"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );

            })}
          </div>
        </div>
      </div>

      {/* In-Modal Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="text-lg font-black text-white">
                تأكيد حذف حساب الموظف نهائياً
              </h4>
              <p className="text-xs text-slate-300">
                هل أنت متأكد من رغبتك في حذف حساب{' '}
                <strong className="text-amber-400 font-bold">({accountToDelete.name})</strong>{' '}
                صاحب رمز PIN ({accountToDelete.pin})؟
              </p>
              <p className="text-[11px] text-rose-400 font-medium">
                لن يتمكن هذا الموظف من تسجيل الدخول أو الوصول لأي رحلة بعد الحذف.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                🗑️ نعم، احذف الحساب الآن
              </button>
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer"
              >
                إلغاء التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
