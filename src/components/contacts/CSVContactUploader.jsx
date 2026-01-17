import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CSVContactUploader({ organizationId, onComplete, iconOnly }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      // Upload file to Base44
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from CSV with expected schema
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  title: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  linkedin: { type: "string" },
                  role_department: { type: "string" },
                  notes: { type: "string" }
                },
                required: ["name"]
              }
            }
          }
        }
      });

      if (extractionResult.status === "error") {
        setResult({
          success: false,
          message: `Failed to parse CSV: ${extractionResult.details}`
        });
        return;
      }

      const contacts = extractionResult.output.contacts || [];
      let successCount = 0;
      let errorCount = 0;

      // Import each contact
      for (const contact of contacts) {
        try {
          await base44.entities.Contact.create({
            organization_id: organizationId,
            name: contact.name,
            title: contact.title || null,
            email: contact.email || null,
            phone: contact.phone || null,
            linkedin: contact.linkedin || null,
            role_department: contact.role_department || null,
            notes: contact.notes || null,
            source: "CSV Import",
            last_modified: new Date().toISOString()
          });
          successCount++;
        } catch (err) {
          console.error(`Failed to import contact ${contact.name}:`, err);
          errorCount++;
        }
      }

      setResult({
        success: true,
        message: `Successfully imported ${successCount} contact${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      });

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      setResult({
        success: false,
        message: `Import failed: ${err.message}`
      });
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  };

  return (
    <div className={!iconOnly ? "space-y-3" : ""}>
      <div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isProcessing}
          id="csv-upload"
          className="hidden"
        />
        <label htmlFor="csv-upload">
          <Button
            type="button"
            variant={iconOnly ? "ghost" : "outline"}
            size={iconOnly ? "sm" : "sm"}
            disabled={isProcessing}
            className={iconOnly ? "h-8 w-8 p-0" : "gap-2"}
            asChild
          >
            <span>
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <Upload className={iconOnly ? "w-4 h-4 text-slate-600" : "w-4 h-4"} />
              )}
              {!iconOnly && "Import CSV"}
            </span>
          </Button>
        </label>
      </div>

      {!iconOnly && result && (
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