import React, { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const buildDefaultSubject = (deal) => `Proposal PDF: ${deal?.name || "Deal"}`;
const buildDefaultBody = (deal, pdfUrl) => `Hi,\n\nHere is the proposal PDF for ${deal?.name || "this deal"}:\n${pdfUrl}\n\nBest,`;

export default function ProposalPdfEmailDialog({ open, onOpenChange, deal, pdfUrl, onSent }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const defaultSubject = useMemo(() => buildDefaultSubject(deal), [deal]);
  const defaultBody = useMemo(() => buildDefaultBody(deal, pdfUrl), [deal, pdfUrl]);

  useEffect(() => {
    if (open) {
      setTo("");
      setSubject(defaultSubject);
      setBody(defaultBody);
    }
  }, [open, defaultSubject, defaultBody]);

  const sendMutation = useMutation({
    mutationFn: () => base44.functions.invoke("sendProposalPdfEmail", {
      dealId: deal.id,
      to,
      subject,
      body,
      pdfUrl,
    }),
    onSuccess: () => {
      toast.success("Proposal email sent");
      onSent?.();
      onOpenChange(false);
    },
  });

  const handleSend = () => {
    if (!to.trim() || !subject.trim() || !body.trim() || !pdfUrl) {
      toast.error("Please fill in all fields");
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Email Proposal PDF</DialogTitle>
          <DialogDescription>Send a public link to this proposal PDF and log it on the activity timeline.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">To</label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" type="email" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Message</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[140px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>{sendMutation.isPending ? "Sending..." : "Send Email"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}