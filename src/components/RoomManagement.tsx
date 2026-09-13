import React, { useState, useMemo } from 'react';
import {
  BedDouble,
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Sparkles,
  Printer,
  Download,
  Building,
  UserCheck,
  UserX,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  ChevronDown,
  Layers,
  ShieldAlert,
  ArrowUpDown,
  FileSpreadsheet,
  Shuffle,
  Home,
  UserPlus,
} from 'lucide-react';
import {
  HotelRoom,
  Student,
  TripSettings,
  RoomType,
  RoomGenderCategory,
  ROOM_TYPE_CONFIG,
  PARTICIPANT_ROLES_CONFIG,
} from '../types';

interface RoomManagementProps {
  rooms?: HotelRoom[];
  students: Student[];
  settings: TripSettings;
  onAddRoom: (room: Omit<HotelRoom, 'id' | 'createdAt'>) => void;
  onBatchAddRooms: (rooms: Omit<HotelRoom, 'id' | 'createdAt'>[]) => void;
  onUpdateRoom: (room: HotelRoom) => void;
  onDeleteRoom: (roomId: string) => void;
  onAssignStudentToRoom: (studentId: string, roomNumber: string, hotelName?: string, roomType?: RoomType) => void;
  onBatchAssignStudents?: (assignments: { studentId: string; roomNumber: string; hotelName?: string; roomType?: RoomType }[]) => void;
  onRemoveStudentFromRoom: (studentId: string) => void;
  onClearAllRoomAssignments: () => void;
  onAutoAssignRooms: () => void;
  onOpenTicketPassModal?: (student: Student) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms = [],
  students,
  settings,
  onAddRoom,
  onBatchAddRooms,
  onUpdateRoom,
  onDeleteRoom,
  onAssignStudentToRoom,
  onBatchAssignStudents,
  onRemoveStudentFromRoom,
  onClearAllRoomAssignments,
  onAutoAssignRooms,
  onOpenTicketPassModal,
}) => {
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | RoomGenderCategory>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | RoomType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'full' | 'available' | 'empty'>('all');
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedGenderFilter, setUnassignedGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [activeAssignRoom, setActiveAssignRoom] = useState<HotelRoom | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

  // Single Add form
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formHotelName, setFormHotelName] = useState(settings.destination || 'فندق الإقامة');
  const [formFloor, setFormFloor] = useState('الطابق الأول');
  const [formRoomType, setFormRoomType] = useState<RoomType>('double');
  const [formCapacity, setFormCapacity] = useState<number>(2);
  const [formGender, setFormGender] = useState<RoomGenderCategory>('male');
  const [formNotes, setFormNotes] = useState('');

  // Batch Add form
  const [batchStartNum, setBatchStartNum] = useState(101);
  const [batchCount, setBatchCount] = useState(10);
  const [batchHotelName, setBatchHotelName] = useState(settings.destination || 'فندق الإقامة');
  const [batchFloor, setBatchFloor] = useState('الطابق الأول');
  const [batchRoomType, setBatchRoomType] = useState<RoomType>('double');
  const [batchCapacity, setBatchCapacity] = useState<number>(2);
  const [batchGender, setBatchGender] = useState<RoomGenderCategory>('male');

  // Map students to room numbers for ultra-fast lookup
  const roomOccupantsMap = useMemo(() => {
    const map = new Map<string, Student[]>();
    students.forEach((student) => {
      if (student.roomNumber) {
        const key = String(student.roomNumber).trim();
        const current = map.get(key) || [];
        current.push(student);
        map.set(key, current);
      }
    });
    return map;
  }, [students]);

  // Unassigned students list
  const unassignedStudents = useMemo(() => {
    return students.filter((s) => !s.roomNumber || String(s.roomNumber).trim() === '');
  }, [students]);

  // Filtered unassigned students
  const filteredUnassigned = useMemo(() => {
    return unassignedStudents.filter((s) => {
      const matchGender = unassignedGenderFilter === 'all' || s.gender === unassignedGenderFilter;
      const search = unassignedSearch.toLowerCase();
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.phone.includes(search) ||
        s.ticketCode.toLowerCase().includes(search) ||
        (s.faculty && s.faculty.toLowerCase().includes(search));
      return matchGender && matchSearch;
    });
  }, [unassignedStudents, unassignedGenderFilter, unassignedSearch]);

  // Statistics
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 2), 0);
    const assignedCount = students.filter((s) => s.roomNumber && String(s.roomNumber).trim() !== '').length;
    const unassignedCount = students.length - assignedCount;
    const availableBeds = Math.max(0, totalCapacity - assignedCount);
    const occupancyRate = totalCapacity > 0 ? Math.round((assignedCount / totalCapacity) * 100) : 0;

    let maleRoomsCount = 0;
    let femaleRoomsCount = 0;
    let familyRoomsCount = 0;

    rooms.forEach((r) => {
      if (r.genderCategory === 'male') maleRoomsCount++;
      else if (r.genderCategory === 'female') femaleRoomsCount++;
      else familyRoomsCount++;
    });

    return {
      totalRooms,
      totalCapacity,
      assignedCount,
      unassignedCount,
      availableBeds,
      occupancyRate,
      maleRoomsCount,
      femaleRoomsCount,
      familyRoomsCount,
    };
  }, [rooms, students]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Gender category
      if (genderFilter !== 'all' && r.genderCategory !== genderFilter) return false;
      // Room type
      if (typeFilter !== 'all' && r.roomType !== typeFilter) return false;

      // Occupants count
      const occ = (roomOccupantsMap.get(String(r.roomNumber).trim()) || []).length;
      if (statusFilter === 'full' && occ < r.capacity) return false;
      if (statusFilter === 'available' && occ >= r.capacity) return false;
      if (statusFilter === 'empty' && occ > 0) return false;

      // Search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const numMatch = r.roomNumber.toLowerCase().includes(term);
        const hotelMatch = (r.hotelName || '').toLowerCase().includes(term);
        const floorMatch = (r.floor || '').toLowerCase().includes(term);
        const occupantMatch = (roomOccupantsMap.get(String(r.roomNumber).trim()) || []).some(
          (s) => s.name.toLowerCase().includes(term) || s.phone.includes(term)
        );
        if (!numMatch && !hotelMatch && !floorMatch && !occupantMatch) return false;
      }

      return true;
    });
  }, [rooms, genderFilter, typeFilter, statusFilter, searchTerm, roomOccupantsMap]);

  // Handler to open single add
  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setFormRoomNumber('');
    setFormHotelName(settings.destination || 'فندق الإقامة');
    setFormFloor('الطابق الأول');
    setFormRoomType('double');
    setFormCapacity(2);
    setFormGender('male');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Handler to open edit
  const handleOpenEditModal = (room: HotelRoom) => {
    setEditingRoom(room);
    setFormRoomNumber(room.roomNumber);
    setFormHotelName(room.hotelName || settings.destination || 'فندق الإقامة');
    setFormFloor(room.floor || 'الطابق الأول');
    setFormRoomType(room.roomType);
    setFormCapacity(room.capacity);
    setFormGender(room.genderCategory);
    setFormNotes(room.notes || '');
    setIsAddModalOpen(true);
  };

  // Save room (create or edit)
  const handleSaveRoomForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoomNumber.trim()) return;

    if (editingRoom) {
      onUpdateRoom({
        ...editingRoom,
        roomNumber: formRoomNumber.trim(),
        hotelName: formHotelName.trim(),
        floor: formFloor.trim(),
        roomType: formRoomType,
        capacity: Number(formCapacity) || 2,
        genderCategory: formGender,
        notes: formNotes.trim(),
      });
    } else {
      onAddRoom({
        roomNumber: formRoomNumber.trim(),
        hotelName: formHotelName.trim(),
        floor: formFloor.trim(),
        roomType: formRoomType,
        capacity: Number(formCapacity) || 2,
        genderCategory: formGender,
        notes: formNotes.trim(),
      });
    }

    setIsAddModalOpen(false);
  };

  // Batch create rooms
  const handleSaveBatchRooms = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.min(100, Math.max(1, Number(batchCount) || 1));
    const start = Number(batchStartNum) || 101;
    const newRoomsList: Omit<HotelRoom, 'id' | 'createdAt'>[] = [];

    for (let i = 0; i < count; i++) {
      const roomNum = String(start + i);
      newRoomsList.push({
        roomNumber: roomNum,
        hotelName: batchHotelName.trim(),
        floor: batchFloor.trim(),
        roomType: batchRoomType,
        capacity: Number(batchCapacity) || 2,
        genderCategory: batchGender,
        notes: '',
      });
    }

    onBatchAddRooms(newRoomsList);
    setIsBatchModalOpen(false);
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'رقم الغرفة',
      'الفندق',
      'الطابق',
      'نوع الغرفة',
      'التصنيف',
      'السعة الكلية',
      'المسكنين حالياً',
      'اسم النزيل',
      'رقم الهاتف',
      'الرقم القومي',
      'الكلية / الصفة',
      'الجنس',
      'ملاحظات',
    ];

    const rows: string[][] = [];

    rooms.forEach((room) => {
      const occupants = roomOccupantsMap.get(String(room.roomNumber).trim()) || [];
      const genderLabel =
        room.genderCategory === 'male'
          ? 'شباب'
          : room.genderCategory === 'female'
          ? 'بنات'
          : room.genderCategory === 'family'
          ? 'عائلات'
          : 'مشترك';
      const typeLabel = ROOM_TYPE_CONFIG[room.roomType]?.label || room.roomType;

      if (occupants.length === 0) {
        rows.push([
          room.roomNumber,
          room.hotelName || '',
          room.floor || '',
          typeLabel,
          genderLabel,
          String(room.capacity),
          '0',
          '-- شاغرة فارغة --',
          '',
          '',
          '',
          '',
          room.notes || '',
        ]);
      } else {
        occupants.forEach((occ) => {
          rows.push([
            room.roomNumber,
            room.hotelName || '',
            room.floor || '',
            typeLabel,
            genderLabel,
            String(room.capacity),
            String(occupants.length),
            occ.name,
            occ.phone,
            occ.nationalId || '',
            occ.faculty || occ.customRole || 'مشترك',
            occ.gender === 'male' ? 'ذكر' : 'أنثى',
            room.notes || '',
          ]);
        });
      }
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `كشف_تسكين_الغرف_الفندقية_${settings.tripName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print official hotel rooming list
  const handlePrintRoomingList = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BedDouble className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  إدارة وتسكين الغرف الفندقية 🏨
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    Rooming Management
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  تسكين المشاركين في الفنادق والغرف، وتوليد كشوفات الاستقبال الرسمية (Hotel Rooming List)
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة غرفة جديدة
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              title="إضافة مجموعة غرف بأرقام متسلسلة دفعة واحدة"
            >
              <Building className="w-4 h-4 text-indigo-400" />
              إضافة دفعة غرف 🏢
            </button>

            <button
              onClick={onAutoAssignRooms}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              title="تسكين تلقائي ذكي مع مراعاة فصل الشباب عن البنات والمرافقين"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              تسكين تلقائي ذكي 🪄
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-medium text-xs transition-all cursor-pointer"
              title="تصدير ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Excel
            </button>

            <button
              onClick={handlePrintRoomingList}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all cursor-pointer"
              title="طباعة كشف التسكين الفندقي المعتمد"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              طباعة الكشف
            </button>

            {students.some((s) => s.roomNumber) && (
              <button
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من رغبتك في إلغاء وتفريغ كافة تسكينات الغرف لجميع المشتركين؟')) {
                    onClearAllRoomAssignments();
                  }
                }}
                className="inline-flex items-center justify-center p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs transition-all cursor-pointer"
                title="تفريغ كافة الغرف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Analytics & Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">إجمالي الغرف</span>
          <strong className="text-xl sm:text-2xl font-black text-white block mt-1">
            {stats.totalRooms} <span className="text-xs font-normal text-slate-400">غرفة</span>
          </strong>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">إجمالي الأسِرّة / السعة</span>
          <strong className="text-xl sm:text-2xl font-black text-indigo-400 block mt-1">
            {stats.totalCapacity} <span className="text-xs font-normal text-slate-400">سرير</span>
          </strong>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">المُسكَّنون</span>
          <strong className="text-xl sm:text-2xl font-black text-emerald-400 block mt-1">
            {stats.assignedCount} <span className="text-xs font-normal text-slate-400">نزيل</span>
          </strong>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">الأسِرّة الشاغرة</span>
          <strong className="text-xl sm:text-2xl font-black text-amber-400 block mt-1">
            {stats.availableBeds} <span className="text-xs font-normal text-slate-400">متاح</span>
          </strong>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">غير مسكنين بعد</span>
          <strong className="text-xl sm:text-2xl font-black text-rose-400 block mt-1">
            {stats.unassignedCount} <span className="text-xs font-normal text-slate-400">مشترك</span>
          </strong>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] font-bold text-slate-400 block">نسبة الإشغال</span>
          <div className="flex items-baseline gap-1 mt-1">
            <strong className="text-xl sm:text-2xl font-black text-white">{stats.occupancyRate}%</strong>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.occupancyRate >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, stats.occupancyRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left side Rooms Grid, Right side Unassigned Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Rooms Section (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث برقم الغرفة، اسم النزيل، الفندق..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-9 pl-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                <option value="all">كل التصنيفات 👥</option>
                <option value="male">غرف شباب 👦</option>
                <option value="female">غرف بنات 🧕</option>
                <option value="family">غرف عائلات 👨‍👩‍👧‍👦</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                <option value="all">كل أنواع الغرف 🛏️</option>
                <option value="single">فردية (Single)</option>
                <option value="double">ثنائية (Double)</option>
                <option value="triple">ثلاثية (Triple)</option>
                <option value="quad">رباعية (Quadruple)</option>
                <option value="suite">جناح (Suite)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
              >
                <option value="all">كل حالات الغرف</option>
                <option value="available">بها شواغر متبقية 🟢</option>
                <option value="full">مكتملة وممتلئة 🔴</option>
                <option value="empty">فارغة تماماً ⚪</option>
              </select>
            </div>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl p-12 text-center">
              <BedDouble className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">لا توجد غرف تطابق معايير البحث</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                {rooms.length === 0
                  ? 'لم تقم بإضافة أي غرف فندقية بعد. يمكنك إضافة غرفة فردية أو إضافة دفعة غرف سريعة بأرقام متسلسلة.'
                  : 'جرب تغيير فلاتر البحث أو مسح كلمة البحث الحالية.'}
              </p>
              {rooms.length === 0 && (
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة أول غرفة
                  </button>
                  <button
                    onClick={() => setIsBatchModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs hover:bg-slate-700 transition-colors"
                  >
                    <Building className="w-4 h-4 text-indigo-400" />
                    إضافة دفعة سريعة (10 غرف)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const occupants = roomOccupantsMap.get(String(room.roomNumber).trim()) || [];
                const currentOccCount = occupants.length;
                const capacity = room.capacity || 2;
                const isFull = currentOccCount >= capacity;
                const isEmpty = currentOccCount === 0;
                const remainingBeds = Math.max(0, capacity - currentOccCount);

                const genderBadgeColor =
                  room.genderCategory === 'male'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    : room.genderCategory === 'female'
                    ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                const genderLabel =
                  room.genderCategory === 'male'
                    ? 'شباب 👦'
                    : room.genderCategory === 'female'
                    ? 'بنات 🧕'
                    : 'عائلات 👨‍👩‍👧‍👦';

                return (
                  <div
                    key={room.id}
                    className={`bg-slate-900 border rounded-2xl p-4 transition-all hover:border-slate-700 shadow-md ${
                      isFull
                        ? 'border-slate-800'
                        : isEmpty
                        ? 'border-slate-800/80 bg-slate-900/50'
                        : 'border-amber-500/30 bg-slate-900/90'
                    }`}
                  >
                    {/* Room Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-white font-mono tracking-wide">
                            غرفة #{room.roomNumber}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${genderBadgeColor}`}
                          >
                            {genderLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="truncate">{room.hotelName || 'الفندق'}</span>
                          {room.floor && (
                            <>
                              <span>•</span>
                              <span>{room.floor}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-slate-300 font-medium">
                            {ROOM_TYPE_CONFIG[room.roomType]?.label || room.roomType}
                          </span>
                        </div>
                      </div>

                      {/* Controls Menu */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(room)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="تعديل بيانات الغرفة"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `هل تريد حذف الغرفة رقم (${room.roomNumber})؟ سيتم إلغاء تسكين أي نزلاء بداخلها.`
                              )
                            ) {
                              onDeleteRoom(room.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="حذف الغرفة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-2.5 mb-3">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">إشغال الغرفة:</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isFull ? 'text-emerald-400' : isEmpty ? 'text-slate-400' : 'text-amber-400'
                            }`}
                          >
                            [{currentOccCount} / {capacity}]
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {isFull
                              ? '(مكتملة بالكامل)'
                              : isEmpty
                              ? '(فارغة بالكامل)'
                              : `(متبقي ${remainingBeds} سرير)`}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                        {Array.from({ length: capacity }).map((_, idx) => {
                          const isOccupied = idx < currentOccCount;
                          return (
                            <div
                              key={idx}
                              className={`h-full flex-1 rounded-sm transition-all ${
                                isOccupied
                                  ? room.genderCategory === 'female'
                                    ? 'bg-pink-500'
                                    : room.genderCategory === 'male'
                                    ? 'bg-indigo-500'
                                    : 'bg-emerald-500'
                                  : 'bg-slate-700/40'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Occupants List */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block">النزلاء الحاليون:</span>

                      {occupants.length === 0 ? (
                        <div className="text-center py-3 px-2 bg-slate-950/40 rounded-xl border border-slate-800/40 text-xs text-slate-500">
                          لا يوجد نزلاء مسكنين في هذه الغرفة حالياً
                        </div>
                      ) : (
                        occupants.map((occ) => {
                          return (
                            <div
                              key={occ.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs hover:border-slate-700 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] shrink-0 font-bold">
                                  {occ.gender === 'female' ? '🧕' : '👦'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <strong className="text-white truncate text-xs block">{occ.name}</strong>
                                    {occ.hasCompanion && (
                                      <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded shrink-0">
                                        +مرافق
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 block truncate font-mono">
                                    {occ.phone}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {onOpenTicketPassModal && (
                                  <button
                                    onClick={() => onOpenTicketPassModal(occ)}
                                    className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                                    title="عرض تذكرة النزيل"
                                  >
                                    🎟️
                                  </button>
                                )}
                                <button
                                  onClick={() => onRemoveStudentFromRoom(occ.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                  title="إلغاء تسكين النزيل من هذه الغرفة"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Quick Assign Button if room has vacancy */}
                      {!isFull && (
                        <button
                          onClick={() => setActiveAssignRoom(room)}
                          className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          تسكين نزيل في الغرفة ({remainingBeds} شاغر)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Unassigned Guests List (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-20 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  المشتركون غير المُسكَّنين
                  <span className="mr-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs border border-rose-500/30">
                    {unassignedStudents.length}
                  </span>
                </h3>
              </div>
            </div>

            {/* Sub-search for unassigned */}
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو الهاتف..."
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Gender filter */}
              <div className="flex gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setUnassignedGenderFilter('all')}
                  className={`flex-1 py-1 rounded-md font-bold transition-all ${
                    unassignedGenderFilter === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({unassignedStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnassignedGenderFilter('male')}
                  className={`flex-1 py-1 rounded-md font-bold transition-all ${
                    unassignedGenderFilter === 'male'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  شباب ({unassignedStudents.filter((s) => s.gender === 'male').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnassignedGenderFilter('female')}
                  className={`flex-1 py-1 rounded-md font-bold transition-all ${
                    unassignedGenderFilter === 'female'
                      ? 'bg-pink-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  بنات ({unassignedStudents.filter((s) => s.gender === 'female').length})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredUnassigned.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {unassignedStudents.length === 0
                    ? '🎉 ممتاز! تم تسكين جميع المشاركين في الغرف الفندقية بالكامل.'
                    : 'لا يوجد مشاركون غير مسكنين يطابقون البحث الحالي.'}
                </div>
              ) : (
                filteredUnassigned.map((student) => {
                  return (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px]">{student.gender === 'female' ? '🧕' : '👦'}</span>
                            <strong className="text-white truncate font-bold">{student.name}</strong>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                            {student.phone} {student.faculty ? `• ${student.faculty}` : ''}
                          </span>
                        </div>

                        {/* Assign Room Selector */}
                        <div className="shrink-0">
                          <select
                            onChange={(e) => {
                              const selectedNum = e.target.value;
                              if (selectedNum) {
                                const targetRoom = rooms.find((r) => r.roomNumber === selectedNum);
                                onAssignStudentToRoom(
                                  student.id,
                                  selectedNum,
                                  targetRoom?.hotelName,
                                  targetRoom?.roomType
                                );
                              }
                            }}
                            defaultValue=""
                            className="bg-slate-900 border border-amber-500/40 text-amber-300 rounded-lg px-2 py-1 text-[11px] font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="" disabled>
                              تسكين في غرفة... 🛏️
                            </option>
                            {rooms.map((r) => {
                              const occCount = (roomOccupantsMap.get(String(r.roomNumber).trim()) || []).length;
                              const isRoomFull = occCount >= r.capacity;
                              return (
                                <option
                                  key={r.id}
                                  value={r.roomNumber}
                                  disabled={isRoomFull}
                                  className="bg-slate-950 text-white"
                                >
                                  غرفة #{r.roomNumber} ({occCount}/{r.capacity}) -{' '}
                                  {r.genderCategory === 'male' ? 'شباب' : r.genderCategory === 'female' ? 'بنات' : 'عائلات'}
                                  {isRoomFull ? ' (ممتلئة)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add or Edit Single Room */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BedDouble className="w-5 h-5 text-amber-400" />
                {editingRoom ? `تعديل بيانات الغرفة #${editingRoom.roomNumber}` : 'إضافة غرفة فندقية جديدة'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomForm} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">رقم الغرفة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 204"
                    value={formRoomNumber}
                    onChange={(e) => setFormRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">الطابق / المبنى</label>
                  <input
                    type="text"
                    placeholder="مثال: الدور الثاني - جناح A"
                    value={formFloor}
                    onChange={(e) => setFormFloor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الفندق / القرية السياحية</label>
                <input
                  type="text"
                  placeholder="مثال: فندق راديسون بلو / توليب"
                  value={formHotelName}
                  onChange={(e) => setFormHotelName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">نوع الغرفة</label>
                  <select
                    value={formRoomType}
                    onChange={(e) => {
                      const t = e.target.value as RoomType;
                      setFormRoomType(t);
                      setFormCapacity(ROOM_TYPE_CONFIG[t]?.defaultCapacity || 2);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="single">فردية (Single) - سرير 1</option>
                    <option value="double">ثنائية (Double) - سريرين</option>
                    <option value="triple">ثلاثية (Triple) - 3 أسِرّة</option>
                    <option value="quad">رباعية (Quadruple) - 4 أسِرّة</option>
                    <option value="suite">جناح (Suite) - 5 أسِرّة</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">السعة القصوى (الأسِرّة) *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">تصنيف النزلاء (الجنس)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormGender('male')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      formGender === 'male'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    غرفة شباب 👦
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGender('female')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      formGender === 'female'
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    غرفة بنات 🧕
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormGender('family')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      formGender === 'family'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    عائلات 👨‍👩‍👧‍👦
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">ملاحظات إضافية (اختياري)</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات على الفيو أو موقع الغرفة أو متطلبات خاصة..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                >
                  {editingRoom ? 'حفظ التعديلات' : 'إضافة الغرفة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Add Rooms */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                إضافة دفعة غرف فندقية متسلسلة 🏢
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              أداة سريعة لإنشاء مجموعة غرف بأرقام متتابعة (مثلاً: من 101 إلى 110) بنفس المواصفات وسعة الأسرة.
            </p>

            <form onSubmit={handleSaveBatchRooms} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">رقم أول غرفة (البداية)</label>
                  <input
                    type="number"
                    required
                    value={batchStartNum}
                    onChange={(e) => setBatchStartNum(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">عدد الغرف المراد إنشاؤها</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={batchCount}
                    onChange={(e) => setBatchCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">اسم الفندق</label>
                <input
                  type="text"
                  value={batchHotelName}
                  onChange={(e) => setBatchHotelName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">نوع الغرفة</label>
                  <select
                    value={batchRoomType}
                    onChange={(e) => {
                      const t = e.target.value as RoomType;
                      setBatchRoomType(t);
                      setBatchCapacity(ROOM_TYPE_CONFIG[t]?.defaultCapacity || 2);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="single">فردية (Single)</option>
                    <option value="double">ثنائية (Double)</option>
                    <option value="triple">ثلاثية (Triple)</option>
                    <option value="quad">رباعية (Quadruple)</option>
                    <option value="suite">جناح (Suite)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">سعة الأسِرّة لكل غرفة</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={batchCapacity}
                    onChange={(e) => setBatchCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">تصنيف النزلاء للدفعة</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchGender('male')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      batchGender === 'male'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    غرف شباب 👦
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchGender('female')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      batchGender === 'female'
                        ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    غرف بنات 🧕
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchGender('family')}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs ${
                      batchGender === 'family'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    عائلات 👨‍👩‍👧‍👦
                  </button>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300">
                سيتم توليد {batchCount} غرف بالأرقام من: <span className="font-bold font-mono text-white">{batchStartNum}</span>{' '}
                إلى <span className="font-bold font-mono text-white">{batchStartNum + batchCount - 1}</span> بإجمالي سعة{' '}
                <span className="font-bold font-mono text-white">{batchCount * batchCapacity}</span> سرير.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                >
                  تأكيد وإنشاء الغرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Quick Assign Student to Room */}
      {activeAssignRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                تسكين نزيل في الغرفة #{activeAssignRoom.roomNumber}
              </h3>
              <button
                onClick={() => setActiveAssignRoom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>
                نوع الغرفة: <strong className="text-white">{ROOM_TYPE_CONFIG[activeAssignRoom.roomType]?.label}</strong>
              </p>
              <p>
                تصنيف الغرفة:{' '}
                <strong className="text-white">
                  {activeAssignRoom.genderCategory === 'male'
                    ? 'شباب 👦'
                    : activeAssignRoom.genderCategory === 'female'
                    ? 'بنات 🧕'
                    : 'عائلات 👨‍👩‍👧‍👦'}
                </strong>
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {unassignedStudents
                .filter((s) => {
                  // Suggest matching gender or family
                  if (activeAssignRoom.genderCategory === 'male') return s.gender === 'male';
                  if (activeAssignRoom.genderCategory === 'female') return s.gender === 'female';
                  return true;
                })
                .map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs hover:border-amber-500/40 transition-all"
                  >
                    <div>
                      <strong className="text-white block">{student.name}</strong>
                      <span className="text-[10px] text-slate-400 block font-mono">{student.phone}</span>
                    </div>
                    <button
                      onClick={() => {
                        onAssignStudentToRoom(
                          student.id,
                          activeAssignRoom.roomNumber,
                          activeAssignRoom.hotelName,
                          activeAssignRoom.roomType
                        );
                        setActiveAssignRoom(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      تسكين الآن
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveAssignRoom(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
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
