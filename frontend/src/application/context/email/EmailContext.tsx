'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComposeData {
  to: string;
  subject: string;
  body: string;
}

export interface GmailMessage {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
  labelIds?: string[];
}

export interface EmailContextValue {
  isComposeOpen: boolean;
  composeData: ComposeData;
  openCompose: (data?: Partial<ComposeData>) => void;
  closeCompose: () => void;
  updateCompose: (data: Partial<ComposeData>) => void;
  sendEmail: (data: ComposeData & { from: string }) => Promise<void>;
  inbox: GmailMessage[];
  starred: GmailMessage[];
  isLoadingInbox: boolean;
  fetchInbox: () => Promise<void>;
  fetchStarred: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const EmailCtx = createContext<EmailContextValue | null>(null);

export function EmailProvider({ children }: { children: React.ReactNode }) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState<ComposeData>({ to: '', subject: '', body: '' });
  const [inbox, setInbox] = useState<GmailMessage[]>([]);
  const [starred, setStarred] = useState<GmailMessage[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);

  const openCompose = useCallback((data: Partial<ComposeData> = {}) => {
    setComposeData({ to: '', subject: '', body: '', ...data });
    setIsComposeOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsComposeOpen(false);
    setComposeData({ to: '', subject: '', body: '' });
  }, []);

  const updateCompose = useCallback((data: Partial<ComposeData>) => {
    setComposeData((prev) => ({ ...prev, ...data }));
  }, []);

  const fetchInbox = useCallback(async () => {
    setIsLoadingInbox(true);
    try {
      const res = await fetch('/api/gmail');
      if (res.status === 401) {
        setInbox([]);
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch inbox: ${res.status}`);
      const data = await res.json();
      setInbox(Array.isArray(data) ? data : data.messages ?? []);
    } catch (err) {
      console.error('[EmailContext] fetchInbox error:', err);
      setInbox([]);
    } finally {
      setIsLoadingInbox(false);
    }
  }, []);

  const fetchStarred = useCallback(async () => {
    try {
      const res = await fetch('/api/gmail/starred');
      if (res.status === 401) {
        setStarred([]);
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch starred: ${res.status}`);
      const data = await res.json();
      setStarred(Array.isArray(data) ? data : data.messages ?? []);
    } catch (err) {
      console.error('[EmailContext] fetchStarred error:', err);
      setStarred([]);
    }
  }, []);

  const sendEmail = useCallback(async (data: ComposeData & { from: string }) => {
    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `Send failed: ${res.status}`);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    fetchStarred();
  }, [fetchInbox, fetchStarred]);

  return (
    <EmailCtx.Provider value={{ isComposeOpen, composeData, openCompose, closeCompose, updateCompose, sendEmail, inbox, starred, isLoadingInbox, fetchInbox, fetchStarred }}>
      {children}
    </EmailCtx.Provider>
  );
}

export function useEmailCompose(): EmailContextValue {
  const ctx = useContext(EmailCtx);
  if (!ctx) throw new Error('useEmailCompose must be used within <EmailProvider>');
  return ctx;
}
