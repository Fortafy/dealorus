import React from "react";

export default function ToolCard({ title, description, actions, children }) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-row-responsive">
          <div className="settings-text-block">
            <h2 className="settings-card-title">{title}</h2>
            <p className="settings-card-description">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      </div>
      <div className="settings-card-body-stack">{children}</div>
    </section>
  );
}