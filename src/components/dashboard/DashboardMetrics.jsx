import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function DashboardMetrics({ organization, users }) {
  const metrics = useMemo(() => {
    const totalUsers = users?.length || 0;
    const adminUsers = users?.filter(u => u.organization_role === "admin").length || 0;
    const memberUsers = totalUsers - adminUsers;
    const createdDate = organization?.created_date;

    return {
      totalUsers,
      adminUsers,
      memberUsers,
      createdDate,
    };
  }, [organization, users]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Organization Dashboard</h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 mb-6"
        >
          {/* Total Users */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="w-4 h-4" style={{ color: 'hsl(39, 100%, 50%)' }} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.totalUsers}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {metrics.adminUsers} admin, {metrics.memberUsers} member
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Admin Users */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.adminUsers}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {metrics.totalUsers > 0 ? ((metrics.adminUsers / metrics.totalUsers) * 100).toFixed(0) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Member Users */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
                <Users className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{metrics.memberUsers}</div>
                <p className="text-xs text-slate-500 mt-2">Regular members</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Organization Created */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Created</CardTitle>
                <Calendar className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-slate-900">
                  {metrics.createdDate ? format(new Date(metrics.createdDate), "MMM d, yyyy") : "N/A"}
                </div>
                <p className="text-xs text-slate-500 mt-2">Organization start date</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Users List */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              {users && users.length > 0 ? (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.organization_role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {user.organization_role === "admin" ? "Admin" : "Member"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No team members yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}