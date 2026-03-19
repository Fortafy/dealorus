import React, { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, X } from "lucide-react";
import { format, addDays, startOfDay, setHours, setMinutes, isToday, isTomorrow } from "date-fns";

/**
 * ReminderPicker — badge-style reminder selector.
 *
 * Props:
 *   value       — current remind_at ISO string (or null)
 *   onChange    — (isoString | null) => void
 *   className   — optional extra classes
 */
export default function ReminderPicker({ value, onChange, className = "" }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const at9am = (date) => setMinutes(setHours(startOfDay(date), 9), 0);

  // Sync internal state when value changes (e.g. opening edit form)
  useEffect(() => {
    setSelectedDate(value ? new Date(value) : null);
  }, [value]);

  const handleToday = () => {
    onChange(at9am(new Date()).toISOString());
  };

  const handleTomorrow = () => {
    onChange(at9am(addDays(new Date(), 1)).toISOString());
  };

  const handleCalendarSelect = (date) => {
    if (!date) return;
    onChange(at9am(date).toISOString());
    setCalendarOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const getDateLabel = () => {
    if (!value) return null;
    const d = new Date(value);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "EEE, MMM d");
  };

  const dateLabel = getDateLabel();
  const isCustomDate = dateLabel && dateLabel !== "Today" && dateLabel !== "Tomorrow";
  const isPastDue = value && new Date(value) < new Date();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {value ? (
        <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 bg-white text-sm font-medium transition-colors ${
          isPastDue
            ? "border-red-300 text-red-600"
            : "border-slate-300 text-slate-700"
        }`}>
          {isCustomDate && (
            <CalendarDays className={`w-3.5 h-3.5 ${isPastDue ? "text-red-500" : "text-slate-500"}`} />
          )}
          <span>{dateLabel}</span>
          <button
            type="button"
            onClick={handleClear}
            className={`ml-1 transition-colors ${isPastDue ? "text-red-400 hover:text-red-700" : "text-slate-400 hover:text-slate-700"}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={handleToday}
            className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleTomorrow}
            className="border border-slate-300 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Tomorrow
          </button>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="border border-slate-300 rounded-full p-1.5 bg-white hover:bg-slate-50 transition-colors text-slate-700"
                title="Pick a date"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => date < startOfDay(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}