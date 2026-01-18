import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { Users, Building2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function Dashboard() {
  const { data: organizations = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.SearchResult.list("-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => base44.entities.Contact.list("-created_date"),
  });

  // Calculate stats
  const stats = useMemo(() => {
    const orgCount = organizations.length;
    const contactCount = contacts.length;

    // Group organizations by ntee_description
    const nteeGroups = {};
    organizations.forEach((org) => {
      const desc = org.ntee_description || "Uncategorized";
      nteeGroups[desc] = (nteeGroups[desc] || 0) + 1;
    });

    // Group organizations by organization_type
    const typeGroups = {};
    organizations.forEach((org) => {
      const type = org.organization_type || "Unknown";
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });

    const nteeData = Object.entries(nteeGroups).map(([name, value]) => ({
      name: name.length > 30 ? name.substring(0, 27) + "..." : name,
      value,
    }));

    const typeData = Object.entries(typeGroups).map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 17) + "..." : name,
      value,
    }));

    return { orgCount, contactCount, nteeData, typeData };
  }, [organizations, contacts]);

  // Recent organizations (top 5)
  const recentOrganizations = organizations.slice(0, 5);

  // Recent contacts (top 5)
  const recentContacts = contacts.slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Building2 className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.orgCount}</div>
                <p className="text-xs text-slate-500 mt-1">saved organizations</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="w-4 h-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.contactCount}</div>
                <p className="text-xs text-slate-500 mt-1">contacts found</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* NTEE Description Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Organizations by NTEE Category</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.nteeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.nteeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ value }) => `${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.nteeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization Type Pie Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Organizations by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.typeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ value }) => `${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stats.typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Items Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Organizations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recently Saved Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrganizations.length > 0 ? (
                  <div className="space-y-3">
                    {recentOrganizations.map((org, index) => (
                      <motion.div
                        key={org.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {org.organization_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {org.city ? `${org.city}, ` : ""}{org.state}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No organizations yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Contacts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recently Created Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                {recentContacts.length > 0 ? (
                  <div className="space-y-3">
                    {recentContacts.map((contact, index) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-start justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {contact.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {contact.title || "No title"}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No contacts yet</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}