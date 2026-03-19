import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bell, X, ChevronDown } from "lucide-react";
import { format, addDays, startOfDay, setHours, setMinutes } from "date-fns";

/**
 * ReminderPicker — reusable reminder date/time selector.
 *
 * Props:
 *   value       — current remind_at ISO string (or null)
 *   onChange    — (isoString | null) => void
 *   className   — optional extra classes
 */
export default function ReminderPicker({ value, onChange, className = "" }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [customDate, setCustomDate] = useState(null);
  const [customTime, setCustomTime] = useState("09:00");

  const at9am = (date) => setMinutes(setHours(startOfDay(date), 9), 0);

  const quickOptions = [
    {
      label: "Today",
      description: format(new Date(), "EEE, MMM d") + " · 9:00 AM",
      getValue: () => at9am(new Date()),
    },
    {
      label: "Tomorrow",
      description: format(addDays(new Date(), 1), "EEE, MMM d") + " · 9:00 AM",
      getValue: () => at9am(addDays(new Date(), 1)),
    },
    {
      label: "Next Week",
      description: format(addDays(new Date(), 7), "EEE, MMM d") + " · 9:00 AM",
      getValue: () => at9am(addDays(new Date(), 7)),
    },
  ];

  const handleQuick = (option) => {
    onChange(option.getValue().toISOString());
  };

  const handleCustomConfirm = () => {
    if (!customDate) return;
    const [hours, minutes] = customTime.split(":").map(Number);
    const dt = setMinutes(setHours(startOfDay(customDate), hours), minutes);
    onChange(dt.toISOString());
    setShowCalendar(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setCustomDate(null);
  };

  const displayLabel = value
    ? format(new Date(value), "MMM d, yyyy · h:mm a")
    : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-3.5 h-3.5" />
            {displayLabel ? (
              <span className="text-foreground font-medium">{displayLabel}</span>
            ) : (
              <span>Set Reminder</span>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-72 p-3" align="start">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Remind me
          </p>

          {/* Quick options */}
          <div className="space-y-1 mb-3">
            {quickOptions.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleQuick(opt)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left"
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-muted-foreground text-xs">{opt.description}</span>
              </button>
            ))}
          </div>

          <div className="border-t pt-3">
            {!showCalendar ? (
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors text-left text-muted-foreground"
              >
                <Bell className="w-3.5 h-3.5" />
                Pick a date & time
              </button>
            ) : (
              <div className="space-y-2">
                <Calendar
                  mode="single"
                  selected={customDate}
                  onSelect={setCustomDate}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-md border-0 p-0"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!customDate}
                    onClick={handleCustomConfirm}
                  >
                    Set
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Clear reminder"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}