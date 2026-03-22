import React, { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Briefcase, Plus, SlidersHorizontal, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import moment from "moment";
import KanbanDealCard from "@/components/deals/KanbanDealCard";
import NewDealDialog from "@/components/deals/NewDealDialog";
import DealsFilterPanel from "@/components/deals/DealsFilterPanel";

export default function Deals() {
  const [currentUser, setCurrentUser] = useState(null);
  const [client, setClient] = useState(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({ contractType: "", orgId: "" });
  const filterButtonRef = useRef(null);
  const searchRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals-board", currentUser?.data?.client_id],
    enabled: !!currentUser?.data?.client_id,
    queryFn: () => base44.entities.Deal.filter({ client_id: currentUser.data.client_id }, "-created_date"),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations-list", currentUser?.data?.client_id],
    enabled: !!currentUser?.data?.client_id,
    queryFn: () => base44.entities.Organization.filter({ client_id: currentUser.data.client_id }, "organization_name"),
  });

  const { data: clientRecord } = useQuery({
    queryKey: ["client-data", currentUser?.data?.client_id],
    enabled: !!currentUser?.data?.client_id,
    queryFn: async () => {
      const all = await base44.entities.Client.list();
      return all.find(c => c.id === currentUser.data.client_id) || null;
    },
  });

  useEffect(() => {
    if (clientRecord) setClient(clientRecord);
  }, [clientRecord]);

  const lifecycleStages = useMemo(() => client?.lifecycle_stages || [], [client]);

  const sortedStages = useMemo(() => [...lifecycleStages].sort((a, b) => a.order - b.order), [lifecycleStages]);

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    const newStage = destination.droppableId;
    updateDealMutation.mutate({ id: draggableId, data: { stage: newStage } });
    toast.success("Deal stage updated");
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        deal.name?.toLowerCase().includes(q) ||
        deal.organization_name?.toLowerCase().includes(q);
      const matchesType = !filters.contractType || deal.contract_type === filters.contractType;
      const matchesOrg = !filters.orgId || deal.organization_id === filters.orgId;
      return matchesSearch && matchesType && matchesOrg;
    });
  }, [deals, searchQuery, filters]);

  const dealsByStage = useMemo(() => {
    const map = {};
    sortedStages.forEach(s => { map[s.id] = []; });
    filteredDeals.forEach(deal => {
      if (map[deal.stage]) map[deal.stage].push(deal);
      else {
        // stage not in map (custom stage not recognized), put in first column
        const firstId = sortedStages[0]?.id;
        if (firstId) map[firstId].push(deal);
      }
    });
    return map;
  }, [filteredDeals, sortedStages]);

  const stageRevenue = (stageId) => {
    return (dealsByStage[stageId] || []).reduce((sum, d) => sum + (d.value || 0), 0);
  };

  const COLOR_PALETTE = [
    { bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
    { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-400"   },
    { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
    { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-400" },
    { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500"  },
    { bg: "bg-rose-50",    text: "text-rose-600",   dot: "bg-rose-400"   },
    { bg: "bg-cyan-50",    text: "text-cyan-700",   dot: "bg-cyan-400"   },
    { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-400" },
  ];

  const stageColorMap = useMemo(() => {
    const map = {};
    sortedStages.forEach((stage, index) => {
      map[stage.id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return map;
  }, [sortedStages]);

  const getStageColor = (id) => stageColorMap[id] || COLOR_PALETTE[0];

  return (
    <div className="h-full bg-white flex flex-col overflow-hidden">

      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: "hsl(217, 91%, 93%)" }}>
            <Briefcase className="w-4 h-4" style={{ color: "hsl(217, 91%, 45%)" }} />
          </div>
          <span className="text-base font-semibold text-slate-800">Deals</span>
        </div>
        <Button
          onClick={() => setShowNewDeal(true)}
          style={{ backgroundColor: "hsl(217, 91%, 60%)", color: "white" }}
          className="hover:opacity-90 h-8 text-xs px-3"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Deal
        </Button>
      </div>

      <div className="border-t border-slate-200 flex-shrink-0" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0 flex-wrap">
        {/* Filter */}
        <div className="relative" ref={filterButtonRef}>
          <div className="flex items-center">
            <button
              onClick={() => setShowFilterPanel(p => !p)}
              className={`flex items-center gap-2 h-8 px-3 text-xs border transition-colors ${
                activeFilterCount > 0
                  ? "rounded-l-lg border-blue-400 bg-blue-50 text-blue-700 font-medium"
                  : "rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ contractType: "", orgId: "" })}
                className="flex items-center justify-center h-8 w-8 border border-l-0 border-blue-400 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-r-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <DealsFilterPanel
            open={showFilterPanel}
            onClose={() => setShowFilterPanel(false)}
            filters={filters}
            onChange={setFilters}
            organizations={organizations}
          />
        </div>

        {/* Search */}
        <div ref={searchRef} className="flex items-center">
          {searchExpanded ? (
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals..."
                className="pl-8 pr-8 h-8 text-xs w-52"
                onBlur={() => { if (!searchQuery) setSearchExpanded(false); }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSearchExpanded(true)}
              className={`flex items-center justify-center h-8 w-8 border rounded-lg transition-colors ${
                searchQuery ? "border-blue-400 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span>{filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}</span>
          <span className="font-medium text-slate-700">
            ${filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()} total
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 flex-shrink-0" />

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: "hsl(217, 91%, 60%)" }} />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-4 h-full" style={{ minWidth: sortedStages.length * 260 + 32 }}>
              {sortedStages.map((stage) => {
                const color = getStageColor(stage.id);
                const stageDeals = dealsByStage[stage.id] || [];
                const revenue = stageRevenue(stage.id);
                return (
                  <div key={stage.id} className="flex flex-col w-60 flex-shrink-0">
                    {/* Column Header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${color.bg} border border-b-0 border-slate-200`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                        <span className={`text-xs font-semibold ${color.text}`}>{stage.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/70 ${color.text}`}>{stageDeals.length}</span>
                      </div>
                      {revenue > 0 && (
                        <span className={`text-[10px] font-medium ${color.text} opacity-80`}>
                          ${revenue.toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Droppable column */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto rounded-b-lg border border-slate-200 p-2 space-y-2 transition-colors ${
                            snapshot.isDraggingOver ? "bg-blue-50/60" : "bg-slate-50/50"
                          }`}
                          style={{ minHeight: 120 }}
                        >
                          {stageDeals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <KanbanDealCard
                                    deal={deal}
                                    isDragging={snapshot.isDragging}
                                    lifecycleStages={sortedStages}
                                    onUpdate={() => {
                                      queryClient.invalidateQueries({ queryKey: ["deals-board"] });
                                      queryClient.invalidateQueries({ queryKey: ["deals"] });
                                    }}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="text-center py-6 text-[11px] text-slate-400">
                              No deals
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}

      <NewDealDialog
        open={showNewDeal}
        onOpenChange={setShowNewDeal}
        currentUser={currentUser}
        organizations={organizations}
        lifecycleStages={sortedStages}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["deals-board"] });
          queryClient.invalidateQueries({ queryKey: ["deals"] });
        }}
      />
    </div>
  );
}