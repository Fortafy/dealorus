import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export default function MigrateNTEEDescriptions({ onComplete }) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, updated: 0 });
  const [result, setResult] = useState(null);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setResult(null);
    setProgress({ current: 0, total: 0, updated: 0 });

    try {
      // Fetch all SearchResult records
      const allRecords = await base44.entities.SearchResult.list();
      
      // Filter records that need updating (have ntee_code but no ntee_description)
      const recordsToUpdate = allRecords.filter(
        record => record.ntee_code && (!record.ntee_description || record.ntee_description.trim() === '')
      );

      setProgress({ current: 0, total: recordsToUpdate.length, updated: 0 });

      let updatedCount = 0;
      let skippedCount = 0;

      // Update each record
      for (let i = 0; i < recordsToUpdate.length; i++) {
        const record = recordsToUpdate[i];
        
        // Clean and normalize the NTEE code
        const cleanCode = record.ntee_code.trim().toUpperCase();
        const description = getNTEEDescription(cleanCode);

        if (description) {
          await base44.entities.SearchResult.update(record.id, {
            ntee_code: cleanCode,
            ntee_description: description
          });
          updatedCount++;
        } else {
          skippedCount++;
        }

        setProgress({ 
          current: i + 1, 
          total: recordsToUpdate.length, 
          updated: updatedCount 
        });
      }

      setResult({
        success: true,
        message: `Successfully updated ${updatedCount} out of ${recordsToUpdate.length} records.${skippedCount > 0 ? ` Skipped ${skippedCount} records with unknown NTEE codes.` : ''}`
      });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setResult({
        success: false,
        message: `Migration failed: ${err.message}`
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleMigrate}
        disabled={isMigrating}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isMigrating ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Migrating... {progress.current}/{progress.total}
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Update NTEE Descriptions
          </>
        )}
      </Button>

      {isMigrating && progress.total > 0 && (
        <div className="text-sm text-slate-600">
          Processing: {progress.current} of {progress.total} records
          <br />
          Updated: {progress.updated}
        </div>
      )}

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}