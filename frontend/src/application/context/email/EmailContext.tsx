'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Public types — DO NOT change GmailMessage shape without also updating
// `frontend/src/app/dashboard/crm/inbox/page.tsx`.
// ---------------------------------------------------------------------------

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromEmail?: string;
  to?: string[];
  subject: string;
  snippet: string;
  date: string;
  read: boolean;
  starred?: boolean;
  isUnread?: boolean;
  isStarred?: boolean;
  labelIds?: string[];
}

interface ComposeData {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  /** Optional CRM linkage — populated automatically by openComposeForContact(). */
  contactId?: string;
  dealId?: string;
}

interface EmailContextValue {
  // Data
  inbox: GmailMessage[];
  starred: GmailMessage[];
  isLoadingInbox: boolean;
  isConnected: boolean;
  connectedEmail: string | null;

  // Compose state
  isComposeOpen: boolean;
  composeData: ComposeData;

  // Actions
  openCompose: (initial?: Partial<ComposeData>) => void;
  openComposeForContact: (email: string, name?: string, contactId?: string, dealId?: string) => void;
  closeCompose: () => void;
  updateCompose: (patch: Partial<ComposeData>) => void;
  sendEmail: () => Promise<{ ok: boolean; error?: string }>;
  refreshInbox: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const EMPTY_COMPOSE: ComposeData = { to: '', subject: '', body: '' };

const EmailContext = createContext<EmailContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [isComposeOpen, setComposeOpen] = useState(false);
  const [composeData,   setComposeData] = useState<ComposeData>(EMPTY_COMPOSE);
  const [inbox,         setInbox]       = useState<GmailMessage[]>([]);
  const [isLoadingInbox, setLoadingInbox] = useState(false);
  const [isConnected,   setConnected]   = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);

  // ─── Compose controls ────────────────────────────────────────────────────

  const openCompose = useCallback((initial?: Partial<ComposeData>) => {
    setComposeData({ ...EMPTY_COMPOSE, ...(initial ?? {}) });
    setComposeOpen(true);
  }, []);

  const openComposeForContact = useCallback(
    (email: string, _name?: string, contactId?: string, dealId?: string) => {
      setComposeData({ ...EMPTY_COMPOSE, to: email, contactId, dealId });
      setComposeOpen(true);
    },
    [],
  );

  const closeCompose = useCallback(() => setComposeOpen(false), []);

  const updateCompose = useCallback((patch: Partial<ComposeData>) => {
    setComposeData((prev) => ({ ...prev, ...patch }));
  }, []);

  // ─── Status / inbox fetch ────────────────────────────────────────────────

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/status', { cache: 'no-store' });
      if (!res.ok) { setConnected(false); setConnectedEmail(null); return; }
      const json = await res.json();
      setConnected(Boolean(json.connected));
      setConnectedEmail(json.email ?? null);
    } catch {
      setConnected(false);
      setConnectedEmail(null);
    }
  }, []);

  const refreshInbox = useCallback(async () => {
    setLoadingInbox(true);
    try {
      const res = await fetch('/api/gmail/messages?limit=50', { cache: 'no-store' });
      if (!res.ok) { setInbox([]); return; }
      const json = await res.json();
      const items: GmailMessage[] = (json.items ?? []).map((m: GmailMessage) => ({
        ...m,
        isUnread: !m.read,
      }));
      setInbox(items);
    } catch {
      setInbox([]);
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  // On mount → status, then inbox if connected.
  useEffect(() => {
    (async () => {
      await refreshStatus();
    })();
  }, [refreshStatus]);

  useEffect(() => {
    if (isConnected) {
      void refreshInbox();
    } else {
      setInbox([]);
    }
  }, [isConnected, refreshInbox]);

  // ─── Send ────────────────────────────────────────────────────────────────

  const sendEmail = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!composeData.to.trim()) return { ok: false, error: 'Destinatario requerido' };
    try {
      const res = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:        composeData.to,
          cc:        composeData.cc,
          bcc:       composeData.bcc,
          subject:   composeData.subject,
          body:      composeData.body,
          contactId: composeData.contactId,
          dealId:    composeData.dealId,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, error: text || `Error ${res.status}` };
      }
      setComposeOpen(false);
      setComposeData(EMPTY_COMPOSE);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }, [composeData]);

  const value: EmailContextValue = {
    inbox,
    starred: inbox.filter((m) => m.isStarred || m.starred),
    isLoadingInbox,
    isConnected,
    connectedEmail,
    isComposeOpen,
    composeData,
    openCompose,
    openComposeForContact,
    closeCompose,
    updateCompose,
    sendEmail,
    refreshInbox,
    refreshStatus,
  };

  return <EmailContext.Provider value={value}>{children}</EmailContext.Provider>;
}

export function useEmailCompose(): EmailContextValue {
  const ctx = useContext(EmailContext);
  if (!ctx) throw new Error('useEmailCompose must be used within an EmailProvider');
  return ctx;
}
