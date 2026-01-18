import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  Linkedin,
  Briefcase,
  FileText,
  Pencil,
  Trash2,
  ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

function InfoRow({ icon: Icon, label, value, isLink }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'hsl(214, 95%, 93%)' }}>
        <Icon className="w-5 h-5" style={{ color: 'hsl(217, 91%, 60%)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {isLink ? (
          <a
            href={value.includes("@") ? `mailto:${value}` : value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
            style={{ color: 'hsl(217, 91%, 60%)' }}
          >
            {value}
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <p className="text-sm text-slate-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function ContactDetailCard({ contact, onEdit, onDelete }) {
  // Parse source in markdown link format: [display text](url)
  const parseSource = (source) => {
    if (!source) return null;
    const match = source.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      return { text: match[1], url: match[2] };
    }
    return null;
  };

  const parsedSource = parseSource(contact.source);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">{contact.name}</h2>
              <div className="flex flex-wrap gap-2">
                {contact.title && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {contact.title}
                  </Badge>
                )}
                {contact.role_department && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {contact.role_department}
                  </Badge>
                )}
                {contact.source && (
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    {contact.source}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(contact)}
                className="bg-white/90 hover:bg-white h-8 w-8 p-0"
                style={{ color: 'hsl(217, 91%, 60%)' }}
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(contact.id)}
                className="h-8 w-8 p-0"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-0">
            <InfoRow icon={Mail} label="Email" value={contact.email} isLink />
            <InfoRow icon={Phone} label="Phone" value={contact.phone} />
            <InfoRow icon={Linkedin} label="LinkedIn" value={contact.linkedin} isLink />
            <InfoRow icon={Briefcase} label="Role / Department" value={contact.role_department} />
            {contact.notes && (
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{contact.notes}</p>
              </div>
            )}
            {parsedSource && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">Original Source: </span>
                <a
                  href={parsedSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline"
                  style={{ color: 'hsl(217, 91%, 60%)' }}
                >
                  {parsedSource.text}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}