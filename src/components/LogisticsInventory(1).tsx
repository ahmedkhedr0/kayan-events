import React, { useState, useMemo } from 'react';
import {
  Package,
  GlassWater,
  Sparkles,
  HeartPulse,
  Wallet,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  UserCheck,
  Search,
  Filter,
  Printer,
  Share2,
  Bus,
  Shirt,
  Utensils,
  Radio,
  ShieldAlert,
  Check,
  X,
  RefreshCw,
  Layers,
  Calculator,
  Info,
  TrendingUp,
  AlertCircle,
  FileText,
  CheckCheck,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Boxes,
  Zap,
  ArrowUpRight,
  BadgeDollarSign,
} from 'lucide-react';
import {
  LogisticsItem,
  LogisticsCategory,
  Student,
  TripSettings,
  DriverInfo,
  ExpenseItem,
  TShirtSize,
  getCompanionMealInfo,
} from '../types';

interface LogisticsInventoryProps {
  logistics: LogisticsItem[];
  students?: Student[];
  settings?: TripSettings;
  drivers?: DriverInfo[];
  expenses?: ExpenseItem[];
  onUpdateQuantity: (id: string, deltaConsumed: number) => void;
  onAddLogisticsItem: (item: Omit<LogisticsItem, 'id'>) => void;
  onBatchAddLogistics?: (items: Array<Omit<LogisticsItem, 'id'>>) => void;
  onUpdateLogisticsItem?: (updatedItem: LogisticsItem) => void;
  onDeleteLogisticsItem?: (id: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const LogisticsInventory: React.FC<LogisticsInventoryProps> = ({
  logistics,
  students = [],
  settings,
  drivers = [],
  expenses = [],
  onUpdateQuantity,
  onAddLogisticsItem,
  onBatchAddLogistics,
  onUpdateLogisticsItem,
  onDeleteLogisticsItem,
  onNavigateTab,
}) => {
  // Navigation Sub-tabs
  const [activeMainTab, setActiveMainTab] = useState<
    'catalog' | 'custody' | 'demand_matching' | 'smart_calc'
  >('catalog');

  // Category & Status Filters
  const [activeCategoryTab, setActiveCategoryTab] = useState<
    'all' | LogisticsCategory
  >('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'low' | 'good'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusFilter, setSelectedBusFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LogisticsItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LogisticsItem | null>(null);

  // Form State for new item
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'beverages' as LogisticsCategory,
    totalQuantity: 50,
    consumedQuantity: 0,
    unit: 'كرتونة',
    assignedTo: 'مشرف الأتوبيس',
    assignedBus: 1 as number | undefined,
    status: 'good' as const,
    estimatedCost: 0,
    location: 'المخزن المركزي',
    handoverConfirmed: true,
    notes: '',
  });

  const categoryLabels: Record<LogisticsCategory, { label: string; icon: string; color: string }> = {
    beverages: { label: 'المشروبات والإعاشة', icon: '🥤', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    party_branding: { label: 'مستلزمات الحفلة والبراندنج', icon: '🥳', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    apparel: { label: 'الملابس والهدايا التذكارية', icon: '👕', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    first_aid: { label: 'حقائب الإسعافات والطوارئ', icon: '🩺', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    tech_sound: { label: 'المعدات التقنية والصوتيات', icon: '📻', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    petty_cash: { label: 'العهد النقدية الطارئة', icon: '💸', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    other: { label: 'مستلزمات أخرى', icon: '📦', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  };

  // Calculations for demand matching
  const totalStudents = students.length;
  const totalBusCount = Math.max(1, drivers.length || settings?.busCount || 6);

  // Sizes demand breakdown from real student data
  const sizesBreakdown = useMemo(() => {
    const counts: Record<TShirtSize, { needed: number; delivered: number }> = {
      S: { needed: 0, delivered: 0 },
      M: { needed: 0, delivered: 0 },
      L: { needed: 0, delivered: 0 },
      XL: { needed: 0, delivered: 0 },
      '2XL': { needed: 0, delivered: 0 },
      '3XL': { needed: 0, delivered: 0 },
      none: { needed: 0, delivered: 0 },
    };

    students.forEach((student) => {
      const size = student.tshirtSize || 'none';
      if (size !== 'none') {
        if (!counts[size]) {
          counts[size] = { needed: 0, delivered: 0 };
        }
        counts[size].needed += 1;
        if (student.tshirtReceived) {
          counts[size].delivered += 1;
        }
      }
    });

    return counts;
  }, [students]);

  const totalApparelNeeded = useMemo(() => {
    return (Object.entries(sizesBreakdown) as Array<[string, { needed: number; delivered: number }]>)
      .filter(([k]) => k !== 'none')
      .reduce((sum, [, v]) => sum + v.needed, 0);
  }, [sizesBreakdown]);

  const totalApparelDelivered = useMemo(() => {
    return (Object.entries(sizesBreakdown) as Array<[string, { needed: number; delivered: number }]>)
      .filter(([k]) => k !== 'none')
      .reduce((sum, [, v]) => sum + v.delivered, 0);
  }, [sizesBreakdown]);

  // Meals demand breakdown
  const mealsDemand = useMemo(() => {
    let mainNeeded = 0;
    let mainDelivered = 0;
    let companionNeeded = 0;
    let companionDelivered = 0;
    const mealTypeCounts: Record<string, number> = {};

    students.forEach((student) => {
      if (student.hasMeal) {
        mainNeeded += 1;
        if (student.mealReceived) mainDelivered += 1;
        const opt = student.mealOption || 'وجبة أساسية';
        mealTypeCounts[opt] = (mealTypeCounts[opt] || 0) + 1;
      }

      const compInfo = getCompanionMealInfo(student, settings);
      if (compInfo.hasMeal) {
        companionNeeded += 1;
        if (compInfo.mealReceived) companionDelivered += 1;
        mealTypeCounts[compInfo.mealName] = (mealTypeCounts[compInfo.mealName] || 0) + 1;
      }
    });

    return {
      totalNeeded: mainNeeded + companionNeeded,
      totalDelivered: mainDelivered + companionDelivered,
      mealTypeCounts,
    };
  }, [students, settings]);

  // Overall Logistics Inventory Stats
  const stats = useMemo(() => {
    const totalItems = logistics.length;
    const totalUnits = logistics.reduce((acc, i) => acc + (Number(i.totalQuantity) || 0), 0);
    const totalConsumed = logistics.reduce((acc, i) => acc + (Number(i.consumedQuantity) || 0), 0);
    const totalRemaining = Math.max(0, totalUnits - totalConsumed);
    const overallConsumptionRate = totalUnits > 0 ? Math.round((totalConsumed / totalUnits) * 100) : 0;

    let criticalCount = 0;
    let lowCount = 0;
    let goodCount = 0;

    logistics.forEach((item) => {
      const rem = Math.max(0, item.totalQuantity - item.consumedQuantity);
      const pctLeft = item.totalQuantity > 0 ? (rem / item.totalQuantity) * 100 : 0;
      if (rem === 0 || pctLeft <= 15) {
        criticalCount += 1;
      } else if (pctLeft <= 35) {
        lowCount += 1;
      } else {
        goodCount += 1;
      }
    });

    const totalEstimatedValue = logistics.reduce(
      (acc, i) => acc + (Number(i.estimatedCost) || 0),
      0
    );

    return {
      totalItems,
      totalUnits,
      totalConsumed,
      totalRemaining,
      overallConsumptionRate,
      criticalCount,
      lowCount,
      goodCount,
      totalEstimatedValue,
    };
  }, [logistics]);

  // Filtered logistics list
  const filteredLogistics = useMemo(() => {
    return logistics.filter((item) => {
      // Category filter
      if (activeCategoryTab !== 'all' && item.category !== activeCategoryTab) {
        return false;
      }

      // Bus filter
      if (selectedBusFilter !== 'all' && item.assignedBus !== selectedBusFilter) {
        return false;
      }

      // Status filter
      const rem = Math.max(0, item.totalQuantity - item.consumedQuantity);
      const pctLeft = item.totalQuantity > 0 ? (rem / item.totalQuantity) * 100 : 0;
      const isCritical = rem === 0 || pctLeft <= 15;
      const isLow = !isCritical && pctLeft <= 35;
      const isGood = !isCritical && !isLow;

      if (statusFilter === 'critical' && !isCritical) return false;
      if (statusFilter === 'low' && !isLow) return false;
      if (statusFilter === 'good' && !isGood) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchAssignee = (item.assignedTo || '').toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchLocation = (item.location || '').toLowerCase().includes(q);
        if (!matchName && !matchAssignee && !matchNotes && !matchLocation) {
          return false;
        }
      }

      return true;
    });
  }, [logistics, activeCategoryTab, selectedBusFilter, statusFilter, searchQuery]);

  // Grouped by Bus for custody handover
  const busCustodyGroup = useMemo(() => {
    const groups: Record<string, LogisticsItem[]> = {
      central: [],
    };

    // Prepare slots for 1 to totalBusCount
    for (let b = 1; b <= totalBusCount; b++) {
      groups[`bus-${b}`] = [];
    }

    logistics.forEach((item) => {
      if (item.assignedBus && item.assignedBus >= 1 && item.assignedBus <= totalBusCount) {
        groups[`bus-${item.assignedBus}`].push(item);
      } else {
        groups['central'].push(item);
      }
    });

    return groups;
  }, [logistics, totalBusCount]);

  // Handlers
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    onAddLogisticsItem({
      name: newItem.name.trim(),
      category: newItem.category,
      totalQuantity: Math.max(1, Number(newItem.totalQuantity)),
      consumedQuantity: Math.max(0, Number(newItem.consumedQuantity)),
      unit: newItem.unit.trim() || 'قطعة',
      assignedTo: newItem.assignedTo.trim() || 'مشرف الباص',
      assignedBus: newItem.assignedBus ? Number(newItem.assignedBus) : undefined,
      status: newItem.status,
      estimatedCost: Number(newItem.estimatedCost) || 0,
      location: newItem.location.trim() || 'المخزن المركزي',
      handoverConfirmed: newItem.handoverConfirmed,
      notes: newItem.notes.trim(),
    });

    setIsAddModalOpen(false);
    setNewItem({
      name: '',
      category: 'beverages',
      totalQuantity: 50,
      consumedQuantity: 0,
      unit: 'كرتونة',
      assignedTo: 'مشرف الأتوبيس',
      assignedBus: 1,
      status: 'good',
      estimatedCost: 0,
      location: 'المخزن المركزي',
      handoverConfirmed: true,
      notes: '',
    });
  };

  // Quick preset loader
  const handleApplyPresetPack = (packType: 'beach' | 'safari' | 'graduation' | 'emergency') => {
    const studentCount = totalStudents || 150;
    const busCount = totalBusCount || 3;

    let presetItems: Array<Omit<LogisticsItem, 'id'>> = [];

    if (packType === 'beach') {
      presetItems = [
        {
          name: 'كراتين مياه معدنية مبردة (330 مل)',
          category: 'beverages',
          totalQuantity: Math.ceil((studentCount * 3) / 20), // 3 bottles per person, 20 per carton
          consumedQuantity: 0,
          unit: 'كرتونة (20 زجاجة)',
          assignedTo: 'مشرفي الأتوبيسات',
          status: 'good',
          location: 'مبردات الأتوبيسات',
          notes: 'توزيع زجاجة في الصباح وزجاجتين في الشاطئ',
        },
        {
          name: 'أساور اليد السيليكون/الورقية للتعريف (Wristbands)',
          category: 'party_branding',
          totalQuantity: studentCount + 30,
          consumedQuantity: 0,
          unit: 'أسورة',
          assignedTo: 'لجنة الاستقبال',
          status: 'good',
          location: 'حقيبة التنظيم الرئيسية',
          notes: 'لتحديد طلاب كيان عند بوابات القرية والشاطئ',
        },
        {
          name: 'أكياس بودرة الألوان الفوسفورية (Color Powder)',
          category: 'party_branding',
          totalQuantity: Math.ceil(studentCount * 0.8),
          consumedQuantity: 0,
          unit: 'كيس مجهز',
          assignedTo: 'تيم الـ DJ والأنشطة',
          status: 'good',
          location: 'مسرح الحفلة',
          notes: 'استخدام في مهرجان الألوان الساعة 04:00 عصراً',
        },
        {
          name: 'سائل الفوم ومدفع الرغوة للـ Foam Party',
          category: 'party_branding',
          totalQuantity: Math.max(3, Math.ceil(studentCount / 60)),
          consumedQuantity: 0,
          unit: 'جالون 20 لتر',
          assignedTo: 'فريق تشغيل الـ DJ',
          status: 'good',
          location: 'محيط حمام السباحة',
          notes: 'خاص بفقرة الفوم بارتي مع الموسيقى',
        },
        {
          name: 'حقائب الإسعافات الأولية وواقي الشمس',
          category: 'first_aid',
          totalQuantity: busCount,
          consumedQuantity: 0,
          unit: 'حقيبة متكاملة',
          assignedTo: 'مشرفي الأتوبيسات',
          status: 'good',
          location: 'في كل أتوبيس حقيبة',
          notes: 'تحتوي على مسكنات، مطهرات، شاش، ومستحضرات الحروق الشمسية',
        },
        {
          name: 'العهدة النقدية الطارئة لكارتات الطرق ونثريات الباص',
          category: 'petty_cash',
          totalQuantity: busCount * 1500,
          consumedQuantity: 0,
          unit: 'جنيه مصري',
          assignedTo: 'المشرف العام',
          status: 'good',
          location: 'خزنة المشرف',
          notes: 'كارتات الطرق، بنزين طوارئ، وإكراميات السائقين',
        },
      ];
    } else if (packType === 'safari') {
      presetItems = [
        {
          name: 'كشافات إضاءة قوية ورؤوس إضاءة ليلية',
          category: 'tech_sound',
          totalQuantity: Math.max(6, busCount * 2),
          consumedQuantity: 0,
          unit: 'كشاف شحن',
          assignedTo: 'مرشدي السفاري والتخييم',
          status: 'good',
          location: 'حقيبة معدات السفاري',
          notes: 'للاستخدام أثناء جولات الوادي والمخيم الليلي',
        },
        {
          name: 'أوشحة وباندانات رملية للحماية من الأتربة',
          category: 'party_branding',
          totalQuantity: studentCount + 20,
          consumedQuantity: 0,
          unit: 'شال / باندانا',
          assignedTo: 'مشرفي البيتش باجي',
          status: 'good',
          location: 'نقطة انطلاق الموتوسيكلات',
        },
        {
          name: 'كراتين مياه ومشروبات كهارل وترطيب',
          category: 'beverages',
          totalQuantity: Math.ceil((studentCount * 3.5) / 20),
          consumedQuantity: 0,
          unit: 'كرتونة',
          assignedTo: 'مشرفي الإعاشة',
          status: 'good',
          location: 'سيارات الدعم اللوجستي',
        },
        {
          name: 'حقائب طوارئ صحراوية ومضادات لسعات ومطهرات',
          category: 'first_aid',
          totalQuantity: busCount + 1,
          consumedQuantity: 0,
          unit: 'حقيبة برية',
          assignedTo: 'المسعف الميداني',
          status: 'good',
          location: 'سيارة القائد',
        },
      ];
    } else if (packType === 'graduation') {
      presetItems = [
        {
          name: 'أرواب وقبعات التخرج الرسمية (Gowns & Caps)',
          category: 'apparel',
          totalQuantity: studentCount,
          consumedQuantity: 0,
          unit: 'طقم كامل',
          assignedTo: 'لجنة البروتوكول والتشريفات',
          status: 'good',
          location: 'غرفة تبديل الملابس بالقاعة',
        },
        {
          name: 'دروع وشهادات التكريم التذكارية',
          category: 'party_branding',
          totalQuantity: studentCount,
          consumedQuantity: 0,
          unit: 'درع تذكاري',
          assignedTo: 'لجنة التكريم',
          status: 'good',
          location: 'خلف منصة التكريم',
        },
        {
          name: 'أجهزة مايكروفون لاسلكية وميجافون للطوارئ',
          category: 'tech_sound',
          totalQuantity: 4,
          consumedQuantity: 0,
          unit: 'جهاز مايك',
          assignedTo: 'مهندس الصوتيات',
          status: 'good',
          location: 'كنترول القاعة',
        },
        {
          name: 'وجبات وسناكس الاستراحة والضيافة VIP',
          category: 'beverages',
          totalQuantity: studentCount + 40,
          consumedQuantity: 0,
          unit: 'علبة ضيافة',
          assignedTo: 'فريق الكيترينج',
          status: 'good',
          location: 'بوفيه الاستراحة',
        },
      ];
    } else {
      // emergency kit
      presetItems = [
        {
          name: 'أجهزة قياس ضغط وسكر وحرارة رقمية',
          category: 'first_aid',
          totalQuantity: 2,
          consumedQuantity: 0,
          unit: 'طقم فحص طبي',
          assignedTo: 'طبيب الرحلة / المشرف الصحي',
          status: 'good',
          location: 'حقيبة الطوارئ الطبية',
        },
        {
          name: 'أكياس ثلج فوري ومثبتات جبائر وضمادات مرنة',
          category: 'first_aid',
          totalQuantity: 25,
          consumedQuantity: 0,
          unit: 'قطعة',
          assignedTo: 'المسعف الميداني',
          status: 'good',
          location: 'حقائب الأتوبيسات',
        },
      ];
    }

    if (onBatchAddLogistics) {
      onBatchAddLogistics(presetItems);
    } else {
      presetItems.forEach((item) => onAddLogisticsItem(item));
    }

    setIsPresetsModalOpen(false);
  };

  // WhatsApp Summary Formatter
  const handleShareWhatsAppSummary = () => {
    const criticalItems = logistics.filter(
      (i) => i.totalQuantity - i.consumedQuantity <= 0 || (i.totalQuantity - i.consumedQuantity) / i.totalQuantity <= 0.15
    );

    let text = `📦 *تقرير اللوجستيات والمخزون - رحلة ${settings?.tripName || 'كيان إيفينتس'}*\n`;
    text += `📅 التاريخ: ${settings?.tripDate || new Date().toLocaleDateString('ar-EG')}\n`;
    text += `👥 عدد المشتركين: ${totalStudents} طالب | 🚌 الحافلات: ${totalBusCount}\n\n`;
    text += `📊 *ملخص الحالة العامة:*\n`;
    text += `• إجمالي بنود العهد: ${stats.totalItems} صنف\n`;
    text += `• إجمالي الوحدات: ${stats.totalUnits} وحدة | المستهلك: ${stats.totalConsumed} (${stats.overallConsumptionRate}%)\n`;
    text += `• المتبقي المتاح: ${stats.totalRemaining} وحدة\n\n`;

    if (criticalItems.length > 0) {
      text += `⚠️ *تنبيه بنود منتهية أو قاربت على النفاذ (${criticalItems.length}):*\n`;
      criticalItems.forEach((ci) => {
        const rem = Math.max(0, ci.totalQuantity - ci.consumedQuantity);
        text += `• ${ci.name}: متبقي ${rem} من ${ci.totalQuantity} ${ci.unit} (${ci.assignedTo || 'مشرف'})\n`;
      });
      text += `\n`;
    }

    text += `👕 *تسليمات الملابس والمقاسات:*\n`;
    text += `• تم تسليم: ${totalApparelDelivered} من إجمالي ${totalApparelNeeded} قطعة (${Math.round((totalApparelDelivered / (totalApparelNeeded || 1)) * 100)}%)\n\n`;

    text += `🍔 *تسليمات الوجبات والإعاشة:*\n`;
    text += `• تم توزيع: ${mealsDemand.totalDelivered} من إجمالي ${mealsDemand.totalNeeded} وجبة\n\n`;

    text += `✨ تم استخراج التقرير عبر نظام إدارة الرحلات - KAYAN Events`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-amber-400" />
                <span>Logistics & Inventory Hub</span>
              </span>
              {stats.criticalCount > 0 && (
                <span className="text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{stats.criticalCount} بنود في الحد الحرج!</span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Package className="w-6 h-6 text-amber-400" />
              <span>إدارة اللوجستيات، المخزون، والعهد الميدانية</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              تتبع استهلاك المياه والعصائر، حقائب الإسعافات الأولية، مستلزمات الفعاليات والفوم، مطابقة مقاسات الملابس، وتوزيع عهد المشرفين للحافلات.
            </p>
          </div>

          {/* Action Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={() => setIsPresetsModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
              title="إدراج حزم مستلزمات جاهزة للرحلات الشاطئية أو السفاري بنقرة واحدة"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>حزم جاهزة ⚡</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95"
              title="طباعة كشف العهدة والمخزون"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">طباعة الكشف</span>
            </button>

            <button
              onClick={handleShareWhatsAppSummary}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-emerald-600/20"
              title="إرسال ملخص المخزون والعهد عبر واتساب للمشرفين"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">مشاركة واتساب</span>
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('financials')}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95"
                title="الانتقال لصفحة المصروفات والمالية لتسجيل فواتير الشراء النقدية"
              >
                <BadgeDollarSign className="w-4 h-4 text-indigo-400" />
                <span className="hidden md:inline">تسجيل فاتورة شراء 💰</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عهدة / صنف</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex overflow-x-auto space-x-2 space-x-reverse pt-4 mt-5 border-t border-slate-800 no-scrollbar">
          <button
            onClick={() => setActiveMainTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>كتالوج المخزون والعهد ({logistics.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('custody')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'custody'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>توزيع عهد المشرفين والحافلات ({totalBusCount} باص)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('demand_matching')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'demand_matching'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>مطابقة طلبات الطلاب (الملابس والوجبات)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('smart_calc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeMainTab === 'smart_calc'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>حاسبة الإعاشة التقديرية 🧮</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Items & Units */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">إجمالي بنود العهد</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">{stats.totalItems}</span>
              <span className="text-xs text-slate-400">صنف مسجل</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
              {stats.totalUnits} وحدة مخزنية
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Consumption Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
          <div className="w-full mr-1">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-bold">معدل الاستهلاك الميداني</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{stats.overallConsumptionRate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  stats.overallConsumptionRate > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${stats.overallConsumptionRate}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>مستهلك: {stats.totalConsumed}</span>
              <span>متبقي: {stats.totalRemaining}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 ml-2">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Critical & Low Alerts */}
        <div
          onClick={() => {
            setActiveMainTab('catalog');
            setStatusFilter(stats.criticalCount > 0 ? 'critical' : 'low');
          }}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">حالة المخزون والحد الحرج</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-xl sm:text-2xl font-black font-mono ${
                  stats.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {stats.criticalCount}
              </span>
              <span className="text-xs text-slate-400">بنود حرجة</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              {stats.lowCount} بنود منخفضة • {stats.goodCount} كافية
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              stats.criticalCount > 0
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            }`}
          >
            {stats.criticalCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>

        {/* Apparel & Meals Handover Summary */}
        <div
          onClick={() => setActiveMainTab('demand_matching')}
          className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <span className="text-[11px] text-slate-400 font-bold block">تسليم الهوديز والوجبات</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">
                {totalApparelDelivered}/{totalApparelNeeded}
              </span>
              <span className="text-xs text-slate-400">تيشرت</span>
            </div>
            <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
              الوجبات: {mealsDemand.totalDelivered}/{mealsDemand.totalNeeded} موزعة
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Shirt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN TAB 1: CATALOG & INVENTORY ITEMS */}
      {activeMainTab === 'catalog' && (
        <div className="space-y-4">
          {/* Controls Bar (Search, Category Filter, View Mode) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم الصنف، المشرف المسؤول، الباص، أو مكان التخزين..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-4 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter & Bus Filter */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">كل الحالات ({logistics.length})</option>
                  <option value="critical">🔴 حد حرج / نفذ ({stats.criticalCount})</option>
                  <option value="low">🟡 مخزون منخفض ({stats.lowCount})</option>
                  <option value="good">🟢 متوفر وكافٍ ({stats.goodCount})</option>
                </select>

                <select
                  value={selectedBusFilter}
                  onChange={(e) =>
                    setSelectedBusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">كل الحافلات والمستودع</option>
                  {Array.from({ length: totalBusCount }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      🚌 باص رقم {i + 1}
                    </option>
                  ))}
                </select>

                {/* View Mode Toggle */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض البطاقات"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg transition ${
                      viewMode === 'table' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="عرض الجدول"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex overflow-x-auto gap-2 pt-2 border-t border-slate-800/80 no-scrollbar">
              <button
                onClick={() => setActiveCategoryTab('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategoryTab === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                الكل ({logistics.length})
              </button>
              {(Object.keys(categoryLabels) as LogisticsCategory[]).map((cat) => {
                const count = logistics.filter((i) => i.category === cat).length;
                if (count === 0 && activeCategoryTab !== cat) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategoryTab(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                      activeCategoryTab === cat
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{categoryLabels[cat].icon}</span>
                    <span>{categoryLabels[cat].label}</span>
                    <span className="opacity-70 font-mono text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty State */}
          {filteredLogistics.length === 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">لا توجد عناصر مطابقة للبحث أو الفلتر</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                يمكنك تجربة تغيير خيارات البحث أو إضافة بنود عهدة ومخزون جديدة أو تطبيق إحدى حزم المستلزمات الجاهزة.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategoryTab('all');
                    setStatusFilter('all');
                    setSelectedBusFilter('all');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  إعادة ضبط الفلاتر 🔄
                </button>
                <button
                  onClick={() => setIsPresetsModalOpen(true)}
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  إدراج حزم سريعة ⚡
                </button>
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && filteredLogistics.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLogistics.map((item) => {
                const remaining = Math.max(0, item.totalQuantity - item.consumedQuantity);
                const percentUsed =
                  item.totalQuantity > 0
                    ? Math.min(100, Math.round((item.consumedQuantity / item.totalQuantity) * 100))
                    : 0;
                const isCritical = remaining === 0 || (item.totalQuantity > 0 && remaining / item.totalQuantity <= 0.15);
                const isLow = !isCritical && item.totalQuantity > 0 && remaining / item.totalQuantity <= 0.35;

                const categoryInfo = categoryLabels[item.category] || categoryLabels.other;

                return (
                  <div
                    key={item.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition space-y-4 flex flex-col justify-between ${
                      isCritical
                        ? 'border-rose-500/40 hover:border-rose-500 ring-1 ring-rose-500/20'
                        : isLow
                        ? 'border-amber-500/40 hover:border-amber-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryInfo.color}`}>
                          {categoryInfo.icon} {categoryInfo.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {item.assignedBus && (
                            <span className="text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Bus className="w-3 h-3" />
                              باص {item.assignedBus}
                            </span>
                          )}
                          {isCritical && (
                            <span className="text-[10px] font-bold bg-rose-500 text-slate-950 px-2 py-0.5 rounded-md animate-pulse">
                              حرج ⚠️
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & Assignee */}
                      <h4 className="text-base font-bold text-white leading-snug">{item.name}</h4>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2 flex-wrap gap-1">
                        {item.assignedTo && (
                          <span className="flex items-center gap-1 text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            المسؤول: <strong className="text-white">{item.assignedTo}</strong>
                          </span>
                        )}
                        {item.location && (
                          <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            📍 {item.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Numbers & Progress Bar */}
                    <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-baseline font-mono">
                        <div>
                          <span className="text-xs text-slate-400">المتبقي:</span>
                          <span
                            className={`text-xl font-black mr-1.5 ${
                              isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {remaining}
                          </span>
                          <span className="text-[10px] text-slate-400 mr-1">{item.unit}</span>
                        </div>
                        <div className="text-left text-xs text-slate-400">
                          <span>من إجمالي {item.totalQuantity}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>مستهلك: {item.consumedQuantity} {item.unit} ({percentUsed}%)</span>
                        <span>{100 - percentUsed}% متاح</span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 text-right">
                        💡 {item.notes}
                      </p>
                    )}

                    {/* Counter Controls & Fast Actions */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        {/* Edit & Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingItem({ ...item })}
                            className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 transition"
                            title="تعديل بيانات العهدة"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            تعديل
                          </button>
                          {onDeleteLogisticsItem && (
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1 transition"
                              title="حذف البند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              حذف
                            </button>
                          )}
                        </div>

                        {/* Fast Counter Controls */}
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            disabled={item.consumedQuantity <= 0}
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                            title="تقليل الاستهلاك بمقدار 1"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono font-bold text-white px-2">
                            {item.consumedQuantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            disabled={item.consumedQuantity >= item.totalQuantity}
                            className="p-1 text-amber-400 hover:text-amber-300 disabled:opacity-30 transition"
                            title="زيادة الاستهلاك بمقدار 1"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Fast Multiplier Buttons (+5, +10, Max, Reset) */}
                      <div className="flex items-center justify-end gap-1 text-[10px] font-mono">
                        <span className="text-slate-500 text-[9px] ml-auto">استهلاك سريع:</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 5)}
                          disabled={item.consumedQuantity >= item.totalQuantity}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 10)}
                          disabled={item.consumedQuantity >= item.totalQuantity}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 transition"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdateLogisticsItem) {
                              onUpdateLogisticsItem({ ...item, consumedQuantity: item.totalQuantity });
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
                          title="استهلاك الكمية بالكامل"
                        >
                          الكل
                        </button>
                        <button
                          onClick={() => {
                            if (onUpdateLogisticsItem) {
                              onUpdateLogisticsItem({ ...item, consumedQuantity: 0 });
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
                          title="تصفير الاستهلاك"
                        >
                          تصفير
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {viewMode === 'table' && filteredLogistics.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="py-3 px-4">اسم الصنف والمستلزمات</th>
                      <th className="py-3 px-3">الفئة</th>
                      <th className="py-3 px-3">الباص / الموقع</th>
                      <th className="py-3 px-3">المسؤول</th>
                      <th className="py-3 px-3 text-center">الكمية الكلية</th>
                      <th className="py-3 px-3 text-center">المستهلك</th>
                      <th className="py-3 px-3 text-center">المتبقي</th>
                      <th className="py-3 px-3 text-center">نسبة الاستهلاك</th>
                      <th className="py-3 px-4 text-center">إجراءات سريعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredLogistics.map((item) => {
                      const remaining = Math.max(0, item.totalQuantity - item.consumedQuantity);
                      const percentUsed =
                        item.totalQuantity > 0
                          ? Math.min(100, Math.round((item.consumedQuantity / item.totalQuantity) * 100))
                          : 0;
                      const isCritical = remaining === 0 || (item.totalQuantity > 0 && remaining / item.totalQuantity <= 0.15);
                      const categoryInfo = categoryLabels[item.category] || categoryLabels.other;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <strong className="text-white block">{item.name}</strong>
                            {item.notes && <span className="text-[10px] text-slate-400 block truncate max-w-xs">{item.notes}</span>}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryInfo.color}`}>
                              {categoryInfo.icon} {categoryInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {item.assignedBus ? `🚌 باص ${item.assignedBus}` : item.location || 'المستودع'}
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {item.assignedTo || '—'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {item.totalQuantity} {item.unit}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                            {item.consumedQuantity}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black">
                            <span className={isCritical ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {remaining} {item.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCritical ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {percentUsed}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                title="-1"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded"
                                title="+1"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingItem({ ...item })}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteLogisticsItem && (
                                <button
                                  onClick={() => setItemToDelete(item)}
                                  className="p-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN TAB 2: SUPERVISOR & BUS CUSTODY ALLOCATION */}
      {activeMainTab === 'custody' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bus className="w-5 h-5 text-indigo-400" />
                توزيع العهد الميدانية حسب الحافلات والمشرفين
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                متابعة الأصناف المسلمة لمشرف كل حافلة (كراتين المياه، الإسعافات الأولية، الأساور، والعهدة النقدية).
              </p>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/20"
            >
              <FileText className="w-4 h-4" />
              طباعة كشوف استلام المشرفين
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bus Cards */}
            {Array.from({ length: totalBusCount }).map((_, idx) => {
              const busNum = idx + 1;
              const busDriver = drivers.find((d) => d.busNumber === busNum);
              const items = busCustodyGroup[`bus-${busNum}`] || [];

              return (
                <div
                  key={busNum}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg"
                >
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold font-mono text-sm">
                        {busNum}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">حافلة رقم {busNum}</h4>
                        <p className="text-xs text-slate-400">
                          المشرف: <strong className="text-amber-300">{busDriver?.supervisorName || `مشرف باص ${busNum}`}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-left font-mono text-xs">
                      <span className="text-slate-400 block text-[10px]">السائق المسؤول:</span>
                      <span className="text-white font-bold">{busDriver?.driverName || 'كابتن الرحلة'}</span>
                    </div>
                  </div>

                  {/* Custody Items Assigned */}
                  {items.length === 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-center text-xs text-slate-500">
                      لم يتم تعيين عهدة مخصصة للباص حتى الآن (يمكنك تعيين الباص عند إضافة أو تعديل الصنف).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {items.map((it) => {
                        const remaining = Math.max(0, it.totalQuantity - it.consumedQuantity);
                        return (
                          <div
                            key={it.id}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white truncate block">{it.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                الكلي: {it.totalQuantity} {it.unit} • المستهلك: {it.consumedQuantity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                متبقي: {remaining}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onUpdateQuantity(it.id, 1)}
                                  className="p-1 bg-slate-800 text-amber-400 rounded"
                                  title="+1 استهلاك"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Central Storage / General Custody */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg lg:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">العهد المركزية ومخزون الفعاليات العام (Central Inventory)</h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {busCustodyGroup['central'].length} صنف عام
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {busCustodyGroup['central'].map((it) => {
                  const remaining = Math.max(0, it.totalQuantity - it.consumedQuantity);
                  return (
                    <div
                      key={it.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="font-bold text-white text-xs leading-snug">{it.name}</h5>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {remaining} {it.unit}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>المسؤول: {it.assignedTo || 'التيم المركزي'}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateQuantity(it.id, 1)}
                            className="text-amber-400 hover:text-amber-300 font-bold"
                          >
                            + استهلاك
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN TAB 3: DEMAND MATCHING (APPAREL & MEALS LIVE STATS) */}
      {activeMainTab === 'demand_matching' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Shirt className="w-5 h-5 text-purple-400" />
                مطابقة طلبات الطلاب الفعلية (المقاسات والوجبات) مع التوزيع
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مقارنة حية لجميع المقاسات والوجبات المسجلة في بيانات حجز الطلاب مع المسلم فعلياً في الرحلة.
              </p>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('students')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-purple-600/20"
              >
                <span>فتح قائمة الطلاب CRM</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sizes Grid Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <span>👕</span>
                <span>توزيع مقاسات الهوديز والتيشرتات (T-Shirts & Hoodies Sizes)</span>
              </h4>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-purple-300 font-bold bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 rounded-lg">
                  إجمالي المطلوب: {totalApparelNeeded}
                </span>
                <span className="text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  المسلم: {totalApparelDelivered}
                </span>
                <span className="text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  المتبقي للتسليم: {Math.max(0, totalApparelNeeded - totalApparelDelivered)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(['S', 'M', 'L', 'XL', '2XL', '3XL'] as TShirtSize[]).map((size) => {
                const data = sizesBreakdown[size] || { needed: 0, delivered: 0 };
                const rem = Math.max(0, data.needed - data.delivered);
                const pct = data.needed > 0 ? Math.round((data.delivered / data.needed) * 100) : 0;

                return (
                  <div
                    key={size}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center space-y-2"
                  >
                    <span className="inline-block font-black font-mono text-base text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                      {size}
                    </span>

                    <div className="space-y-1">
                      <div className="text-xl font-black text-white font-mono">{data.needed}</div>
                      <div className="text-[10px] text-slate-400">قطعة مطلوبة</div>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>

                    <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <span className="text-emerald-400">سلم: {data.delivered}</span>
                      <span className={rem > 0 ? 'text-amber-400' : 'text-slate-500'}>باقي: {rem}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Meals & Catering Demand Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-800 pb-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                <span>طلبيات الوجبات والتغذية المعتمدة (Meals & Catering Demand)</span>
              </h4>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  إجمالي الوجبات: {mealsDemand.totalNeeded}
                </span>
                <span className="text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  الموزعة: {mealsDemand.totalDelivered}
                </span>
                <span className="text-rose-300 font-bold bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg">
                  متبقي للتوزيع: {Math.max(0, mealsDemand.totalNeeded - mealsDemand.totalDelivered)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(mealsDemand.mealTypeCounts).map(([mealName, count]) => (
                <div
                  key={mealName}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{mealName}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">وفقاً لحجوزات الطلاب والمرافقين</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-lg font-black text-amber-400 block">{count}</span>
                    <span className="text-[10px] text-slate-400">وجبة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MAIN TAB 4: SMART LOGISTICS ESTIMATOR & CALCULATOR */}
      {activeMainTab === 'smart_calc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-400" />
                حاسبة الإعاشة واللوجستيات التقديرية للرحلة (Smart Supply Estimator)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                تقدير دقيق وتلقائي لكميات المياه، العصائر، أساور اليد، والمستلزمات بناءً على عدد الطلاب ({totalStudents} طالب) والحافلات ({totalBusCount} باص).
              </p>
            </div>

            <button
              onClick={() => handleApplyPresetPack('beach')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Zap className="w-4 h-4" />
              تطبيق التقديرات كأصناف مخزون فوراً
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Water Estimate */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💧</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">المياه المعدنية (330 مل)</h4>
                  <span className="text-[10px] text-slate-400">بمعدل 3 زجاجات لكل فرد</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>إجمالي الزجاجات المطلوبة:</span>
                  <strong className="text-sky-400 font-bold">{totalStudents * 3} زجاجة</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>عدد الكراتين (20/كرتونة):</span>
                  <strong className="text-white font-bold">{Math.ceil((totalStudents * 3) / 20)} كرتونة</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                  <span>لكل باص:</span>
                  <span>{Math.ceil((totalStudents * 3) / 20 / totalBusCount)} كرتونة</span>
                </div>
              </div>
            </div>

            {/* Juices Estimate */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧃</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">العصائر الطازجة والكانز</h4>
                  <span className="text-[10px] text-slate-400">عبوة مع الغداء + احتياطي</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>إجمالي العبوات الموصى بها:</span>
                  <strong className="text-amber-400 font-bold">{totalStudents + 30} عبوة</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>عدد الصناديق (24/صندوق):</span>
                  <strong className="text-white font-bold">{Math.ceil((totalStudents + 30) / 24)} صندوق</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                  <span>لكل باص:</span>
                  <span>{Math.ceil((totalStudents + 30) / 24 / totalBusCount)} صندوق</span>
                </div>
              </div>
            </div>

            {/* First Aid & Emergency */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🩺</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">حقائب الإسعافات الأولية</h4>
                  <span className="text-[10px] text-slate-400">حقيبة كاملة لكل أتوبيس</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>عدد الحقائب المطلوبة:</span>
                  <strong className="text-rose-400 font-bold">{totalBusCount} حقائب</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>أكياس الثلج الفوري:</span>
                  <strong className="text-white font-bold">{totalBusCount * 3} أكياس</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
                  <span>المسؤولية:</span>
                  <span>مشرف كل حافلة</span>
                </div>
              </div>
            </div>

            {/* Wristbands */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">أساور اليد التعريفية Wristbands</h4>
                  <span className="text-[10px] text-slate-400">للتمييز والأمان عند البوابات</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>إجمالي الأساور:</span>
                  <strong className="text-purple-400 font-bold">{totalStudents + 40} أسورة</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>موزعة للحافلات:</span>
                  <strong className="text-white font-bold">{Math.ceil((totalStudents + 40) / totalBusCount)} / باص</strong>
                </div>
              </div>
            </div>

            {/* Trash Bags & Hygiene */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧹</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">أكياس النظافة وجمع القمامة</h4>
                  <span className="text-[10px] text-slate-400">للحفاظ على نظافة الأتوبيسات</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>رولات الأكياس الكبيرة:</span>
                  <strong className="text-emerald-400 font-bold">{totalBusCount * 2} رول</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>مناديل مبللة وجيل معقم:</span>
                  <strong className="text-white font-bold">{totalBusCount * 2} عبوة</strong>
                </div>
              </div>
            </div>

            {/* Emergency Cash Fund */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💸</span>
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">العهدة النقدية الاحتياطية للطوارئ</h4>
                  <span className="text-[10px] text-slate-400">كارتات طرق ونثريات وإكراميات</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>المبلغ التقديري للباص الواحد:</span>
                  <strong className="text-amber-400 font-bold">1,500 ج.م</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>إجمالي العهدة النقدية:</span>
                  <strong className="text-white font-bold">{(totalBusCount * 1500).toLocaleString()} ج.م</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW LOGISTICS ITEM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                إضافة عهدة / صنف مخزون جديد
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الصنف / العهدة *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  placeholder="مثال: كراتين مياه مبردة 330مل أو أكياس ألوان"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الفئة والتصنيف</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="beverages">🥤 المشروبات والإعاشة</option>
                    <option value="party_branding">🥳 مستلزمات الحفلة والبراندنج</option>
                    <option value="apparel">👕 الملابس والهدايا التذكارية</option>
                    <option value="first_aid">🩺 حقائب الإسعافات والطوارئ</option>
                    <option value="tech_sound">📻 المعدات التقنية والصوتيات</option>
                    <option value="petty_cash">💸 العهد النقدية الطارئة</option>
                    <option value="other">📦 مستلزمات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الحافلة المخصصة</label>
                  <select
                    value={newItem.assignedBus || ''}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        assignedBus: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">🏢 المستودع العام / كل الأتوبيسات</option>
                    {Array.from({ length: totalBusCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        🚌 باص رقم {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الكمية الكلية *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newItem.totalQuantity}
                    onChange={(e) => setNewItem({ ...newItem, totalQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المستهلك مبدئياً</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.consumedQuantity}
                    onChange={(e) => setNewItem({ ...newItem, consumedQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">وحدة القياس</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="كرتونة / كيس / قطعة"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المشرف المسؤول</label>
                  <input
                    type="text"
                    value={newItem.assignedTo}
                    onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="اسم المشرف المسؤول"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مكان التخزين</label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    placeholder="مبرد الباص / المخزن الرئيسي"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات وتعليمات الاستخدام</label>
                <textarea
                  rows={2}
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  placeholder="ملاحظات التسليم أو توقيت التوزيع..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  حفظ العهدة ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT LOGISTICS ITEM */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                تعديل بيانات العهدة والمخزون
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateLogisticsItem) {
                  onUpdateLogisticsItem(editingItem);
                }
                setEditingItem(null);
              }}
              className="space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الصنف *</label>
                <input
                  type="text"
                  required
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الفئة</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="beverages">🥤 المشروبات والإعاشة</option>
                    <option value="party_branding">🥳 مستلزمات الحفلة والبراندنج</option>
                    <option value="apparel">👕 الملابس والهدايا التذكارية</option>
                    <option value="first_aid">🩺 حقائب الإسعافات والطوارئ</option>
                    <option value="tech_sound">📻 المعدات التقنية والصوتيات</option>
                    <option value="petty_cash">💸 العهد النقدية الطارئة</option>
                    <option value="other">📦 مستلزمات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الباص المخصص</label>
                  <select
                    value={editingItem.assignedBus || ''}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        assignedBus: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">🏢 المستودع العام / كل الأتوبيسات</option>
                    {Array.from({ length: totalBusCount }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        🚌 باص رقم {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الكمية الكلية</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingItem.totalQuantity}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, totalQuantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المستهلك</label>
                  <input
                    type="number"
                    min={0}
                    value={editingItem.consumedQuantity}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, consumedQuantity: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">الوحدة</label>
                  <input
                    type="text"
                    required
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">المشرف المسؤول</label>
                  <input
                    type="text"
                    value={editingItem.assignedTo || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, assignedTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مكان التخزين</label>
                  <input
                    type="text"
                    value={editingItem.location || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition"
                >
                  حفظ التعديلات ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRESET KITS WIZARD */}
      {isPresetsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  إدراج حزم مستلزمات وعهدة جاهزة (Preset Packages)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  اختر الباقة المناسبة لنوع رحلتك لحساب وتوليد كافة بنود الإعاشة والمستلزمات تلقائياً.
                </p>
              </div>
              <button
                onClick={() => setIsPresetsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Beach & Resort */}
              <div
                onClick={() => handleApplyPresetPack('beach')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏖️</span>
                  <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    الأكثر طلباً ⭐
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                  باقة الرحلات الشاطئية والداي يوز (Beach & Fun Day)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تشمل: كراتين مياه مبردة (3/طالب)، سائل الفوم، بودرة الألوان، أساور الدخول، حقائب الإسعافات، والعهدة النقدية.
                </p>
                <span className="text-amber-400 font-bold text-xs flex items-center gap-1 pt-1">
                  إدراج الباقة بنقرة واحدة ←
                </span>
              </div>

              {/* Safari & Camping */}
              <div
                onClick={() => handleApplyPresetPack('safari')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏕️</span>
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    سفاري وصحراء
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                  باقة السفاري والتخييم والمغامرات (Safari & Camping)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تشمل: كشافات إضاءة، باندانات رملية، مياه وترطيب مكثف، أجهزة اتصال لاسلكية، وحقائب طوارئ برية.
                </p>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 pt-1">
                  إدراج الباقة بنقرة واحدة ←
                </span>
              </div>

              {/* Graduation & Formal */}
              <div
                onClick={() => handleApplyPresetPack('graduation')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎓</span>
                  <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    حفلات تخرج ومؤتمرات
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                  باقة حفلات التخرج والمؤتمرات (Graduation & Formal)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تشمل: أرواب وقبعات التخرج، الدروع وشهادات التقدير، مايكات لاسلكية، وضيافة VIP.
                </p>
                <span className="text-purple-400 font-bold text-xs flex items-center gap-1 pt-1">
                  إدراج الباقة بنقرة واحدة ←
                </span>
              </div>

              {/* Emergency Medical Kit */}
              <div
                onClick={() => handleApplyPresetPack('emergency')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-2xl p-4 cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🩺</span>
                  <span className="text-[10px] font-bold bg-rose-500/15 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                    طوارئ وإسعافات
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                  باقة الإسعافات الأولية والفحص الطبي المتقدم
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تشمل: أجهزة قياس الضغط والسكر، أكياس ثلج فوري، مسكنات معتمدة، ومثبتات جبائر وضمادات.
                </p>
                <span className="text-rose-400 font-bold text-xs flex items-center gap-1 pt-1">
                  إدراج الباقة بنقرة واحدة ←
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(false)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINT PREVIEW MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                معاينة كشف العهد والمخزون الرسمي للطباعة
              </h3>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            {/* Printable Document Frame */}
            <div className="bg-white text-slate-950 p-6 rounded-2xl shadow-inner space-y-4 font-sans text-xs">
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3">
                <div>
                  <h2 className="text-lg font-black text-slate-950">شركة كيان لتنظيم الفعاليات والرحلات</h2>
                  <p className="text-[11px] text-slate-600">كشف تسليم واستلام العهد والمخزون الميداني للرحلة</p>
                </div>
                <div className="text-left font-mono text-[10px] text-slate-700">
                  <div>الرحلة: {settings?.tripName || 'رحلة العين السخنة'}</div>
                  <div>التاريخ: {settings?.tripDate || new Date().toLocaleDateString('ar-EG')}</div>
                  <div>الحافلات: {totalBusCount} | المشتركين: {totalStudents}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-900">
                    <th className="py-2 px-2">م</th>
                    <th className="py-2 px-2">اسم العهدة / الصنف</th>
                    <th className="py-2 px-2">الفئة</th>
                    <th className="py-2 px-2">الباص المخصص</th>
                    <th className="py-2 px-2">المسؤول المستلم</th>
                    <th className="py-2 px-2 text-center">الكمية المسلمة</th>
                    <th className="py-2 px-2 text-center">توقيع المستلم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {logistics.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="py-2 px-2 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold">{it.name}</td>
                      <td className="py-2 px-2">{categoryLabels[it.category]?.label || it.category}</td>
                      <td className="py-2 px-2">{it.assignedBus ? `باص ${it.assignedBus}` : 'المستودع'}</td>
                      <td className="py-2 px-2">{it.assignedTo || '—'}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold">{it.totalQuantity} {it.unit}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-400">...................</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures Footer */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-[10px]">
                <div>
                  <span className="font-bold block">مسؤول المخازن واللوجستيات</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
                <div>
                  <span className="font-bold block">المشرف العام للرحلة</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
                <div>
                  <span className="font-bold block">إدارة العمليات والمالية</span>
                  <div className="h-10 border-b border-dashed border-slate-400 mt-2"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                طباعة المستند الآن 🖨️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE ITEM CONFIRMATION */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف العهدة / المستلزمات
              </h3>
              <button onClick={() => setItemToDelete(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف العهدة <strong className="text-amber-400">{itemToDelete.name}</strong>؟
              المشرف المسؤول: <span className="text-slate-200 font-bold">{itemToDelete.assignedTo || 'غير محدد'}</span>.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLogisticsItem) onDeleteLogisticsItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20 active:scale-95"
              >
                نعم، حذف نهائياً
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
