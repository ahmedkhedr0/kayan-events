import React from 'react';
import { X } from 'lucide-react';
import { Student, TripSettings } from '../types';
import { DigitalTicketCard } from './DigitalTicketCard';

interface StudentPassModalProps {
  student: Student | null;
  settings: TripSettings;
  onClose: () => void;
  autoActionText?: string;
}

export const StudentPassModal: React.FC<StudentPassModalProps> = ({
  student,
  settings,
  onClose,
  autoActionText,
}) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto text-right">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 font-bold transition z-30"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <DigitalTicketCard
          student={student}
          settings={settings}
          onClose={onClose}
          autoActionText={autoActionText}
        />
      </div>
    </div>
  );
};


