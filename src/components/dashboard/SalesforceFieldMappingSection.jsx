import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

// All mappable Organization fields
const ORGANIZATION_FIELDS = [
  { name: "organization_name", label: "Organization Name" },
  { name: "ein", label: "EIN" },
  { name: "state", label: "State" },
  { name: "city", label: "City" },
  { name: "address", label: "Address" },
  { name: "zip_code", label: "Zip Code" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "website", label: "Website" },
  { name: "organization_type", label: "Organization Type" },
  { name: "mission", label: "Mission" },
  { name: "annual_revenue", label: "Annual Revenue" },
  { name: "ntee_code", label: "NTEE Code" },
  { name: "ntee_description", label: "NTEE Description" },
  { name: "ruling_date", label: "Ruling Date" },
  { name: "lifecycle_stage", label: "Lifecycle Stage" },
  { name: "is_client", label: "Is Client" },
  { name: "deal_value", label: "Deal Value" },
  { name: "next_activity_date", label: "Next Activity Date" },
];

export default function SalesforceFieldMappingSection({ organization }) {
  const [sfFields, setSfFields] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedOk, setSavedOk] = useState(false);

  const clientId = organization?.id;

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [existingMappings, fieldsRes] = await Promise.all([
        base44.entities.SalesforceFieldMapping.filter({ client_id: clientId }),
        loadSalesforceFields()
      ]);
      setMappings(existingMappings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesforceFields = async () => {
    setLoadingFields(true);
    try {
      const res = await base44.functions.invoke('getSalesforceAccountFields', {});
      if (res.data?.success) {
        setSfFields(res.data.fields);
      } else {
        setError(res.data?.error || 'Failed to load Salesforce fields');
      }
    } catch (err) {
      setError('Could not retrieve Salesforce fields: ' + err.message);
    } finally {
      setLoadingFields(false);
    }
  };

  const addMapping = () => {
    setMappings(prev => [...prev, {
      _isNew: true,
      client_id: clientId,
      dealorous_field: '',
      salesforce_field: '',
      salesforce_field_label: '',
      salesforce_field_type: '',
      is_active: true
    }]);
  };

  const removeMapping = async (index) => {
    const mapping = mappings[index];
    if (mapping.id) {
      await base44.entities.SalesforceFieldMapping.delete(mapping.id);
    }
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  const updateMapping = (index, changes) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, ...changes } : m));
  };

  const handleSfFieldChange = (index, sfFieldName) => {
    const sfField = sfFields.find(f => f.name === sfFieldName);
    updateMapping(index, {
      salesforce_field: sfFieldName,
      salesforce_field_label: sfField?.label || sfFieldName,
      salesforce_field_type: sfField?.type || ''
    });
  };

  const saveAll = async () => {
    setSaving(true);
    setSavedOk(false);
    setError(null);
    try {
      for (const mapping of mappings) {
        if (!mapping.dealorous_field || !mapping.salesforce_field) continue;
        const payload = {
          client_id: clientId,
          dealorous_field: mapping.dealorous_field,
          salesforce_field: mapping.salesforce_field,
          salesforce_field_label: mapping.salesforce_field_label,
          salesforce_field_type: mapping.salesforce_field_type,
          is_active: mapping.is_active
        };
        if (mapping.id) {
          await base44.entities.SalesforceFieldMapping.update(mapping.id, payload);
        } else {
          await base44.entities.SalesforceFieldMapping.create(payload);
        }
      }
      // Reload to get fresh IDs
      const fresh = await base44.entities.SalesforceFieldMapping.filter({ client_id: clientId });
      setMappings(fresh || []);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const usedDealorousFields = mappings.map(m => m.dealorous_field).filter(Boolean);
  const usedSfFields = mappings.map(m => m.salesforce_field).filter(Boolean);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-48">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-100 rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: 'hsl(39, 100%, 50%)' }} />
          <p className="text-slate-500 text-sm">Loading field mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Salesforce Field Mapping</h2>
          <p className="text-sm text-slate-500 mt-1">
            Map Dealorous Organization fields to Salesforce Account fields. These mappings control what data is pushed when syncing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSalesforceFields}
          disabled={loadingFields}
          className="flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingFields ? 'animate-spin' : ''}`} />
          Refresh SF Fields
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!organization?.salesforce_connected && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Salesforce is not connected. Connect it in <strong>Organization Settings</strong> first, then return here to configure field mappings.
          </AlertDescription>
        </Alert>
      )}

      {sfFields.length === 0 && !error && organization?.salesforce_connected && (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            No Salesforce fields loaded. Make sure your Salesforce connection is active and click "Refresh SF Fields".
          </AlertDescription>
        </Alert>
      )}

      {/* Mapping Rows */}
      <div className="space-y-3">
        {mappings.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-slate-400 text-sm">No field mappings configured yet.</p>
            <p className="text-slate-400 text-xs mt-1">Click "Add Mapping" to get started.</p>
          </div>
        )}

        {mappings.map((mapping, index) => (
          <div
            key={mapping.id || `new-${index}`}
            className={`flex items-center gap-3 p-3 rounded-lg border ${mapping.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
          >
            {/* Dealorous Field */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1 font-medium">Dealorous Field</p>
              <Select
                value={mapping.dealorous_field}
                onValueChange={(val) => updateMapping(index, { dealorous_field: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_FIELDS.map(f => (
                    <SelectItem
                      key={f.name}
                      value={f.name}
                      disabled={usedDealorousFields.includes(f.name) && mapping.dealorous_field !== f.name}
                    >
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-4" />

            {/* Salesforce Field */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-1 font-medium">Salesforce Account Field</p>
              <Select
                value={mapping.salesforce_field}
                onValueChange={(val) => handleSfFieldChange(index, val)}
                disabled={sfFields.length === 0}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={sfFields.length === 0 ? "Load SF fields first..." : "Select field..."} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {sfFields.map(f => (
                    <SelectItem
                      key={f.name}
                      value={f.name}
                      disabled={usedSfFields.includes(f.name) && mapping.salesforce_field !== f.name}
                    >
                      <span>{f.label}</span>
                      <span className="ml-2 text-slate-400 text-xs">({f.name})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mapping.salesforce_field_type && (
                <Badge variant="outline" className="mt-1 text-xs px-1 py-0 h-4">
                  {mapping.salesforce_field_type}
                </Badge>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <p className="text-xs text-slate-500">Active</p>
              <Switch
                checked={mapping.is_active}
                onCheckedChange={(val) => updateMapping(index, { is_active: val })}
              />
            </div>

            {/* Remove */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0 mt-3"
              onClick={() => removeMapping(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={addMapping}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Mapping
        </Button>

        <div className="flex items-center gap-3">
          {savedOk && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}
          <Button
            onClick={saveAll}
            disabled={saving || mappings.length === 0}
            size="sm"
            style={{ backgroundColor: 'hsl(39, 100%, 50%)' }}
            className="text-white hover:opacity-90"
          >
            {saving ? "Saving..." : "Save Mappings"}
          </Button>
        </div>
      </div>

      {mappings.length > 0 && (
        <p className="text-xs text-slate-400">
          {mappings.filter(m => m.is_active).length} active mapping{mappings.filter(m => m.is_active).length !== 1 ? 's' : ''} — these will be applied when pushing Organizations to Salesforce.
        </p>
      )}
    </div>
  );
}