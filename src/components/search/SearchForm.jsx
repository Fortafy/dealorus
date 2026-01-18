import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" }
];

export default function SearchForm({ onSearch, isLoading }) {
  const [orgName, setOrgName] = useState("");
  const [ein, setEin] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [minRevenue, setMinRevenue] = useState("");
  const [maxRevenue, setMaxRevenue] = useState("");
  const [orgType, setOrgType] = useState("");
  const [nteeCodeId, setNteeCodeId] = useState("");

  const NTEE_CATEGORIES = [
    { id: "1", name: "Arts, Culture & Humanities" },
    { id: "2", name: "Education" },
    { id: "3", name: "Environment and Animals" },
    { id: "4", name: "Health" },
    { id: "5", name: "Human Services" },
    { id: "6", name: "International, Foreign Affairs" },
    { id: "7", name: "Public, Societal Benefit" },
    { id: "8", name: "Religion Related" },
    { id: "9", name: "Mutual/Membership Benefit" },
    { id: "10", name: "Unknown, Unclassified" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // State and organization type are required
    if (!state || !orgType) {
      return;
    }
    
    onSearch({
      orgName: orgName.trim() || undefined,
      ein: ein.trim() || undefined,
      state: state || undefined,
      city: city.trim() || undefined,
      minRevenue: minRevenue || undefined,
      maxRevenue: maxRevenue || undefined,
      orgType: orgType || undefined,
      nteeCodeId: nteeCodeId || undefined,
    });
  };

  const handleClear = () => {
    setOrgName("");
    setEin("");
    setState("");
    setCity("");
    setMinRevenue("");
    setMaxRevenue("");
    setOrgType("");
    setNteeCodeId("");
  };

  const hasAnyValue = orgName || ein || city || minRevenue || maxRevenue || nteeCodeId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization Name
            </label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g., American Red Cross"
              className="h-11 bg-white border-slate-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              EIN
            </label>
            <Input
              value={ein}
              onChange={(e) => setEin(e.target.value)}
              placeholder="e.g., 12-3456789"
              className="h-11 bg-white border-slate-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              City
            </label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Austin"
              className="h-11 bg-white border-slate-200"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-11 bg-white border-slate-200">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {US_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Organization Type <span className="text-red-500">*</span>
            </label>
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="h-11 bg-white border-slate-200">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="501c3">501(c)(3) Public Charity</SelectItem>
                <SelectItem value="foundation">Private Foundation</SelectItem>
                <SelectItem value="government">Government Agency</SelectItem>
                <SelectItem value="other">Other Nonprofit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              NTEE Category
            </label>
            <Select value={nteeCodeId} onValueChange={setNteeCodeId}>
              <SelectTrigger className="h-11 bg-white border-slate-200">
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {NTEE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Annual Revenue Range
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={minRevenue}
                onChange={(e) => setMinRevenue(e.target.value)}
                placeholder="Min ($)"
                className="h-11 bg-white border-slate-200"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="number"
                value={maxRevenue}
                onChange={(e) => setMaxRevenue(e.target.value)}
                placeholder="Max ($)"
                className="h-11 bg-white border-slate-200"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center pt-2">
          <div className="flex gap-2">
            {hasAnyValue && (
              <Button
                type="button"
                onClick={handleClear}
                variant="outline"
                className="h-11 px-6"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: 'hsl(217, 91%, 60%)' }}
              className="h-11 px-8 hover:opacity-90 text-white"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search
                </div>
              )}
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}