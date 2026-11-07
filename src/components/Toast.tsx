import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#1B3B2B] text-white px-4 py-3 rounded-2xl shadow-xl border border-[#2D5A43] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center gap-2.5 text-xs font-semibold">
        <div className="w-5 h-5 rounded-full bg-[#F4C462] text-[#1B3B2B] flex items-center justify-center shrink-0">
          <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
        </div>
        <span>{message}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-[#D8E4DC] hover:text-white p-1"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
