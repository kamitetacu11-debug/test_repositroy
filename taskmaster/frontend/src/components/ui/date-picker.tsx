'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
  locale?: 'ru' | 'en';
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'ДД.ММ.ГГГГ',
  className,
  error = false,
  locale = 'ru',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  const MONTHS = locale === 'ru' ? MONTHS_RU : MONTHS_EN;
  const WEEKDAYS = locale === 'ru' ? WEEKDAYS_RU : WEEKDAYS_EN;

  // Parse value to Date
  const selectedDate = value ? new Date(value) : null;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update calendar when value changes
  useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [value]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Monday=0 format
    return day === 0 ? 6 : day - 1;
  };

  const formatDisplayDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleDateSelect = (day: number) => {
    // Format date manually to avoid timezone issues
    // Using toISOString() can shift the date by -1 day in positive UTC timezones
    const year = currentYear;
    const month = (currentMonth + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const isoDate = `${year}-${month}-${dayStr}`;
    onChange?.(isoDate);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handlePrevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const handleToday = () => {
    const today = new Date();
    // Format date manually to avoid timezone issues
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    onChange?.(isoDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange?.('');
    setIsOpen(false);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const daysInPrevMonth = getDaysInMonth(
      currentMonth === 0 ? 11 : currentMonth - 1,
      currentMonth === 0 ? currentYear - 1 : currentYear
    );

    const days: React.ReactNode[] = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div
          key={`prev-${i}`}
          className="w-8 h-8 flex items-center justify-center text-gray-600 text-sm"
        >
          {daysInPrevMonth - i}
        </div>
      );
    }

    // Current month days
    const today = new Date();
    const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const isSelected = selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentMonth &&
        selectedDate.getFullYear() === currentYear;

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={cn(
            'w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-all',
            'hover:bg-cosmic-purple/30 hover:text-white',
            isToday && !isSelected && 'ring-1 ring-cosmic-purple text-cosmic-purple',
            isSelected && 'bg-cosmic-purple text-white shadow-glow-purple/50',
            !isToday && !isSelected && 'text-gray-300'
          )}
        >
          {day}
        </button>
      );
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <div
          key={`next-${i}`}
          className="w-8 h-8 flex items-center justify-center text-gray-600 text-sm"
        >
          {i}
        </div>
      );
    }

    return days;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center h-11 w-full rounded-xl border bg-glass-light px-4 py-2 text-sm text-white cursor-pointer transition-all',
          'hover:border-cosmic-purple/50',
          isOpen && 'ring-2 ring-cosmic-purple/50 border-cosmic-purple',
          error ? 'border-status-error' : 'border-glass-border',
          className
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
        <span className={cn(
          'flex-1',
          !selectedDate && 'text-gray-500'
        )}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
      </div>

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-72 rounded-2xl border border-glass-border bg-cosmic-dark/95 shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-glass-border bg-glass-light/30">
              <div className="flex items-center justify-between">
                {/* Year navigation */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    className="p-1 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    className="p-1 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Month & Year Display */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-medium text-white min-w-[140px] text-center">
                    {MONTHS[currentMonth]} {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Year navigation right side */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    className="p-1 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    className="p-1 rounded-lg hover:bg-glass-light transition text-gray-400 hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 p-3 pb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 p-3 pt-0">
              {renderCalendarDays()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t border-glass-border bg-glass-light/20">
              <button
                type="button"
                onClick={handleClear}
                className="text-sm text-gray-400 hover:text-status-error transition"
              >
                {locale === 'ru' ? 'Удалить' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-sm text-cosmic-purple hover:text-cosmic-purple/80 transition font-medium"
              >
                {locale === 'ru' ? 'Сегодня' : 'Today'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
