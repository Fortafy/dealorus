import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, AlertTriangle, ArrowLeft, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import SearchForm from "@/components/search/SearchForm";
import OrganizationCard from "@/components/results/OrganizationCard";
import SearchResultsTable from "@/components/search/SearchResultsTable";
import { getNTEEDescription } from "@/components/utils/nteeCodeLookup";
import { formatEIN } from "@/components/utils/einFormatter";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

// ── Manual Create Tab ──────────────────────────────────────────────────────────

function ManualCreateTab({ clientId, userId, onSaved, onClose }) {
  const [form, setForm] = useState({
    abbreviation: "",
    organization_name: "",
    state: "",
    city: "",
    ein: "",
    organization_type: "",
    website: "",
    phone: "",
    email: "",
  });
  const [duplicate, setDuplicate] = useState(null); // { reason } | null
  const [isDuplicateChecked, setIsDuplicateChecked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setDuplicate(null);
    setIsDuplicateChecked(false);
    setError(null);
  };

  const checkForDuplicate = async () => {
    if (!form.abbreviation.trim() || !form.organization_name.trim() || !form.state.trim()) {
      setError("Abbreviation, organization name, and state are required.");
      return false;
    }
    setIsChecking(true);
    const existing = await base44.entities.Organization.filter({ client_id: clientId });
    const einClean = form.ein?.replace(/\D/g, "");

    for (const org of existing) {
      const nameMatch = org.organization_name?.toLowerCase().trim() === form.organization_name.toLowerCase().trim();
      const einMatch = einClean && org.ein && org.ein.replace(/\D/g, "") === einClean;
      const stateMatch = org.state?.toLowerCase() === form.state.toLowerCase();
      const cityMatch = form.city && org.city?.toLowerCase().trim() === form.city.toLowerCase().trim();

      if (einMatch) {
        setDuplicate({ reason: "An organization with the same EIN already exists." });
        setIsChecking(false);
        setIsDuplicateChecked(true);
        return false;
      }
      if (nameMatch && stateMatch && (cityMatch || !form.city)) {
        setDuplicate({ reason: "An organization with the same name and location already exists." });
        setIsChecking(false);
        setIsDuplicateChecked(true);
        return false;
      }
    }
    setIsChecking(false);
    setIsDuplicateChecked(true);
    return true;
  };

  const handleSave = async (force = false) => {
    if (!force) {
      const ok = await checkForDuplicate();
      if (!ok) return; // duplicate warning shown, user must confirm
    }
    setIsSaving(true);
    const saved = await base44.entities.Organization.create({
      ...form,
      abbreviation: form.abbreviation.trim(),
      organization_name: form.organization_name.trim(),
      city: form.city?.trim() || null,
      ein: form.ein?.trim() || null,
      organization_type: form.organization_type || null,
      website: form.website?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      client_id: clientId,
      user_id: userId,
    });
    setIsSaving(false);
    toast.success("Organization saved");
    onSaved(saved);
    onClose();
  };

  const canSubmit = form.abbreviation.trim() && form.organization_name.trim() && form.state.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Organization Name *</label>
          <Input value={form.organization_name} onChange={e => set("organization_name", e.target.value)} placeholder="e.g. United Way of America" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Abbreviation *</label>
          <Input value={form.abbreviation} onChange={e => set("abbreviation", e.target.value)} placeholder="e.g. UWA" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">EIN</label>
          <Input value={form.ein} onChange={e => set("ein", e.target.value)} placeholder="XX-XXXXXXX" />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Organization Type</label>
          <Select value={form.organization_type} onValueChange={v => set("organization_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="501c3">501(c)(3) Public Charity</SelectItem>
              <SelectItem value="foundation">Private Foundation</SelectItem>
              <SelectItem value="government">Government Agency</SelectItem>
              <SelectItem value="other">Other Nonprofit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
          <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">State *</label>
          <Select value={form.state} onValueChange={v => set("state", v)}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@org.org" type="email" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Phone number" />
        </div>

        <div className="col-span-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Website</label>
          <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {duplicate && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <p className="font-medium mb-2">Potential duplicate detected</p>
            <p className="text-sm mb-3">{duplicate.reason}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setDuplicate(null); setIsDuplicateChecked(false); }}>
                Go Back
              </Button>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleSave(true)}>
                Save Anyway
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!duplicate && (
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!canSubmit || isChecking || isSaving}
            onClick={() => handleSave(false)}
          >
            {isChecking ? "Checking..." : isSaving ? "Saving..." : "Save Organization"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Search & Add Tab ───────────────────────────────────────────────────────────

function SearchAddTab({ clientId, userId, onSaved, onClose }) {
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLLMSearching, setIsLLMSearching] = useState(false);
  const [lastSearchParams, setLastSearchParams] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async ({ orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeCodeId }) => {
    setIsSearching(true);
    setError(null);
    setSearchResult(null);
    setLastSearchParams({ orgName, ein, state, city, minRevenue, maxRevenue, orgType, nteeCodeId });

    try {
      const searchParams = {};
      if (state) searchParams.state = state;
      if (city) searchParams.city = city;
      if (ein) searchParams.ein = ein;
      if (orgName) searchParams.orgName = orgName;
      if (orgType) searchParams.orgType = orgType;
      if (nteeCodeId) searchParams.nteeCodeId = nteeCodeId;

      const response = await base44.functions.invoke("propublicaSearch", searchParams);
      let results = response?.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];

      if (orgName) results = results.filter(o => o.organization_name?.toLowerCase().includes(orgName.toLowerCase()));
      if (minRevenue || maxRevenue) {
        results = results.filter(o => {
          if (!o.annual_revenue) return false;
          const rev = parseFloat(o.annual_revenue.replace(/[$,]/g, ""));
          if (minRevenue && rev < parseFloat(minRevenue)) return false;
          if (maxRevenue && rev > parseFloat(maxRevenue)) return false;
          return true;
        });
      }

      results.forEach(o => {
        if (o.ntee_code && !o.ntee_description) o.ntee_description = getNTEEDescription(o.ntee_code);
        if (o.ein) o.ein = formatEIN(o.ein);
      });

      setSearchResult(results);
    } catch (err) {
      setError("Unable to fetch from ProPublica: " + (err.message || "Unknown error"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleLLMSearch = async () => {
    if (!lastSearchParams) return;
    setIsLLMSearching(true);
    setError(null);
    try {
      const { orgName, state, city } = lastSearchParams;
      const prompt = `Find nonprofit organization data for "${orgName || "any"}"${city ? ` in ${city}` : ""}${state ? `, ${state}` : ""}. Return organization_name, state, ein, address, city, zip_code, phone, email, website, organization_type, mission, annual_revenue, ntee_code, ruling_date, data_sources.`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt, add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            organization_name: { type: "string" }, state: { type: "string" },
            ein: { type: ["string","null"] }, address: { type: ["string","null"] },
            city: { type: ["string","null"] }, zip_code: { type: ["string","null"] },
            phone: { type: ["string","null"] }, email: { type: ["string","null"] },
            website: { type: ["string","null"] }, organization_type: { type: ["string","null"] },
            mission: { type: ["string","null"] }, annual_revenue: { type: ["string","null"] },
            ntee_code: { type: ["string","null"] }, ruling_date: { type: ["string","null"] },
            data_sources: { type: "array", items: { type: "string" } },
          },
        },
      });
      if (result.organization_name) {
        if (result.ntee_code && !result.ntee_description) result.ntee_description = getNTEEDescription(result.ntee_code);
        if (result.ein) result.ein = formatEIN(result.ein);
        setSearchResult([result]);
      } else {
        setError("AI search could not find the organization.");
      }
    } catch (err) {
      setError("AI search failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLLMSearching(false);
    }
  };

  const handleSave = async (data) => {
    const saved = await base44.entities.Organization.create({ ...data, client_id: clientId, user_id: userId });
    toast.success("Organization saved");
    onSaved(saved);
    onClose();
  };

  const handleSaveAll = async () => {
    if (!Array.isArray(searchResult)) return;
    for (const org of searchResult) {
      await base44.entities.Organization.create({ ...org, client_id: clientId, user_id: userId });
    }
    toast.success(`${searchResult.length} organizations saved`);
    onSaved(null);
    onClose();
  };

  return (
    <div>
      <SearchForm onSearch={handleSearch} isLoading={isSearching} />

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSearching && (
        <div className="flex flex-col items-center justify-center py-10 mt-4">
          <div className="w-10 h-10 rounded-full border-4 border-blue-100 animate-spin mb-3" style={{ borderTopColor: "hsl(217, 91%, 60%)" }} />
          <p className="text-slate-600 font-medium">Searching ProPublica database...</p>
        </div>
      )}

      {searchResult && !isSearching && (
        <div className="mt-4">
          {selectedOrg ? (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrg(null)} className="mb-3">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
              </Button>
              <OrganizationCard data={selectedOrg} onSave={handleSave} isSaved={false} />
            </div>
          ) : searchResult.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <p className="text-slate-700 mb-4">No results found in ProPublica. Try searching via AI.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleLLMSearch} disabled={isLLMSearching}>
                  {isLLMSearching ? "Searching..." : "Search via AI"}
                </Button>
                <Button variant="outline" onClick={() => { setSearchResult(null); setLastSearchParams(null); }}>
                  Clear
                </Button>
              </div>
            </div>
          ) : searchResult.length > 1 ? (
            <SearchResultsTable
              results={searchResult}
              onSelectOrganization={setSelectedOrg}
              onSaveAll={handleSaveAll}
              onSaveSelected={async (selected) => {
                for (const org of selected) await base44.entities.Organization.create({ ...org, client_id: clientId, user_id: userId });
                toast.success(`${selected.length} organizations saved`);
                onSaved(null);
                onClose();
              }}
            />
          ) : (
            <OrganizationCard data={searchResult[0]} onSave={handleSave} isSaved={false} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────────────────────────────────

export default function NewAccountDialog({ open, onOpenChange, onSaved }) {
  const [activeTab, setActiveTab] = useState("manual");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, [open]);

  const handleClose = () => onOpenChange(false);
  const handleSaved = (org) => {
    onSaved?.(org);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Account</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Manually
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-3.5 h-3.5 mr-1.5" /> Search & Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-0">
            {currentUser ? (
              <ManualCreateTab
                clientId={currentUser.client_id}
                userId={currentUser.id}
                onSaved={handleSaved}
                onClose={handleClose}
              />
            ) : (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-0">
            {currentUser ? (
              <SearchAddTab
                clientId={currentUser.client_id}
                userId={currentUser.id}
                onSaved={handleSaved}
                onClose={handleClose}
              />
            ) : (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}