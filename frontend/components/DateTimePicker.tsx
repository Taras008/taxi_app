'use client';

import { useState, useRef, useEffect } from 'react';

interface DateTimePickerProps {
  value: string; // Format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function DateTimePicker({ value, onChange, disabled }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const selectedDate = value ? new Date(value + ':00') : null;
  const selectedDay = selectedDate ? selectedDate.getDate() : null;
  const selectedMonth = selectedDate ? selectedDate.getMonth() : null;
  const selectedYear = selectedDate ? selectedDate.getFullYear() : null;
  const selectedHour = selectedDate ? selectedDate.getHours() : 12;
  const selectedMinute = selectedDate ? selectedDate.getMinutes() : 0;

  // Initialize month/year from selected date
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [selectedDate]);

  // Scroll to selected time when picker opens
  useEffect(() => {
    if (isOpen) {
      // Scroll to selected hour
      setTimeout(() => {
        if (hourScrollRef.current) {
          const selectedHourElement = hourScrollRef.current.querySelector(`[data-hour="${selectedHour}"]`);
          if (selectedHourElement) {
            selectedHourElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
        // Scroll to selected minute
        if (minuteScrollRef.current) {
          const selectedMinuteElement = minuteScrollRef.current.querySelector(`[data-minute="${selectedMinute}"]`);
          if (selectedMinuteElement) {
            selectedMinuteElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }
      }, 100);
    }
  }, [isOpen, selectedHour, selectedMinute]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayValue = () => {
    if (!value) return 'Select date & time';
    const date = new Date(value + ':00');
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateSelect = (day: number) => {
    const hour = selectedDate ? selectedDate.getHours() : 12;
    const minute = selectedDate ? selectedDate.getMinutes() : 0;
    const newDate = new Date(currentYear, currentMonth, day, hour, minute);
    const formatted = formatDateTime(newDate);
    onChange(formatted);
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(hour, minute);
      const formatted = formatDateTime(newDate);
      onChange(formatted);
    } else {
      // If no date selected, use today
      const today = new Date();
      today.setHours(hour, minute);
      const formatted = formatDateTime(today);
      onChange(formatted);
      setCurrentMonth(today.getMonth());
      setCurrentYear(today.getFullYear());
    }
  };

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(selectedHour, selectedMinute);
    const formatted = formatDateTime(today);
    onChange(formatted);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const handleClear = () => {
    onChange('');
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  
  // Get previous month's days to fill the grid
  const prevMonthDays = getDaysInMonth(currentMonth - 1 < 0 ? 11 : currentMonth - 1, currentMonth - 1 < 0 ? currentYear - 1 : currentYear);
  const days: (number | null)[] = [];
  
  // Add previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(prevMonthDays - i);
  }
  
  // Add current month's days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // Add next month's leading days to fill the grid (42 cells total)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push(i);
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDay &&
      currentMonth === selectedMonth &&
      currentYear === selectedYear
    );
  };

  const isOtherMonth = (day: number, index: number) => {
    // Days before first day of month belong to previous month
    if (index < firstDay) return true;
    // Days after current month's days belong to next month
    if (index >= firstDay + daysInMonth) return true;
    return false;
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span className={value ? '' : 'text-slate-500 dark:text-slate-400'}>
          {formatDisplayValue()}
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-[600px] max-w-[calc(100vw-2rem)] left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Calendar Section */}
            <div className="flex-1">
              {/* Month/Year Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center gap-2">
                  <select
                    value={currentMonth}
                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-50 text-sm font-medium"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                    className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-50 text-sm font-medium"
                  >
                    {Array.from({ length: 20 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Week Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => {
                  if (day === null) return <div key={index} />;
                  
                  const isOther = isOtherMonth(day, index);
                  const isSelectedDay = !isOther && isSelected(day);
                  const isTodayDay = !isOther && isToday(day);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => !isOther && handleDateSelect(day)}
                      disabled={isOther}
                      className={`
                        aspect-square p-1 text-sm rounded transition-all
                        ${isOther 
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                          : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                        }
                        ${isSelectedDay 
                          ? 'bg-blue-600 text-white font-semibold shadow-md' 
                          : isTodayDay
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleToday}
                  className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Today
                </button>
              </div>
            </div>

            {/* Time Picker Section */}
            <div className="w-full sm:w-48 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-4 sm:pt-0 sm:pl-4">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">
                Select Time
              </div>
              
              <div className="flex gap-4">
                {/* Hours */}
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center">Hour</div>
                  <div ref={hourScrollRef} className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        data-hour={hour}
                        onClick={() => handleTimeSelect(hour, selectedMinute)}
                        className={`
                          w-full px-3 py-2 text-sm rounded transition-all
                          ${selectedHour === hour
                            ? 'bg-blue-600 text-white font-semibold shadow-md'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300'
                          }
                        `}
                      >
                        {String(hour).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes */}
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center">Min</div>
                  <div ref={minuteScrollRef} className="max-h-64 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    {minutes.map((minute) => (
                      <button
                        key={minute}
                        data-minute={minute}
                        onClick={() => handleTimeSelect(selectedHour, minute)}
                        className={`
                          w-full px-3 py-2 text-sm rounded transition-all
                          ${selectedMinute === minute
                            ? 'bg-blue-600 text-white font-semibold shadow-md'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300'
                          }
                        `}
                      >
                        {String(minute).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

