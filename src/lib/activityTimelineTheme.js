import { format, isValid } from "date-fns";
import {
  CheckCircle2,
  Edit,
  Handshake,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

const ACTIVITY_TIMELINE_APPEARANCE = {
  note: { icon: MessageSquare, label: "Note Added", tone: "note" },
  create: { icon: CheckCircle2, label: "Contact Created", tone: "success" },
  created: { icon: CheckCircle2, label: "Created", tone: "success" },
  edit: { icon: Edit, label: "Contact Edited", tone: "edit" },
  enrich: { icon: Sparkles, label: "Contact Enriched", tone: "enrich" },
  star: { icon: Star, label: "Contact Starred", tone: "note" },
  deal: { icon: Handshake, label: "Deal Added", tone: "deal" },
  call: { icon: Phone, label: "Call Logged", tone: "call" },
  email: { icon: Mail, label: "Email Logged", tone: "email" },
  meeting: { icon: Users, label: "Meeting Logged", tone: "meeting" },
  interaction: { icon: Users, label: "Interaction Logged", tone: "meeting" },
  default: { icon: Edit, label: "Activity", tone: "edit" },
};

export function getActivityTimelineAppearance(type) {
  return ACTIVITY_TIMELINE_APPEARANCE[type] || ACTIVITY_TIMELINE_APPEARANCE.default;
}

export function getActivityTimelineNodeClass(type) {
  const appearance = getActivityTimelineAppearance(type);
  return `activity-timeline-node activity-timeline-node--${appearance.tone}`;
}

export function getActivityTimelineAccentClass(type) {
  const appearance = getActivityTimelineAppearance(type);
  return `activity-timeline-accent activity-timeline-accent--${appearance.tone}`;
}

export function toSafeActivityTimelineDate(value) {
  const date = value ? new Date(value) : null;
  return date && isValid(date) ? date : null;
}

export function formatActivityTimelineDate(value) {
  const date = toSafeActivityTimelineDate(value);
  return date ? format(date, "MMM d, yyyy") : "Date unavailable";
}