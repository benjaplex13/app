import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Copy, Check } from 'lucide-react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  demoCode?: string | null;
  isDemoActive?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  demoCode = null,
  isDemoActive = false,
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [copiedDemo, setCopiedDemo] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into characters array of fixed length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value;
    const numericChars = rawVal.replace(/\D/g, '');

    if (!numericChars) {
      // Empty / cleared
      const newDigits = [...digits];
      newDigits[index] = '';
      const newVal = newDigits.join('');
      onChange(newVal);
      return;
    }

    if (numericChars.length === 1) {
      // Single digit entered
      const newDigits = [...digits];
      newDigits[index] = numericChars;
      const newVal = newDigits.join('');
      onChange(newVal);

      // Advance to next box
      if (index < length - 1 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newVal.length === length && onComplete) {
        onComplete(newVal);
      }
    } else {
      // Pasted or multiple digits entered in this input
      handlePasteString(numericChars, index);
    }
  };

  const handlePasteString = (pastedText: string, startIndex = 0) => {
    const numericOnly = pastedText.replace(/\D/g, '');
    if (!numericOnly) return;

    const newDigits = [...digits];
    for (let i = 0; i < numericOnly.length && startIndex + i < length; i++) {
      newDigits[startIndex + i] = numericOnly[i];
    }

    const newVal = newDigits.join('');
    onChange(newVal);

    // Focus next empty or the last box
    const nextEmptyIndex = newDigits.findIndex((d) => !d);
    if (nextEmptyIndex !== -1 && inputRefs.current[nextEmptyIndex]) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[length - 1]?.focus();
    }

    if (newVal.length === length && onComplete) {
      onComplete(newVal);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    handlePasteString(pastedData, index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back to previous box and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        const newVal = newDigits.join('');
        onChange(newVal);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFillDemo = (code: string) => {
    handlePasteString(code, 0);
    setCopiedDemo(true);
    setTimeout(() => setCopiedDemo(false), 2000);
  };

  return (
    <div className="w-full flex flex-col items-center select-none" id="otp-input-container">
      {/* 6 OTP Cells */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2">
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const isFilled = Boolean(digits[index]);
          const isActive = isFocused || isFilled;

          return (
            <div
              key={index}
              className="relative flex-1 max-w-[54px] aspect-[4/5] sm:aspect-square flex items-center justify-center group"
            >
              {/* Animated Glowing Gradient Aura */}
              <AnimatePresence>
                {isFocused && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.25 }}
                    className="absolute -inset-1 bg-gradient-to-r from-cyan-500/30 via-blue-600/30 to-sky-400/30 rounded-2xl blur-md pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Cell Background & Base Border */}
              <div
                className={`w-full h-full rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
                  isFocused
                    ? 'bg-slate-900/90 shadow-lg shadow-cyan-500/10'
                    : isFilled
                    ? 'bg-slate-900/80 border border-cyan-500/30'
                    : 'bg-slate-950/60 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* SVG Animated Perimeter Stroke (Traced stroke around the box) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={`strokeGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  
                  {/* Subtle track */}
                  <rect
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    rx="18"
                    fill="none"
                    stroke={isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent'}
                    strokeWidth="2"
                  />

                  {/* Animated stroke trace */}
                  <motion.rect
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    rx="18"
                    fill="none"
                    stroke={`url(#strokeGrad-${index})`}
                    strokeWidth={isFocused ? '2.5' : isFilled ? '2' : '0'}
                    strokeDasharray="400"
                    initial={{ strokeDashoffset: 400 }}
                    animate={{
                      strokeDashoffset: isFocused ? 0 : isFilled ? 0 : 400,
                      opacity: isActive ? 1 : 0,
                    }}
                    transition={{
                      duration: isFocused ? 0.45 : 0.3,
                      ease: 'easeInOut',
                    }}
                  />
                </svg>

                {/* Input Element */}
                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={1}
                  disabled={disabled}
                  value={digits[index]}
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  className="w-full h-full text-center text-xl sm:text-2xl font-black font-mono text-cyan-300 bg-transparent outline-none cursor-pointer focus:cursor-text z-10 select-none caret-cyan-400"
                  aria-label={`Dígito ${index + 1} del código de verificación`}
                />

                {/* Blinking animated indicator dot when focused and empty */}
                {isFocused && !digits[index] && (
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute w-2 h-0.5 bg-cyan-400 rounded-full bottom-2.5 pointer-events-none"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo Code Indicator (Only visible if isDemoActive === true and demoCode is provided) */}
      {isDemoActive && demoCode && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono"
        >
          <span className="text-[11px] text-slate-400">Demo code:</span>
          <button
            type="button"
            onClick={() => handleFillDemo(demoCode)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold font-mono hover:bg-cyan-900/60 hover:border-cyan-400 transition-all active:scale-95 group shadow-sm cursor-pointer"
            title="Haz clic para autocompletar el código demo"
          >
            <Sparkles className="w-3 h-3 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>{demoCode}</span>
            {copiedDemo ? (
              <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
            ) : (
              <Copy className="w-2.5 h-2.5 text-slate-400 group-hover:text-cyan-200 ml-0.5 opacity-60" />
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
};
