import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export default function ProcessingProgress({ results, total, currentIndex }) {
  const completed = results.length;
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Card className="border-0 shadow-lg shadow-slate-100/50 bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">
          Processing Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">
              {completed} of {total} organizations
            </span>
            <span className="font-semibold text-slate-800">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-600">
              <strong className="text-slate-800">{successCount}</strong> Success
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-slate-600">
              <strong className="text-slate-800">{errorCount}</strong> Failed
            </span>
          </div>
        </div>

        {currentIndex < total && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Processing organization {currentIndex + 1}...
            </div>
          </div>
        )}

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Recent Results
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.slice(-5).reverse().map((result, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm"
                >
                  {result.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="truncate flex-1 text-slate-700">
                    {result.organization_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      result.status === "success"
                        ? "text-green-600 border-green-200"
                        : "text-red-600 border-red-200"
                    }`}
                  >
                    {result.state}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}