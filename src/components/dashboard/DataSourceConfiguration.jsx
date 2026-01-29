import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { GripVertical, Info, Save } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { motion } from "framer-motion";

const DATA_SOURCES = [
  { id: "CharityAPI", name: "CharityAPI", description: "IRS data & financial info", requiresEIN: true },
  { id: "ProPublica", name: "ProPublica", description: "Nonprofit database", requiresEIN: false },
  { id: "NonprofitCheckPlus", name: "Nonprofit Check Plus", description: "Comprehensive nonprofit data", requiresEIN: true },
  { id: "AI", name: "AI Enrichment", description: "Web search & intelligent analysis", requiresEIN: false },
];

export default function DataSourceConfiguration({ organization }) {
  const [priority, setPriority] = useState(organization?.default_data_source_priority || ["CharityAPI", "ProPublica", "NonprofitCheckPlus", "AI"]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    if (organization?.default_data_source_priority) {
      setPriority(organization.default_data_source_priority);
    }
  }, [organization?.default_data_source_priority]);

  if (!organization) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
          <p className="text-slate-600">Loading organization...</p>
        </div>
      </div>
    );
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(priority);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setPriority(items);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      await base44.entities.Client.update(organization.id, {
        default_data_source_priority: priority
      });
      setSaveStatus({ type: "success", message: "Data source settings saved successfully!" });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus({ type: "error", message: `Failed to save: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPriority(["CharityAPI", "ProPublica", "NonprofitCheckPlus", "AI"]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-6 py-6"
    >
      <Card className="border-0 shadow-xl shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b p-6">
          <CardTitle>Data Source Configuration</CardTitle>
          <p className="text-sm text-slate-600 mt-2">Set the default data source priority for all organization users</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {saveStatus && (
            <Alert variant={saveStatus.type === "success" ? "default" : "destructive"}>
              <AlertDescription>{saveStatus.message}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              The order below determines which data sources are checked first during Smart Enrichment. Only missing fields will be filled; existing data is preserved.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Current Priority:</strong> {priority.join(" → ")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Reorder Data Sources</h3>
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

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 45%)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'hsl(39, 100%, 50%)'}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}