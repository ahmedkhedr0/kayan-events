import React, { useState } from 'react';
import { Bus, CheckCircle2, Armchair, Sparkles, User, Lock } from 'lucide-react';
import { Student, PARTICIPANT_ROLES_CONFIG } from '../types';

interface BusSeatPickerProps {
  students: Student[];
  selectedBus: number;
  selectedSeat: number | undefined;
  editingStudentId?: string;
  onSelectSeat: (busNumber: number, seatNumber: number) => void;
  restrictedBus?: number;
}

export const BusSeatPicker: React.FC<BusSeatPickerProps> = ({
  students,
  selectedBus,
  selectedSeat,
  editingStudentId,
  onSelectSeat,
  restrictedBus,
}) => {
  const effectiveBus = restrictedBus && restrictedBus > 0 ? restrictedBus : selectedBus || 1;
  const [activeBusTab, setActiveBusTab] = useState<number>(effectiveBus);

  // Structure for seat occupants
  interface SeatOccupant {
    name: string;
    faculty?: string;
    participantRole?: string;
    id?: string;
  }

  const occupiedSeatsMap = new Map<number, SeatOccupant>();

  // Map occupied seats from students
  students.forEach((s) => {
    if (s.busNumber === activeBusTab && s.seatNumber && s.id !== editingStudentId) {
      occupiedSeatsMap.set(s.seatNumber, {
        name: s.name,
        faculty: s.participantRole === 'companion' ? `مرافق (${s.faculty})` : s.faculty,
        participantRole: s.participantRole,
        id: s.id,
      });
    }
  });

  const totalSeats = 50;
  const occupiedCount = occupiedSeatsMap.size;
  const vacantCount = Math.max(0, totalSeats - occupiedCount);

  // Find next free seat in active bus tab
  const findNextFreeSeat = (busNum: number) => {
    const taken = new Set<number>();
    students.forEach((s) => {
      if (s.busNumber === busNum && s.seatNumber && s.id !== editingStudentId) {
        taken.add(s.seatNumber);
      }
    });
    for (let i = 1; i <= 50; i++) {
      if (!taken.has(i)) return i;
    }
    return 1;
  };

  const handleAutoAssignNext = () => {
    const nextSeat = findNextFreeSeat(activeBusTab);
    onSelectSeat(activeBusTab, nextSeat);
  };

  // Bus layout rows: 11 rows of 4 seats (1..44) + 1 back row of 6 seats (45..50)
  const rows = Array.from({ length: 11 }, (_, rIdx) => {
    const base = rIdx * 4;
    return {
      rowNumber: rIdx + 1,
      leftSeats: [base + 1, base + 2],
      rightSeats: [base + 3, base + 4],
    };
  });
  const backRowSeats = [45, 46, 47, 48, 49, 50];

  const renderSeatButton = (seatNo: number, isBackBench: boolean = false) => {
    const occupant = occupiedSeatsMap.get(seatNo);
    const isSelected = selectedBus === activeBusTab && selectedSeat === seatNo;
    const isCurrentEditingSeat =
      editingStudentId &&
      students.find((s) => s.id === editingStudentId)?.busNumber === activeBusTab &&
      students.find((s) => s.id === editingStudentId)?.seatNumber === seatNo;

    return (
      <button
        type="button"
        key={seatNo}
        disabled={!!occupant && !isCurrentEditingSeat}
        onClick={() => onSelectSeat(activeBusTab, seatNo)}
        title={
          occupant
            ? occupant.participantRole === 'companion'
              ? `مقعد #${seatNo}: محجوز للمرافق ${occupant.name} (${occupant.faculty})`
              : `مقعد #${seatNo}: محجوز لـ ${occupant.name} (${occupant.faculty})`
            : `مقعد #${seatNo}: انقر لاختياره`
        }
        className={`relative flex flex-col items-center justify-between p-1.5 sm:p-2 rounded-xl border transition-all duration-200 select-none ${
          isBackBench ? 'min-h-[52px]' : 'min-h-[56px]'
        } ${
          isSelected
            ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 border-amber-300 font-black shadow-lg shadow-amber-500/40 ring-2 ring-amber-300 scale-105 z-10'
            : isCurrentEditingSeat
            ? 'bg-purple-600/40 border-purple-400 text-purple-200 font-bold'
            : occupant
            ? 'bg-slate-950/90 border-slate-800 text-slate-600 cursor-not-allowed opacity-70'
            : 'bg-slate-950 hover:bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 hover:scale-[1.03] shadow-sm'
        }`}
      >
        {/* Headrest top border simulation */}
        <div
          className={`w-3/5 h-1 rounded-t-md mx-auto ${
            isSelected
              ? 'bg-slate-950/30'
              : occupant
              ? 'bg-slate-800'
              : 'bg-emerald-500/30'
          }`}
        />

        {/* Seat Number & Indicator */}
        <div className="flex items-center justify-between w-full px-0.5">
          <span className="font-mono text-[10px] font-black leading-none">#{seatNo}</span>
          {occupant && occupant.participantRole && occupant.participantRole !== 'student' && (
            <span className="text-[10px]">
              {PARTICIPANT_ROLES_CONFIG[occupant.participantRole]?.icon}
            </span>
          )}
        </div>

        {/* Seat Status Content */}
        {isSelected ? (
          <span className="text-[9px] font-black bg-slate-950 text-amber-300 px-1 py-0.5 rounded flex items-center gap-0.5 mt-0.5">
            ✓ محدد
          </span>
        ) : occupant ? (
          <span className={`text-[9px] font-bold truncate max-w-[50px] sm:max-w-[65px] block mt-0.5 ${occupant.participantRole === 'companion' ? 'text-amber-400 font-extrabold' : 'text-slate-400'}`}>
            {occupant.participantRole === 'companion' ? `👥 ${occupant.name.split(' ')[0]}` : occupant.name.split(' ')[0]}
          </span>
        ) : (
          <span className="text-[9px] text-emerald-400 font-extrabold flex items-center gap-0.5 mt-0.5">
            + شاغر
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 shadow-xl">
      {/* Header & Seat Selector Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-white text-xs sm:text-sm flex items-center gap-2 flex-wrap">
              <span>مخطط كراسي الأتوبيس تفاعلياً</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-black">
                تقسيمة الكراسي والطرقة 🚌
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              مقعدين شمال • طرقة مرورية • مقعدين يمين + الكنبة الخلفية (50 مقعد)
            </p>
          </div>
        </div>

        {/* Selected Seat Indicator */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-xl">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">المقعد المخصص:</span>
            {selectedSeat ? (
              <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                حافلة {selectedBus} • مقعد #{selectedSeat}
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-500">لم يتم الاختيار</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAutoAssignNext}
            className="text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-md active:scale-95"
            title="تحديد أول مقعد خالي تلقائياً"
          >
            <Sparkles className="w-3.5 h-3.5" />
            تلقائي
          </button>
        </div>
      </div>

      {/* Bus Selection Tabs (1 - 6) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((busNum) => {
          const isRestrictedOut = Boolean(restrictedBus && restrictedBus > 0 && restrictedBus !== busNum);
          const busStuds = students.filter((s) => s.busNumber === busNum && s.id !== editingStudentId);
          const busOccupied = busStuds.filter((s) => s.seatNumber).length;
          const busVacant = Math.max(0, 50 - busOccupied);
          const isActive = activeBusTab === busNum;
          const isCurrentSelectedBus = selectedBus === busNum;

          if (isRestrictedOut) {
            return (
              <div
                key={busNum}
                className="p-2 rounded-xl text-center border border-slate-900 bg-slate-950/40 text-slate-600 flex flex-col items-center justify-center cursor-not-allowed opacity-50 select-none"
                title={`حافلة #${busNum} محظورة: أنت مقيد بحافلة #${restrictedBus} فقط`}
              >
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-600" />
                  <span className="font-bold text-xs">حافلة {busNum}</span>
                </div>
                <span className="text-[9px] mt-0.5 text-slate-600 font-bold">غير مصرح 🔒</span>
              </div>
            );
          }

          return (
            <button
              type="button"
              key={busNum}
              onClick={() => {
                setActiveBusTab(busNum);
                const freeSeat = findNextFreeSeat(busNum);
                onSelectSeat(busNum, isCurrentSelectedBus && selectedSeat ? selectedSeat : freeSeat);
              }}
              className={`p-2 rounded-xl text-center border transition relative flex flex-col items-center justify-center active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-500/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <Bus className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="font-extrabold text-xs">حافلة {busNum}</span>
              </div>
              <span
                className={`text-[9px] mt-0.5 font-mono ${
                  busVacant === 0 ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'
                }`}
              >
                {busVacant > 0 ? `${busVacant} شاغر` : 'مكتمل ❌'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Realistic Tour Bus Shell Layout */}
      <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl relative overflow-hidden">
        {/* Bus Front Windshield Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-2.5 mb-3 shadow-inner">
          <div className="flex justify-between items-center text-xs font-black">
            {/* Driver's Cab */}
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-xl">
              <span className="text-sm">👨‍✈️</span>
              <span>كبينة السائق (Driver)</span>
            </div>

            <div className="text-[10px] text-slate-500 font-mono hidden xs:block">
              مرسيدس 50 راكب • رحلات كيان
            </div>

            {/* Entrance Door */}
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-xl">
              <span>🚪</span>
              <span>باب الصعود</span>
            </div>
          </div>
        </div>

        {/* Scrollable Bus Layout Canvas */}
        <div className="max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1 custom-scrollbar space-y-2">
          {/* Main 11 Rows (2 Left | Walkway Aisle | 2 Right) */}
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.rowNumber} className="grid grid-cols-5 gap-1.5 sm:gap-2 items-center">
                {/* Left Side Seats Pair */}
                <div className="col-span-2 grid grid-cols-2 gap-1.5">
                  {row.leftSeats.map((seatNo) => renderSeatButton(seatNo))}
                </div>

                {/* Center Walkway Aisle (الطرقة / الممر الوسطي) */}
                <div className="col-span-1 flex flex-col items-center justify-center py-1 bg-slate-950/60 border border-dashed border-slate-800/80 rounded-lg text-[9px] text-slate-500 font-mono">
                  <span>الطرقة</span>
                  <span className="text-[8px] text-slate-600">⬇️</span>
                </div>

                {/* Right Side Seats Pair */}
                <div className="col-span-2 grid grid-cols-2 gap-1.5">
                  {row.rightSeats.map((seatNo) => renderSeatButton(seatNo))}
                </div>
              </div>
            ))}
          </div>

          {/* Rear Divider Label */}
          <div className="pt-3 pb-1 border-t border-slate-800/80 text-center">
            <span className="text-[10px] bg-slate-950 border border-slate-800 text-amber-400 font-extrabold px-3 py-1 rounded-full">
              🛋️ الكنبة الخلفية للحافلة (المقاعد 45 إلى 50)
            </span>
          </div>

          {/* Back Row Bench (6 Seats Continuous across rear) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-1.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
            {backRowSeats.map((seatNo) => renderSeatButton(seatNo, true))}
          </div>
        </div>

        {/* Bus Rear Bumper Indicator */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-bold flex items-center justify-between">
          <span>خلفية الحافلة 🚌</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500 inline-block"></span>
              متاح
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span>
              محدد
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-slate-950 border border-slate-800 inline-block"></span>
              محجوز
            </span>
          </div>
          <span>السعة الإجمالية: 50 مقعد</span>
        </div>
      </div>
    </div>
  );
};
