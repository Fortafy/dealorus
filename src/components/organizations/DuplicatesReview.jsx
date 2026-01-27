import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Merge, ArrowRight, Building2, MapPin, Hash } from "lucide-react";

export default function DuplicatesReview({ clientId, onComplete }) {
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedForMerge, setSelectedForMerge] = useState([]);

  useEffect(() => {
    loadDuplicates();
  }, [clientId]);

  const loadDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('findDuplicates', { client_id: clientId });
      setDuplicateGroups(response.data.duplicateGroups || []);
    } catch (err) {
      setError(err.message || "Failed to find duplicates");
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (group) => {
    if (selectedForMerge.length === 0) {
      alert("Please select at least one duplicate to merge");
      return;
    }

    setMerging(true);
    setError(null);
    try {
      // Merge data from all selected duplicates
      const mergedData = { ...group.primary };
      
      selectedForMerge.forEach(dupIndex => {
        const dup = group.duplicates[dupIndex].organization;
        Object.keys(dup).forEach(key => {
          if (!mergedData[key] || mergedData[key] === null || mergedData[key] === '') {
            mergedData[key] = dup[key];
          }
        });
      });

      const mergeIds = selectedForMerge.map(idx => group.duplicates[idx].organization.id);

      await base44.functions.invoke('mergeOrganizations', {
        keepId: group.primary.id,
        mergeIds,
        mergedData
      });

      // Remove merged group from list
      setDuplicateGroups(prev => prev.filter(g => g.primary.id !== group.primary.id));
      setSelectedGroup(null);
      setSelectedForMerge([]);
    } catch (err) {
      setError(err.message || "Failed to merge organizations");
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 animate-spin" style={{ borderTopColor: 'hsl(217, 91%, 60%)' }} />
      </div>
    );
  }

  if (duplicateGroups.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          No duplicate organizations found. Your database is clean!
        </AlertDescription>
      </Alert>
    );
  }

  if (selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { setSelectedGroup(null); setSelectedForMerge([]); }}>
            ← Back to Duplicates List
          </Button>
          <Button
            onClick={() => handleMerge(selectedGroup)}
            disabled={merging || selectedForMerge.length === 0}
            style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: 'white' }}
          >
            {merging ? "Merging..." : `Merge Selected (${selectedForMerge.length})`}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Primary Record (Will be kept)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <OrganizationDetails org={selectedGroup.primary} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700">Select Duplicates to Merge:</h3>
          {selectedGroup.duplicates.map((dup, idx) => (
            <Card key={idx} className="border-2 border-slate-200">
              <CardHeader className="bg-slate-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Duplicate #{idx + 1}
                    <Badge variant="outline" className="ml-2">
                      {dup.matchReasons.join(', ')}
                    </Badge>
                  </CardTitle>
                  <Checkbox
                    checked={selectedForMerge.includes(idx)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedForMerge([...selectedForMerge, idx]);
                      } else {
                        setSelectedForMerge(selectedForMerge.filter(i => i !== idx));
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <OrganizationDetails org={dup.organization} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Found {duplicateGroups.length} potential duplicate group(s). Review and merge them to clean up your database.
        </AlertDescription>
      </Alert>

      {duplicateGroups.map((group, idx) => (
        <Card key={idx} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{group.primary.organization_name}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {group.primary.city}, {group.primary.state}
                </p>
              </div>
              <Badge variant="destructive" className="text-lg px-3 py-1">
                {group.duplicates.length + 1} Records
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
              <span>Matches:</span>
              {group.duplicates.map((dup, i) => (
                <Badge key={i} variant="outline">
                  {dup.matchReasons.join(', ')}
                </Badge>
              ))}
            </div>
            <Button
              onClick={() => setSelectedGroup(group)}
              variant="outline"
              className="w-full"
            >
              <Merge className="w-4 h-4 mr-2" />
              Review & Merge
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrganizationDetails({ org }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <Building2 className="w-4 h-4 mt-0.5 text-slate-400" />
        <div>
          <span className="font-medium">{org.organization_name}</span>
        </div>
      </div>
      {org.ein && (
        <div className="flex items-start gap-2">
          <Hash className="w-4 h-4 mt-0.5 text-slate-400" />
          <span>EIN: {org.ein}</span>
        </div>
      )}
      {(org.city || org.state) && (
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
          <span>{org.address || org.city}, {org.state} {org.zip_code}</span>
        </div>
      )}
      {org.email && (
        <div className="flex items-start gap-2">
          <span className="text-slate-400">📧</span>
          <span>{org.email}</span>
        </div>
      )}
      {org.phone && (
        <div className="flex items-start gap-2">
          <span className="text-slate-400">📞</span>
          <span>{org.phone}</span>
        </div>
      )}
      {org.website && (
        <div className="flex items-start gap-2">
          <span className="text-slate-400">🌐</span>
          <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {org.website}
          </a>
        </div>
      )}
    </div>
  );
}