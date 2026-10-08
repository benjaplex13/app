import React, { useRef, useState, useEffect } from 'react';

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
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
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

  return (
    <div className="w-full flex flex-col items-center select-none" id="otp-input-container">
      {/* 6 OTP Cells */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 w-full py-2">
        {Array.from({ length }).map((_, index) => {
          const isFocused = focusedIndex === index;
          const isFilled = Boolean(digits[index]);

          return (
            <div
              key={index}
              className={`otp-node relative flex-1 max-w-[54px] aspect-[4/5] sm:aspect-square flex items-center justify-center group ${
                isFilled ? 'has-value' : ''
              } ${isFocused ? 'is-focused' : ''}`}
            >
              {/* Ambient Glow behind focused cell */}
              {isFocused && (
                <div className="absolute -inset-1 bg-cyan-500/20 rounded-2xl blur-md pointer-events-none transition-all duration-300" />
              )}

              {/* Cell Container */}
              <div
                className={`w-full h-full rounded-2xl flex items-center justify-center transition-all duration-200 relative overflow-hidden backdrop-blur-md ${
                  isFocused
                    ? 'bg-slate-900/95 shadow-lg shadow-cyan-500/10'
                    : isFilled
                    ? 'bg-slate-900/90'
                    : 'bg-slate-950/70 hover:bg-slate-900/50'
                }`}
              >
                {/* SVG Pure CSS Animated Trace */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Static background track */}
                  <rect
                    className="trace-track"
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    rx="16"
                    pathLength="100"
                  />

                  {/* Animated drawing trace: triggers CSS keyframe on focus or value entry */}
                  <rect
                    key={`trace-${index}-${digits[index] || 'empty'}-${isFocused ? 'foc' : 'blur'}`}
                    className="trace"
                    x="2"
                    y="2"
                    width="96"
                    height="96"
                    rx="16"
                    pathLength="100"
                    strokeWidth="2.5"
                  />
                </svg>

                {/* Input Element */}
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
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

                {/* Blinking indicator dot when focused and empty */}
                {isFocused && !digits[index] && (
                  <div className="absolute w-2 h-0.5 bg-cyan-400 rounded-full bottom-2.5 pointer-events-none animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
