import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Settings2, Info } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const DATA_SOURCES = [
  { id: "CharityAPI", name: "CharityAPI", description: "IRS data & financial info", requiresEIN: true },
  { id: "ProPublica", name: "ProPublica", description: "Nonprofit database", requiresEIN: false },
  { id: "NonprofitCheckPlus", name: "Nonprofit Check Plus", description: "Comprehensive nonprofit data", requiresEIN: true },
  { id: "AI", name: "AI Enrichment", description: "Web search & intelligent analysis", requiresEIN: false },
];

export default function DataSourceSettings({ open, onOpenChange, currentPriority, onSave }) {
  const [priority, setPriority] = useState(currentPriority || ["CharityAPI", "ProPublica", "NonprofitCheckPlus", "AI"]);

  useEffect(() => {
    if (currentPriority) {
      setPriority(currentPriority);
    }
  }, [currentPriority]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(priority);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPriority(items);
  };

  const handleSave = () => {
    onSave(priority);
    onOpenChange(false);
  };

  const handleReset = () => {
    setPriority(["CharityAPI", "ProPublica", "NonprofitCheckPlus", "AI"]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" style={{ color: 'hsl(217, 91%, 60%)' }} />
            Data Source Priority
          </DialogTitle>
          <DialogDescription>
            Drag to reorder data sources by priority. When enriching, sources are checked in order until data is found.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Higher priority sources are checked first. If a field is found, lower priority sources are skipped for that field.
            </p>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sources">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {priority.map((sourceId, index) => {
                    const source = DATA_SOURCES.find(s => s.id === sourceId);
                    if (!source) return null;

                    return (
                      <Draggable key={sourceId} draggableId={sourceId} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                              snapshot.isDragging
                                ? "border-blue-400 bg-blue-50 shadow-lg"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                            }`}
                          >
                            <GripVertical className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-slate-900">{source.name}</p>
                                {source.requiresEIN && (
                                  <Badge variant="outline" className="text-xs">
                                    Requires EIN
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{source.description}</p>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}>
              Save Priority
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}