import React, { useState, useMemo } from 'react';
import {
  BadgeDollarSign,
  Plus,
  TrendingUp,
  DollarSign,
  PieChart,
  Tag,
  Calendar,
  Receipt,
  Trash2,
  ArrowDownRight,
  Sparkles,
  CreditCard,
  Search,
  CheckCircle2,
  Printer,
  FileText,
  X,
  Users,
  AlertCircle,
  Landmark,
  ArrowUpRight,
  Filter,
  BarChart3,
  ListFilter,
  Check,
  ChevronLeft,
  Building2,
  Bus,
  Camera,
  Shirt,
  Utensils,
  Music,
  Coins,
  Clock,
  ArrowRightLeft,
  Wallet,
} from 'lucide-react';
import { ExpenseItem, ExpenseCategory, Student, TripSettings, ReceiptVoucher, PaymentMethod } from '../types';
import { CompanySeal } from './CompanySeal';

interface FinancialsProfitProps {
  expenses: ExpenseItem[];
  students: Student[];
  receipts?: ReceiptVoucher[];
  settings: TripSettings;
  onAddExpense: (expense: Omit<ExpenseItem, 'id'>) => void;
  onUpdateExpense?: (updatedExpense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateStudent?: (student: Student) => void;
  onAddReceipt?: (receipt: ReceiptVoucher) => void;
  onOpenTreasuryModal?: () => void;
  onNavigateTab?: (tab: string) => void;
  treasuryBalance?: number;
}

// Helper: Convert number to Arabic words for official receipts
function numberToArabicWords(num: number): string {
  if (num <= 0) return 'صفر جنيه مصري';
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['عشرة', 'أحد عشر', 'إثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  if (num === 100) return 'مائة جنيه مصري فقط لا غير';
  if (num === 200) return 'مائتان جنيه مصري فقط لا غير';
  if (num === 500) return 'خمسمائة جنيه مصري فقط لا غير';
  if (num === 1000) return 'ألف جنيه مصري فقط لا غير';
  if (num === 1200) return 'ألف ومائتان جنيه مصري فقط لا غير';
  if (num === 1500) return 'ألف وخمسمائة جنيه مصري فقط لا غير';

  const processGroup = (n: number): string => {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) result += hundreds[h];

    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder <= 10) {
        result += units[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const u = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (u > 0) result += `${units[u]} و${tens[t]}`;
        else result += tens[t];
      }
    }
    return result;
  };

  let words = '';
  const th = Math.floor(num / 1000);
  const rem = num % 1000;

  if (th > 0) {
    if (th === 1) words += 'ألف';
    else if (th === 2) words += 'ألفان';
    else if (th >= 3 && th <= 10) words += `${units[th]} آلاف`;
    else words += `${processGroup(th)} ألفاً`;
  }

  if (rem > 0) {
    if (words) words += ' و';
    words += processGroup(rem);
  }

  return `${words} جنيه مصري فقط لا غير`;
}

type TabType = 'overview' | 'categories' | 'ledger' | 'student_debts';

export const FinancialsProfit: React.FC<FinancialsProfitProps> = ({
  expenses,
  students,
  receipts = [],
  settings,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onUpdateStudent,
  onAddReceipt,
  onOpenTreasuryModal,
  onNavigateTab,
  treasuryBalance = 0,
}) => {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Filter & Search States
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'fully_paid' | 'deposit' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [paySupplierExpense, setPaySupplierExpense] = useState<ExpenseItem | null>(null);

  // Supplier Payment Form State
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState<number>(0);
  const [supplierPaymentMethod, setSupplierPaymentMethod] = useState<PaymentMethod>('cash');
  const [supplierPaymentNotes, setSupplierPaymentNotes] = useState<string>('');

  // Student Deposit Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('cash');
  const [depositSupervisor, setDepositSupervisor] = useState<string>('إدارة مالية شركة كيان');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [issuedReceiptModal, setIssuedReceiptModal] = useState<ReceiptVoucher | null>(null);

  // Form State for Registering Expense
  const [formData, setFormData] = useState({
    title: '',
    category: 'hotel_resort' as ExpenseCategory,
    amount: 1000,
    paidAmount: 1000,
    paidTo: '',
    date: new Date().toISOString().slice(0, 10),
    receiptNumber: '',
    notes: '',
    paymentMethod: 'cash' as PaymentMethod,
  });

  const categoryLabels: Record<ExpenseCategory, string> = {
    hotel_resort: 'حجز القرية / الفندق 🏨',
    meals: 'الوجبات والإطعام 🍗',
    buses: 'حجز الأتوبيسات 🚌',
    party_supplies: 'مستلزمات الحفلة (شماريخ، ألوان، أساور، نظارات، فوم) 🥳',
    printing: 'المطبوعات والرول أب 🖨️',
    tshirts: 'التيشرتات والبراندنج 👕',
    media_drone: 'الميديا وتصوير الدرون 📸',
    dj_entertainment: 'الـ DJ والفقرات 🎵',
    tolls_fees: 'كارتات الطرق والرسوم 🛣️',
    beverages: 'المشروبات والمياه 🥤',
    tips_petty: 'الإكراميات والمصروفات النثرية 💸',
    other: 'مصروفات أخرى 📦',
  };

  const quickPresets = [
    { title: 'شراء مستلزمات الحفلة (شماريخ، ألوان، أساور، نظارات)', category: 'party_supplies' as ExpenseCategory, paidTo: 'محل مستلزمات الحفلات' },
    { title: 'شراء كراتين مياه ومشروبات للإعاشة', category: 'beverages' as ExpenseCategory, paidTo: 'هايبر ماركت' },
    { title: 'حجز قرية / فندق الرحلة', category: 'hotel_resort' as ExpenseCategory, paidTo: 'إدارة القرية' },
    { title: 'حجز أوتوبيسات النقل', category: 'buses' as ExpenseCategory, paidTo: 'شركة الرحلات' },
    { title: 'طلبية وجبات الغداء للطلاب', category: 'meals' as ExpenseCategory, paidTo: 'المطعم الرئيسي' },
    { title: 'فريق الميديا والتصوير الدرون', category: 'media_drone' as ExpenseCategory, paidTo: 'استوديو التصوير' },
    { title: 'طباعة تيشرتات وهوديز الرحلة', category: 'tshirts' as ExpenseCategory, paidTo: 'المطبعة' },
    { title: 'تجهيزات الـ DJ والمسرح', category: 'dj_entertainment' as ExpenseCategory, paidTo: 'مسؤول الصوتيات' },
  ];

  // Financial Computations
  const totalRevenueExpected = useMemo(() => students.reduce((sum, s) => sum + s.totalAmount, 0), [students]);
  const totalCollected = useMemo(() => students.reduce((sum, s) => sum + s.paidAmount, 0), [students]);
  const totalRemainingBalance = useMemo(
    () => students.reduce((sum, s) => sum + Math.max(0, s.totalAmount - s.paidAmount), 0),
    [students]
  );

  // Expense Financials with Deposits and Remaining Balances
  const totalExpensesAgreed = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [expenses]
  );

  const totalExpensesPaid = useMemo(
    () => expenses.reduce((sum, e) => sum + (e.paidAmount !== undefined ? e.paidAmount : e.amount), 0),
    [expenses]
  );

  const totalExpensesRemaining = useMemo(
    () =>
      expenses.reduce(
        (sum, e) =>
          sum +
          (e.remainingAmount !== undefined
            ? e.remainingAmount
            : Math.max(0, e.amount - (e.paidAmount ?? e.amount))),
        0
      ),
    [expenses]
  );

  // Current Liquid Net Profit in Hand = Actual Cash Collected - Actual Expenses Paid
  const currentNetProfit = totalCollected - totalExpensesPaid;

  // Expected Final Net Profit = Total Revenue Expected - Total Expenses Agreed
  const expectedNetProfit = totalRevenueExpected - totalExpensesAgreed;

  const profitMarginPercent = totalCollected > 0 ? Math.round((currentNetProfit / totalCollected) * 100) : 0;
  const profitPerTicket = students.length > 0 ? Math.round(expectedNetProfit / students.length) : 0;

  const studentsWithRemaining = useMemo(
    () => students.filter((s) => s.totalAmount - s.paidAmount > 0),
    [students]
  );

  const supplierDebtsCount = useMemo(
    () =>
      expenses.filter((e) => {
        const rem = e.remainingAmount !== undefined ? e.remainingAmount : Math.max(0, e.amount - (e.paidAmount ?? e.amount));
        return rem > 0;
      }).length,
    [expenses]
  );

  // Expense Category Breakdown Computations
  const categoryBreakdown = useMemo(() => {
    const map: Record<
      ExpenseCategory,
      { total: number; paid: number; remaining: number; count: number }
    > = {
      hotel_resort: { total: 0, paid: 0, remaining: 0, count: 0 },
      meals: { total: 0, paid: 0, remaining: 0, count: 0 },
      buses: { total: 0, paid: 0, remaining: 0, count: 0 },
      party_supplies: { total: 0, paid: 0, remaining: 0, count: 0 },
      printing: { total: 0, paid: 0, remaining: 0, count: 0 },
      tshirts: { total: 0, paid: 0, remaining: 0, count: 0 },
      media_drone: { total: 0, paid: 0, remaining: 0, count: 0 },
      dj_entertainment: { total: 0, paid: 0, remaining: 0, count: 0 },
      tolls_fees: { total: 0, paid: 0, remaining: 0, count: 0 },
      beverages: { total: 0, paid: 0, remaining: 0, count: 0 },
      tips_petty: { total: 0, paid: 0, remaining: 0, count: 0 },
      other: { total: 0, paid: 0, remaining: 0, count: 0 },
    };

    expenses.forEach((e) => {
      const cat = map[e.category] ? e.category : 'other';
      const paid = e.paidAmount !== undefined ? e.paidAmount : e.amount;
      const rem = e.remainingAmount !== undefined ? e.remainingAmount : Math.max(0, e.amount - paid);

      map[cat].total += e.amount;
      map[cat].paid += paid;
      map[cat].remaining += rem;
      map[cat].count += 1;
    });

    return map;
  }, [expenses]);

  // Filtered Expenses List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;

      const paid = e.paidAmount !== undefined ? e.paidAmount : e.amount;
      const rem = e.remainingAmount !== undefined ? e.remainingAmount : Math.max(0, e.amount - paid);
      let status: 'fully_paid' | 'deposit' | 'unpaid' = 'fully_paid';
      if (rem > 0) {
        status = paid > 0 ? 'deposit' : 'unpaid';
      }

      const matchesStatus = expenseStatusFilter === 'all' || status === expenseStatusFilter;

      const matchesSearch =
        !searchQuery.trim() ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.paidTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.receiptNumber && e.receiptNumber.includes(searchQuery));

      return matchesCategory && matchesStatus && matchesSearch;
    });
  }, [expenses, selectedCategory, expenseStatusFilter, searchQuery]);

  // Filtered Students List for Debts Tab
  const filteredDebtStudents = useMemo(() => {
    return studentsWithRemaining.filter((s) => {
      if (!studentSearchTerm.trim()) return true;
      const q = studentSearchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.ticketCode.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.university && s.university.toLowerCase().includes(q))
      );
    });
  }, [studentsWithRemaining, studentSearchTerm]);

  // Selected Student Object for Deposit Modal
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || studentsWithRemaining[0] || students[0];
  }, [students, selectedStudentId, studentsWithRemaining]);

  // Quick Open Add Expense Modal for a specific category
  const handleOpenAddExpenseWithCategory = (cat: ExpenseCategory = 'hotel_resort') => {
    setFormData({
      title: '',
      category: cat,
      amount: 1000,
      paidAmount: 1000,
      paidTo: '',
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: '',
      notes: '',
      paymentMethod: 'cash',
    });
    setIsModalOpen(true);
  };

  // Open Deposit Modal for student
  const handleOpenDepositForStudent = (studentId?: string) => {
    const target = studentId ? students.find((s) => s.id === studentId) : studentsWithRemaining[0] || students[0];
    if (target) {
      setSelectedStudentId(target.id);
      const rem = Math.max(0, target.totalAmount - target.paidAmount);
      setDepositAmount(rem > 0 ? Math.min(500, rem) : 0);
      setDepositNotes(`عربون/قسط حجز رحلة (${settings.tripName})`);
    }
    setIsDepositModalOpen(true);
  };

  // Open Pay Supplier Installment Modal
  const handleOpenPaySupplier = (expense: ExpenseItem) => {
    const paid = expense.paidAmount !== undefined ? expense.paidAmount : expense.amount;
    const remaining = expense.remainingAmount !== undefined ? expense.remainingAmount : Math.max(0, expense.amount - paid);

    setPaySupplierExpense(expense);
    setSupplierPaymentAmount(remaining);
    setSupplierPaymentMethod(expense.paymentMethod || 'cash');
    setSupplierPaymentNotes(`سداد دفعة للمورد (${expense.paidTo}) - بند: ${expense.title}`);
  };

  // Confirm Supplier Payment
  const handleConfirmSupplierPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplierExpense || !onUpdateExpense) return;

    if (supplierPaymentAmount <= 0) {
      alert('برجاء إدخال مبلغ سداد أكبر من صفر');
      return;
    }

    const currentPaid = paySupplierExpense.paidAmount !== undefined ? paySupplierExpense.paidAmount : paySupplierExpense.amount;
    const newTotalPaid = Math.min(paySupplierExpense.amount, currentPaid + supplierPaymentAmount);
    const newRemaining = Math.max(0, paySupplierExpense.amount - newTotalPaid);
    const newStatus = newRemaining <= 0 ? 'fully_paid' : 'deposit';

    const updatedNotes = supplierPaymentNotes.trim()
      ? `${paySupplierExpense.notes ? paySupplierExpense.notes + ' | ' : ''}سداد دفعة (${supplierPaymentAmount} ج.م) بتاريخ ${new Date().toISOString().slice(0, 10)}`
      : paySupplierExpense.notes;

    const updatedExpense: ExpenseItem = {
      ...paySupplierExpense,
      paidAmount: newTotalPaid,
      remainingAmount: newRemaining,
      paymentStatus: newStatus,
      paymentMethod: supplierPaymentMethod,
      notes: updatedNotes,
    };

    onUpdateExpense(updatedExpense);

    if (onAddReceipt) {
      const voucherNum = `PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newVoucher: ReceiptVoucher = {
        id: `pv-${Date.now()}`,
        voucherNumber: voucherNum,
        type: 'payment',
        personName: paySupplierExpense.paidTo || 'المورد',
        amount: supplierPaymentAmount,
        amountInWords: numberToArabicWords(supplierPaymentAmount),
        reason: `سداد دفعة/متبقي مصروف (${paySupplierExpense.title}) - المتبقي بعد السداد: ${newRemaining} ج.م`,
        paymentMethod: supplierPaymentMethod,
        date: new Date().toISOString().slice(0, 10),
        supervisorName: depositSupervisor || 'الإدارة المالية',
      };
      onAddReceipt(newVoucher);
      setIssuedReceiptModal(newVoucher);
    }

    setPaySupplierExpense(null);
    setSupplierPaymentAmount(0);
    setSupplierPaymentNotes('');
  };

  // Submit Deposit Payment for Student
  const handleConfirmDepositPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('برجاء اختيار طالب لسداد العربون');
      return;
    }

    if (depositAmount <= 0) {
      alert('برجاء إدخال مبلغ عربون أكبر من صفر');
      return;
    }

    const currentPaid = selectedStudent.paidAmount || 0;
    const newTotalPaid = currentPaid + depositAmount;
    const newRemaining = Math.max(0, selectedStudent.totalAmount - newTotalPaid);
    const newStatus = newRemaining <= 0 ? 'paid' : 'deposit';

    if (onUpdateStudent) {
      onUpdateStudent({
        ...selectedStudent,
        paidAmount: newTotalPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        paymentMethod: depositMethod,
      });
    }

    const receiptNum = `RC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reasonText = depositNotes.trim()
      ? `${depositNotes.trim()} - كود الطالب: ${selectedStudent.ticketCode} - المتبقي بعد السداد: ${newRemaining} ج.م`
      : `دفعة/عربون حجز رحلة (${settings.tripName}) - كود: ${selectedStudent.ticketCode} - المتبقي: ${newRemaining} ج.م`;

    const newReceipt: ReceiptVoucher = {
      id: `rcpt-${Date.now()}`,
      voucherNumber: receiptNum,
      type: 'receipt',
      personName: selectedStudent.name,
      amount: depositAmount,
      amountInWords: numberToArabicWords(depositAmount),
      reason: reasonText,
      paymentMethod: depositMethod,
      date: new Date().toISOString().slice(0, 10),
      supervisorName: depositSupervisor || 'مسؤول المالية',
    };

    if (onAddReceipt) {
      onAddReceipt(newReceipt);
    }

    setIsDepositModalOpen(false);
    setIssuedReceiptModal(newReceipt);
  };

  // Submit Add Expense Form
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || formData.amount <= 0) {
      alert('برجاء كتابة عنوان المصروف والتكلفة الكلية بشكل صحيح');
      return;
    }

    const paid = Math.min(formData.amount, Math.max(0, formData.paidAmount));
    const remaining = Math.max(0, formData.amount - paid);
    const status = remaining <= 0 ? 'fully_paid' : paid > 0 ? 'deposit' : 'unpaid';

    onAddExpense({
      title: formData.title.trim(),
      category: formData.category,
      amount: formData.amount,
      paidAmount: paid,
      remainingAmount: remaining,
      paidTo: formData.paidTo.trim() || 'جهة غير محدده',
      date: formData.date,
      receiptNumber: formData.receiptNumber.trim(),
      notes: formData.notes.trim(),
      paymentMethod: formData.paymentMethod,
      paymentStatus: status,
    });

    setIsModalOpen(false);
    setFormData({
      title: '',
      category: 'hotel_resort',
      amount: 1000,
      paidAmount: 1000,
      paidTo: '',
      date: new Date().toISOString().slice(0, 10),
      receiptNumber: '',
      notes: '',
      paymentMethod: 'cash',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header Banner & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <BadgeDollarSign className="w-4 h-4" />
              المحرك المالي والمصروفات المستحقة
            </div>
            <h2 className="text-2xl font-black text-white">إدارة المصروفات، العربون، والمستحقات المتبقية</h2>
            <p className="text-xs text-slate-400 mt-1">
              تسجيل تكاليف الموردين والقرية مع متابعة العربون المدفوع والمتبقي، وتصفية الأرباح الصافية بكل دقة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setFormData({
                  title: '',
                  category: 'hotel_resort',
                  amount: 1000,
                  paidAmount: 1000,
                  paidTo: '',
                  date: new Date().toISOString().slice(0, 10),
                  receiptNumber: '',
                  notes: '',
                  paymentMethod: 'cash',
                });
                setIsModalOpen(true);
              }}
              className="flex-1 lg:flex-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              تسجيل مصروف جديد (عربون / متبقي) 📝
            </button>

            <button
              onClick={() => handleOpenDepositForStudent()}
              className="flex-1 lg:flex-none bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              سداد عربون / قسط طالب 🧾
            </button>

            {onOpenTreasuryModal && (
              <button
                onClick={onOpenTreasuryModal}
                className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                <Landmark className="w-4 h-4 text-indigo-200" />
                الخزنة ({(treasuryBalance ?? 0).toLocaleString()} ج.م)
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            الملخص والأرباح الصافية
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'categories'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PieChart className="w-4 h-4" />
            توزيع المصروفات (القرية والأتوبيسات والوجبات)
            <span className="bg-slate-800 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'ledger'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            سجل كافة المصروفات والديون
            {supplierDebtsCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                {supplierDebtsCount} متبقي للموردين
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('student_debts')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition ${
              activeTab === 'student_debts'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            كشف تحصيلات الطلاب والمتبقي
            {studentsWithRemaining.length > 0 && (
              <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30">
                {studentsWithRemaining.length} متبقي
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & NET PROFIT */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Core KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Liquid Net Profit in Hand */}
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                  السيولة الصافية الحالية (بالخزنة)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {(currentNetProfit ?? 0).toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-1">
                المحصل الفعلي ({(totalCollected ?? 0).toLocaleString()} ج.م) - المصروف والعرابين المدفوعة للموردين ({(totalExpensesPaid ?? 0).toLocaleString()} ج.م)
              </p>
            </div>

            {/* 2. Outstanding Supplier Debts (المتبقي للموردين) */}
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                  إجمالي ديون ومستحقات الموردين
                </span>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {supplierDebtsCount} بند متبقي
                </span>
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">
                {(totalExpensesRemaining ?? 0).toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-1">
                مبالغ متبقية للقرية والأتوبيسات والخدمات ينتظر تسديدها
              </p>
            </div>

            {/* 3. Outstanding Student Debts */}
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs text-rose-400 font-bold uppercase tracking-wider block">
                  متبقي تحصيلات الطلاب (ديون)
                </span>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {studentsWithRemaining.length} طالب
                </span>
              </div>
              <div className="text-3xl font-black text-rose-400 font-mono">
                {(totalRemainingBalance ?? 0).toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-1">
                مبالغ متبقية على الطلاب بعد سداد العربون
              </p>
            </div>

            {/* 4. Total Expected Final Net Profit */}
            <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider block">
                  صافي الربح النهائي المتوقع
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-indigo-300 font-mono">
                {(expectedNetProfit ?? 0).toLocaleString()} <span className="text-sm font-normal">ج.م</span>
              </div>
              <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 mt-1">
                الإيراد الكلي المتوقع - التكلفة الكلية للمصروفات ({(totalExpensesAgreed ?? 0).toLocaleString()} ج.م)
              </p>
            </div>
          </div>

          {/* Detailed Financial Breakdown Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              تفاصيل حركة السيولة والمصروفات بين العربون والمتبقي
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 font-sans block">إجمالي التكلفة الكلية المتفق عليها للمصروفات:</span>
                <span className="text-xl font-black text-white block">{(totalExpensesAgreed ?? 0).toLocaleString()} ج.م</span>
                <span className="text-[10px] text-slate-500 font-sans block">شاملة الفنادق والأتوبيسات والخدمات</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/50 space-y-1">
                <span className="text-emerald-400 font-sans font-bold block">العربونات والمدفوعات المسددة للموردين:</span>
                <span className="text-xl font-black text-emerald-400 block">{(totalExpensesPaid ?? 0).toLocaleString()} ج.م</span>
                <span className="text-[10px] text-slate-500 font-sans block">مبالغ خرجت من الخزنة بالفعل</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-amber-900/50 space-y-1">
                <span className="text-amber-400 font-sans font-bold block">المتبقي والمستحق للشركات والموردين:</span>
                <span className="text-xl font-black text-amber-400 block">{(totalExpensesRemaining ?? 0).toLocaleString()} ج.م</span>
                <span className="text-[10px] text-slate-500 font-sans block">ديون مطلوبة سدادها لاحقاً</span>
              </div>
            </div>
          </div>

          {/* Treasury Action Box */}
          {onOpenTreasuryModal && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/80 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    الخزنة الرئيسية لشركة كيان
                    <span className="bg-amber-500/20 text-amber-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                      رصيد الخزنة الحالي: {(treasuryBalance ?? 0).toLocaleString()} ج.م
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    تحويل أرباح الرحلة الفلية ({(currentNetProfit ?? 0).toLocaleString()} ج.م) أو إجراء تصفية نقدية مباشرة مع الخزنة المركزية
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenTreasuryModal}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
              >
                <ArrowUpRight className="w-4 h-4" />
                إيداع / سحب بالخزنة الرئيسية ↗
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXPENSE CATEGORIES BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-amber-400" />
                  تحليل بنود المصروفات (التكلفة الكلية - العربون - المتبقي)
                </h3>
                <p className="text-xs text-slate-400">
                  تفاصيل المبالغ المسددة والمستحقة لكل بند (القرية، الأتوبيسات، الوجبات، الميديا)
                </p>
              </div>

              <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 font-mono text-xs flex items-center gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">إجمالي المصروفات:</span>
                  <strong className="text-white font-black text-sm">{(totalExpensesAgreed ?? 0).toLocaleString()} ج.م</strong>
                </div>
                <div className="border-r border-slate-800 pr-3">
                  <span className="text-emerald-400 block text-[10px]">المدفوع (عربونات):</span>
                  <strong className="text-emerald-400 font-black text-sm">{(totalExpensesPaid ?? 0).toLocaleString()} ج.م</strong>
                </div>
                <div className="border-r border-slate-800 pr-3">
                  <span className="text-amber-400 block text-[10px]">المتبقي للموردين:</span>
                  <strong className="text-amber-400 font-black text-sm">{(totalExpensesRemaining ?? 0).toLocaleString()} ج.م</strong>
                </div>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(categoryBreakdown) as [ExpenseCategory, { total: number; paid: number; remaining: number; count: number }][]).map(([catKey, stat]) => {
                const label = categoryLabels[catKey as ExpenseCategory] || catKey;
                const pct = totalExpensesAgreed > 0 ? Math.round(((stat?.total ?? 0) / totalExpensesAgreed) * 100) : 0;
                if (!stat || (stat.total === 0 && stat.count === 0)) return null;

                return (
                  <div
                    key={catKey}
                    className="bg-slate-950/90 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl transition space-y-3 relative"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-sm">{label}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">{stat.count} عملية صرف</span>
                      </div>
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                        {pct}% من التكلفة
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-2 rounded-xl text-center font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 font-sans block">التكلفة</span>
                        <span className="text-xs font-black text-white">{(stat.total ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-400 font-sans block">المدفوع</span>
                        <span className="text-xs font-black text-emerald-400">{(stat.paid ?? 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-amber-400 font-sans block">المتبقي</span>
                        <span className={`text-xs font-black ${stat.remaining > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                          {(stat.remaining ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
                      <button
                        onClick={() => {
                          setSelectedCategory(catKey as ExpenseCategory);
                          setActiveTab('ledger');
                        }}
                        className="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1"
                      >
                        عرض بالسجل ↗
                      </button>

                      <button
                        onClick={() => handleOpenAddExpenseWithCategory(catKey as ExpenseCategory)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        إضافة مصروف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXPENSE LEDGER & SUPPLIER DEBTS */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                سجل المصروفات والعربونات وديون الموردين
              </h3>
              <p className="text-xs text-slate-400">استعرض الفواتير، العربون المدفوع، والمتبقي مع إمكانية تسديد المتبقي مباشرة</p>
            </div>

            {/* Filter and Search Controls */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-amber-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">جميع الفئات</option>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="all">جميع حالات الدفع</option>
                <option value="fully_paid">خالص بالكامل 🟢</option>
                <option value="deposit">مسدد عربون (متبقي) 🟡</option>
                <option value="unpaid">غير مدفوع (آجل) 🔴</option>
              </select>

              {/* Search Box */}
              <div className="relative flex-1 lg:w-56">
                <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المصروف أو المورد..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs border-b border-slate-800 font-bold">
                  <th className="py-3.5 px-4">عنوان المصروف</th>
                  <th className="py-3.5 px-4">فئة التكلفة</th>
                  <th className="py-3.5 px-4">صُرِف إلى / المستفيد</th>
                  <th className="py-3.5 px-4">التكلفة الكلية</th>
                  <th className="py-3.5 px-4">العربون / المدفوع</th>
                  <th className="py-3.5 px-4">المتبقي للمورد</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500">
                      لا يوجد مصروفات مطابقة للبحث أو الفلاتر المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => {
                    const paid = expense.paidAmount !== undefined ? expense.paidAmount : expense.amount;
                    const remaining = expense.remainingAmount !== undefined ? expense.remainingAmount : Math.max(0, expense.amount - paid);
                    const isFullyPaid = remaining <= 0;

                    return (
                      <tr key={expense.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{expense.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {expense.date} {expense.receiptNumber ? `• رقم: ${expense.receiptNumber}` : ''}
                          </span>
                          {expense.notes && <p className="text-[11px] text-slate-400 mt-0.5">{expense.notes}</p>}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="bg-slate-800 text-amber-300 border border-slate-700 text-xs px-2.5 py-1 rounded-full font-bold">
                            {categoryLabels[expense.category] || expense.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 font-semibold">
                          <span className="block text-white font-bold">{expense.paidTo || 'جهة غير محدده'}</span>
                          <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800 inline-block mt-0.5">
                            {expense.paymentMethod === 'vodafone_cash'
                              ? 'فودافون كاش 📱'
                              : expense.paymentMethod === 'instapay'
                              ? 'إنستا باي 💳'
                              : expense.paymentMethod === 'bank_transfer'
                              ? 'تحويل بنكي 🏛️'
                              : 'نقداً 💵'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-white text-sm">
                          {(expense.amount ?? 0).toLocaleString()} ج.م
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                          {(paid ?? 0).toLocaleString()} ج.م
                        </td>

                        <td className="py-3.5 px-4 font-mono font-black text-sm">
                          {remaining > 0 ? (
                            <span className="text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                              {(remaining ?? 0).toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="text-slate-500">0 ج.م</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isFullyPaid ? (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              خالص بالكامل
                            </span>
                          ) : paid > 0 ? (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              مسدد عربون
                            </span>
                          ) : (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              غير مدفوع (آجل)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {remaining > 0 && (
                              <button
                                onClick={() => handleOpenPaySupplier(expense)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-lg font-black text-xs transition shadow active:scale-95 flex items-center gap-1"
                              >
                                <Coins className="w-3.5 h-3.5" />
                                سداد المتبقي
                              </button>
                            )}

                             <button
                              onClick={() => setEditingExpense({ ...expense })}
                              className="text-amber-400 hover:text-amber-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition text-xs font-bold"
                            >
                              تعديل
                            </button>

                            <button
                              onClick={() => setExpenseToDelete(expense)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden divide-y divide-slate-800">
            {filteredExpenses.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">لا يوجد مصروفات مطابقة.</p>
            ) : (
              filteredExpenses.map((expense) => {
                const paid = expense.paidAmount !== undefined ? expense.paidAmount : expense.amount;
                const remaining = expense.remainingAmount !== undefined ? expense.remainingAmount : Math.max(0, expense.amount - paid);

                return (
                  <div key={expense.id} className="py-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{expense.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          المستفيد: <strong className="text-slate-200">{expense.paidTo || '-'}</strong>
                        </span>
                      </div>

                      <span className="bg-slate-800 text-amber-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {categoryLabels[expense.category] || expense.category}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl text-center font-mono text-xs border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">التكلفة</span>
                        <strong className="text-white block">{(expense.amount ?? 0).toLocaleString()} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 block font-sans">المدفوع</span>
                        <strong className="text-emerald-400 block">{(paid ?? 0).toLocaleString()} ج.م</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-400 block font-sans">المتبقي</span>
                        <strong className={remaining > 0 ? 'text-amber-400 block' : 'text-slate-500 block'}>
                          {(remaining ?? 0).toLocaleString()} ج.م
                        </strong>
                      </div>
                    </div>

                    {expense.notes && <p className="text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded-lg">{expense.notes}</p>}

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-500 font-mono text-[10px]">{expense.date}</span>

                      <div className="flex items-center gap-2">
                        {remaining > 0 && (
                          <button
                            onClick={() => handleOpenPaySupplier(expense)}
                            className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-xs"
                          >
                            سداد المتبقي 💵
                          </button>
                        )}
                        <button
                          onClick={() => setEditingExpense({ ...expense })}
                          className="text-amber-400 font-bold"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(expense)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT DEBTS */}
      {/* ========================================================================= */}
      {activeTab === 'student_debts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                كشف المتبقي طرف الطلاب والسندات
              </h3>
              <p className="text-xs text-slate-400">
                قائمة كافة الطلاب الذين لم يستكملوا سداد قيمة التذكرة بعد دفع العربون
              </p>
            </div>

            {/* Student Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                placeholder="بحث باسم الطالب أو الكود..."
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Table of Students */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-xs border-b border-slate-800 font-bold">
                  <th className="py-3.5 px-4">اسم الطالب / الكود</th>
                  <th className="py-3.5 px-4">رقم الهاتف</th>
                  <th className="py-3.5 px-4">الكلية / الجامعة</th>
                  <th className="py-3.5 px-4">قيمة التذكرة</th>
                  <th className="py-3.5 px-4">المسدد سابقاً</th>
                  <th className="py-3.5 px-4">المتبقي حالياً</th>
                  <th className="py-3.5 px-4 text-center">تحصيل الآن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                {filteredDebtStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      🎉 لا يوجد طلاب متبقي عليهم ديون أو مبالغ معلقة!
                    </td>
                  </tr>
                ) : (
                  filteredDebtStudents.map((s) => {
                    const remaining = Math.max(0, s.totalAmount - s.paidAmount);
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">{s.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono">كود: {s.ticketCode}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{s.phone}</td>
                        <td className="py-3.5 px-4 text-slate-400">{s.university || '-'}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                          {(s.totalAmount ?? 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {(s.paidAmount ?? 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-rose-400 bg-rose-500/5 px-2 py-1 rounded">
                          {(remaining ?? 0).toLocaleString()} ج.م
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenDepositForStudent(s.id)}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow active:scale-95 mx-auto"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            سداد قسط/عربون
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PAY SUPPLIER REMAINING BALANCE MODAL */}
      {/* ========================================================================= */}
      {paySupplierExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                سداد دفعة للمورد / الشركه
              </h3>
              <button onClick={() => setPaySupplierExpense(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-xs text-amber-400 font-bold block">{paySupplierExpense.title}</span>
              <div className="flex justify-between text-xs text-slate-300 pt-1 border-t border-slate-800 font-mono">
                <span>المستفيد: <strong>{paySupplierExpense.paidTo}</strong></span>
                <span>التكلفة الكلية: <strong>{(paySupplierExpense.amount ?? 0).toLocaleString()} ج.م</strong></span>
              </div>
              <div className="flex justify-between text-xs pt-1 font-mono">
                <span className="text-emerald-400">المدفوع سابقاً: <strong>{(paySupplierExpense.paidAmount ?? paySupplierExpense.amount ?? 0).toLocaleString()} ج.م</strong></span>
                <span className="text-amber-400 font-bold">المتبقي حالياً: <strong>{(paySupplierExpense.remainingAmount ?? ((paySupplierExpense.amount ?? 0) - (paySupplierExpense.paidAmount ?? paySupplierExpense.amount ?? 0))).toLocaleString()} ج.م</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmSupplierPayment} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-400 font-black mb-1">المبلغ المراد سداده الآن (ج.م) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={paySupplierExpense.remainingAmount ?? (paySupplierExpense.amount - (paySupplierExpense.paidAmount ?? paySupplierExpense.amount))}
                    value={supplierPaymentAmount}
                    onChange={(e) => setSupplierPaymentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border-2 border-emerald-500/80 text-emerald-400 text-lg font-black rounded-xl px-3 py-2 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة الدفع للمورد *</label>
                  <select
                    value={supplierPaymentMethod}
                    onChange={(e) => setSupplierPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="cash">نقداً (Cash 💵)</option>
                    <option value="vodafone_cash">فودافون كاش (Vodafone Cash 📱)</option>
                    <option value="instapay">إنستا باي (InstaPay 💳)</option>
                    <option value="bank_transfer">تحويل بنكي (Bank Transfer 🏛️)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ملاحظات السداد / رقم التحويل</label>
                <input
                  type="text"
                  value={supplierPaymentNotes}
                  onChange={(e) => setSupplierPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none"
                  placeholder="مثال: تم التحويل عبر فودافون كاش برقم عملية 988"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaySupplierExpense(null)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ الدفعة وإستخراج سند صرف للمورد 🧾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW EXPENSE (تسجيل مصروف ببيانات كاملة وعربون ومتبقي) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                تسجيل مصروف جديد (التكلفة - العربون - المتبقي)
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-bold block">اختيار سريع لنوع المصروف:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        title: preset.title,
                        category: preset.category,
                        paidTo: preset.paidTo,
                      }));
                    }}
                    className="bg-slate-950 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-500/50 text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
                  >
                    + {preset.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs sm:text-sm pt-2">
              <div>
                <label className="block text-slate-300 font-bold mb-1">عنوان المصروف / البند *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                  placeholder="مثال: عربون حجز قرية ريتال فيو أو 6 أوتوبيسات"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">فئة التكلفة *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none font-bold"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">صُرِف إلى (المستفيد/الشركة) *</label>
                  <input
                    type="text"
                    required
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 focus:border-amber-500 focus:outline-none"
                    placeholder="اسم الشركة أو المورد"
                  />
                </div>
              </div>

              {/* Financial Breakdown Section (التكلفة الكلية والعربون والمتبقي) */}
              <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-200 font-black mb-1">
                      إجمالي التكلفة المتفق عليها (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.amount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          amount: val,
                          paidAmount: Math.min(prev.paidAmount, val),
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white font-black text-base rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-400 font-black mb-1">
                      المبلغ المدفوع حالياً (العربون) (ج.م) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={formData.amount}
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border-2 border-emerald-500/80 text-emerald-400 font-black text-base rounded-xl px-3 py-2 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Deposit Ratio Quick Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-bold">نسبة العربون السريعة:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paidAmount: prev.amount }))}
                      className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 hover:bg-emerald-500/30"
                    >
                      خالص (100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paidAmount: Math.round(prev.amount * 0.5) }))}
                      className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/30"
                    >
                      عربون 50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paidAmount: Math.round(prev.amount * 0.25) }))}
                      className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/30"
                    >
                      عربون 25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, paidAmount: 0 }))}
                      className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 hover:bg-rose-500/30"
                    >
                      آجل (0%)
                    </button>
                  </div>
                </div>

                {/* Auto Calculated Remaining Balance Display */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center font-mono">
                  <span className="text-xs text-slate-300 font-sans font-bold">المتبقي للمورد (دين معلق):</span>
                  <span className={`text-base font-black ${formData.amount - formData.paidAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {(Math.max(0, (formData.amount || 0) - (formData.paidAmount || 0)) ?? 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">طريقة الدفع *</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-bold focus:border-amber-500 focus:outline-none text-xs"
                  >
                    <option value="cash">نقداً (Cash 💵)</option>
                    <option value="vodafone_cash">فودافون كاش 📱</option>
                    <option value="instapay">إنستا باي 💳</option>
                    <option value="bank_transfer">تحويل بنكي 🏛️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">رقم الإيصال / الفاتورة</label>
                  <input
                    type="text"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="مثال: REC-9920"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">تفاصيل وملاحظات الاتفاق</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  placeholder="ملاحظات حول المواعيد أو شروط السداد والخدمات المشمولة..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  حفظ المصروف بالعربون ✍️
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT EXPENSE MODAL */}
      {/* ========================================================================= */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                تعديل بيانات المصروف
              </h3>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateExpense && editingExpense) {
                  const paid = Math.min(editingExpense.amount, Math.max(0, editingExpense.paidAmount ?? editingExpense.amount));
                  const remaining = Math.max(0, editingExpense.amount - paid);
                  const status = remaining <= 0 ? 'fully_paid' : paid > 0 ? 'deposit' : 'unpaid';

                  onUpdateExpense({
                    ...editingExpense,
                    paidAmount: paid,
                    remainingAmount: remaining,
                    paymentStatus: status,
                  });
                }
                setEditingExpense(null);
              }}
              className="space-y-3 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">عنوان المصروف</label>
                <input
                  type="text"
                  required
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">فئة التكلفة</label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, category: e.target.value as any })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none font-bold"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">صُرِف إلى (المستفيد)</label>
                  <input
                    type="text"
                    required
                    value={editingExpense.paidTo}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paidTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-200 font-bold mb-1">التكلفة الكلية (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={editingExpense.amount}
                    onChange={(e) => {
                      const newTotal = Number(e.target.value) || 0;
                      setEditingExpense({
                        ...editingExpense,
                        amount: newTotal,
                        paidAmount: Math.min(newTotal, editingExpense.paidAmount ?? newTotal),
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-emerald-400 font-bold mb-1">العربون / المدفوع (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={editingExpense.paidAmount ?? editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paidAmount: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-emerald-500/60 text-emerald-400 rounded-xl px-3 py-2 font-mono focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Quick Preset Ratios */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense({ ...editingExpense, paidAmount: editingExpense.amount })}
                  className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] py-1.5 rounded-lg font-bold transition"
                >
                  خالص 100%
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense({ ...editingExpense, paidAmount: Math.round(editingExpense.amount / 2) })}
                  className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] py-1.5 rounded-lg font-bold transition"
                >
                  عربون 50%
                </button>
                <button
                  type="button"
                  onClick={() => setEditingExpense({ ...editingExpense, paidAmount: 0 })}
                  className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] py-1.5 rounded-lg font-bold transition"
                >
                  آجل 0%
                </button>
              </div>

              <div className="flex justify-between items-center text-xs font-mono bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-sans">المتبقي للمورد:</span>
                <span className="text-amber-400 font-black">
                  {(Math.max(0, (editingExpense.amount || 0) - (editingExpense.paidAmount ?? editingExpense.amount ?? 0)) ?? 0).toLocaleString()} ج.م
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    required
                    value={editingExpense.date || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">طريقة الدفع</label>
                  <select
                    value={editingExpense.paymentMethod || 'cash'}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="cash">نقداً 💵</option>
                    <option value="vodafone_cash">فودافون كاش 📱</option>
                    <option value="instapay">إنستا باي 💳</option>
                    <option value="bank_transfer">تحويل بنكي 🏛️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم الإيصال</label>
                  <input
                    type="text"
                    value={editingExpense.receiptNumber || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, receiptNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-2.5 py-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={editingExpense.notes || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-slate-950 font-bold px-6 py-2 rounded-xl shadow-lg shadow-amber-500/20"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Expense Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف المصروف
              </h3>
              <button onClick={() => setExpenseToDelete(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-slate-300">
              هل أنت تأكد من حذف مصروف <strong className="text-amber-400">{expenseToDelete.title}</strong> بقيمة <span className="text-emerald-400 font-mono">{(expenseToDelete.amount ?? 0).toLocaleString()} ج.م</span>؟
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20"
              >
                نعم، حذف المصروف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: OFFICIAL ISSUED RECEIPT MODAL */}
      {/* ========================================================================= */}
      {issuedReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">تم تسديد المبلغ وإستخراج الإيصال بنجاح 🎉</h3>
                  <p className="text-xs text-slate-400">إيصال معتمد برقم: {issuedReceiptModal.voucherNumber}</p>
                </div>
              </div>
              <button onClick={() => setIssuedReceiptModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Official Receipt Sheet */}
            <div className="bg-white text-slate-900 rounded-xl p-6 shadow-xl border-4 border-emerald-700 space-y-4 text-right relative overflow-hidden font-sans text-xs sm:text-sm">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none select-none">
                <CompanySeal
                  companyNameAr={settings.companyNameAr || 'شركة كيان لتنظيم الرحلات'}
                  companyNameEn={settings.companyNameEn || 'KAYAN EVENTS'}
                  licenseNo={settings.companyLicenseNo || 'KYN-2026-REG'}
                  color="#047857"
                  size={280}
                  showControls={false}
                />
              </div>

              <div className="bg-emerald-800 text-white p-3 rounded-lg flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-black text-base">{settings.companyNameAr || 'شركة كيان للرحلات والفعاليات'}</h3>
                  <p className="text-[10px] text-emerald-200">KAYAN Events & Travel Management</p>
                </div>
                <div className="text-left font-mono">
                  <span className="bg-emerald-950 text-amber-300 font-bold px-2.5 py-1 rounded text-xs block">
                    {issuedReceiptModal.type === 'receipt' ? 'سند قبض نقدية • RECEIPT' : 'سند صرف نقدية • PAYMENT VOUCHER'}
                  </span>
                  <span className="text-[11px] text-emerald-200 block mt-0.5">
                    رقم: {issuedReceiptModal.voucherNumber}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] block">التاريخ:</span>
                  <span className="font-mono font-bold text-slate-900">{issuedReceiptModal.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">المبلغ:</span>
                  <span className="font-mono font-black text-emerald-700 text-base">
                    {(issuedReceiptModal.amount ?? 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-y border-dashed border-slate-300 py-3">
                <p>
                  <strong>الجهة / الاسم:</strong>{' '}
                  <span className="text-emerald-900 font-bold underline">{issuedReceiptModal.personName}</span>
                </p>
                <p>
                  <strong>مبلغ وقدره بالحروف:</strong>{' '}
                  <span className="font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {issuedReceiptModal.amountInWords || numberToArabicWords(issuedReceiptModal.amount)}
                  </span>
                </p>
                <p>
                  <strong>وذلك عن / السبب:</strong> <span className="text-slate-900">{issuedReceiptModal.reason}</span>
                </p>
                <p>
                  <strong>طريقة السداد:</strong>{' '}
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300 font-bold">
                    {issuedReceiptModal.paymentMethod === 'vodafone_cash'
                      ? 'فودافون كاش 📱'
                      : issuedReceiptModal.paymentMethod === 'instapay'
                      ? 'إنستا باي 💳'
                      : issuedReceiptModal.paymentMethod === 'bank_transfer'
                      ? 'تحويل بنكي 🏛️'
                      : 'نقداً 💵'}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center pt-2">
                <div className="text-center space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">المسؤول / المشرف:</span>
                  <span className="font-semibold text-slate-900 text-xs border-b border-slate-400 pb-0.5 block">
                    {issuedReceiptModal.supervisorName}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <CompanySeal
                    companyNameAr={settings.companyNameAr || 'شركة كيان لتنظيم الرحلات'}
                    companyNameEn={settings.companyNameEn || 'KAYAN EVENTS'}
                    licenseNo={settings.companyLicenseNo || 'KYN-2026-REG'}
                    sealStatusText="سند معتمد • OFFICIAL"
                    color="#047857"
                    rotation={-6}
                    size={110}
                    showControls={false}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                طباعة الإيصال 🖨️
              </button>

              <button
                onClick={() => setIssuedReceiptModal(null)}
                className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
