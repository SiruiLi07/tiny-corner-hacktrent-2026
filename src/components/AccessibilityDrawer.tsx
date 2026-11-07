import React from 'react';
import { X, Eye, Type, BookOpen, Activity, RotateCcw, Keyboard } from 'lucide-react';
import { AccessibilitySettings } from '../types/index.ts';
import { useFocusTrap } from '../utils/useFocusTrap.ts';

interface AccessibilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: AccessibilitySettings) => void;
  onShowToast: (msg: string) => void;
}

export const AccessibilityDrawer: React.FC<AccessibilityDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const drawerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) return null;

  const toggleHighContrast = () => {
    const updated = { ...settings, highContrast: !settings.highContrast };
    onUpdateSettings(updated);
    onShowToast(updated.highContrast ? 'High Contrast Mode Enabled' : 'Standard Contrast Restored');
  };

  const setTextSize = (size: 'normal' | 'large' | 'xlarge') => {
    onUpdateSettings({ ...settings, textSize: size });
    onShowToast(`Text scale set to ${size}`);
  };

  const toggleSimplifiedReading = () => {
    const updated = { ...settings, simplifiedReading: !settings.simplifiedReading };
    onUpdateSettings(updated);
    onShowToast(
      updated.simplifiedReading
        ? 'Simplified Reading Mode Enabled'
        : 'Rich Media View Restored'
    );
  };

  const toggleReducedMotion = () => {
    const updated = { ...settings, reducedMotion: !settings.reducedMotion };
    onUpdateSettings(updated);
    onShowToast(updated.reducedMotion ? 'Reduced Motion Enabled' : 'Animations Restored');
  };

  const handleReset = () => {
    const defaults: AccessibilitySettings = {
      highContrast: false,
      textSize: 'normal',
      simplifiedReading: false,
      reducedMotion: false,
    };
    onUpdateSettings(defaults);
    onShowToast('Accessibility settings reset to defaults.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
    >
      <div
        ref={drawerRef}
        className="w-full max-w-md bg-[#FAF7F2] h-full shadow-2xl border-l border-[#D5C9B7] flex flex-col justify-between overflow-y-auto"
      >
        {/* Drawer Header */}
        <div className="p-6 bg-[#1B3B2B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4C462]/20 flex items-center justify-center text-[#F4C462]">
              <Eye className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="a11y-title" className="font-serif text-xl font-bold">
                Accessibility Controls
              </h2>
              <p className="text-xs text-[#D8E4DC]">
                Tailor Tiny Corner to your sensory and reading preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close accessibility controls"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Controls Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* High Contrast Mode */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD3C3] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAE2D5] flex items-center justify-center text-[#1B3B2B]">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F2922]">High Contrast Mode</div>
                  <div className="text-xs text-[#7A6B5D]">Deep dark background with high-contrast text</div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.highContrast}
                onClick={toggleHighContrast}
                className={`w-12 h-6 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                  settings.highContrast ? 'bg-[#1B3B2B]' : 'bg-[#D5C9B7]'
                }`}
                aria-label="Toggle High Contrast Mode"
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                    settings.highContrast ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Text Size Scale */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD3C3] space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAE2D5] flex items-center justify-center text-[#1B3B2B]">
                <Type className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1F2922]">Text Size Scale</div>
                <div className="text-xs text-[#7A6B5D]">Scale font sizes across the entire application</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['normal', 'large', 'xlarge'] as const).map((size) => {
                const labels = {
                  normal: 'Standard (100%)',
                  large: 'Medium (110%)',
                  xlarge: 'Large (125%)',
                };
                const isActive = settings.textSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setTextSize(size)}
                    aria-pressed={isActive}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                      isActive
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-[#FAF7F2] text-[#4A4036] border-[#DDD3C3] hover:border-[#1B3B2B]'
                    }`}
                  >
                    {labels[size]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simplified Reading Mode */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD3C3] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAE2D5] flex items-center justify-center text-[#1B3B2B]">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F2922]">Simplified Reading Mode</div>
                  <div className="text-xs text-[#7A6B5D]">Text-focused cards and event details</div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.simplifiedReading}
                onClick={toggleSimplifiedReading}
                className={`w-12 h-6 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                  settings.simplifiedReading ? 'bg-[#1B3B2B]' : 'bg-[#D5C9B7]'
                }`}
                aria-label="Toggle Simplified Reading Mode"
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                    settings.simplifiedReading ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Reduced Motion */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD3C3] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EAE2D5] flex items-center justify-center text-[#1B3B2B]">
                  <Activity className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1F2922]">Reduced Motion</div>
                  <div className="text-xs text-[#7A6B5D]">Disables decorative animations and transitions</div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.reducedMotion}
                onClick={toggleReducedMotion}
                className={`w-12 h-6 rounded-full transition-colors relative focus-visible:ring-2 focus-visible:ring-[#1B3B2B] ${
                  settings.reducedMotion ? 'bg-[#1B3B2B]' : 'bg-[#D5C9B7]'
                }`}
                aria-label="Toggle Reduced Motion"
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
                    settings.reducedMotion ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts Guide */}
          <div className="bg-[#F2ECE3] p-4 rounded-2xl border border-[#E0D7C9] text-xs text-[#554B40] space-y-2">
            <div className="font-bold text-[#1B3B2B] flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-[#1B3B2B]" aria-hidden="true" />
              <span>Keyboard Navigation Tips</span>
            </div>
            <ul className="space-y-1 list-disc pl-4 text-[11px]">
              <li><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D5C9B7]">Tab</kbd> to jump between interactive buttons and cards</li>
              <li><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D5C9B7]">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D5C9B7]">Space</kbd> to open card details</li>
              <li><kbd className="px-1.5 py-0.5 bg-white rounded border border-[#D5C9B7]">Esc</kbd> to close any modal or drawer</li>
            </ul>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-6 bg-white border-t border-[#DDD3C3] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-[#7A6B5D] hover:text-[#1F2922] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1B3B2B] hover:bg-[#132A1F] transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
