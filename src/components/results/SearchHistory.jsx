import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Building2, MapPin, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function SearchHistory({ searches }) {
  if (!searches || searches.length === 0) return null;

  const recentSearches = searches.slice(0, 12);

  return (
    <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Clock className="w-5 h-5 text-indigo-600" />
            Recent Searches
          </CardTitle>
          <Link to={createPageUrl("Organizations")}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {recentSearches.map((search) => (
              <Link key={search.id} to={`${createPageUrl("Organizations")}?id=${search.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="group flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate text-sm">
                      {search.organization_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        <MapPin className="w-3 h-3 mr-1" />
                        {search.state}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {format(new Date(search.created_date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}