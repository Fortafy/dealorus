import React from "react";
import { motion } from "framer-motion";
import SalesforceIntegration from "./SalesforceIntegration";

export default function IntegrationsSection({ organization }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="settings-page"
    >
      <div className="settings-stack">
        <h2 className="settings-page-title">Integrations</h2>
        <SalesforceIntegration organization={organization} />
      </div>
    </motion.div>
  );
}