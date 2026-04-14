'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmailCompose } from '../../../application/context/email/EmailContext';
import { useCurrentUser } from '../../../application/hooks/useCurrentUser';

/**
 * Gmail-style compose window — fixed bottom-right.
 * Controlled via EmailContext.openCompose() / closeCompose().
 */
export default function ComposeEmailModal() {
  const { isComposeOpen, composeData, updateCompose, closeCompose, sendEmail } = useEmailCompose();
  const user = useCurrentUser();

  const [minimized, setMinimized] = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  if (!isComposeOpen) return null;

  const handleSend = async () => {
    if (!composeData.to.trim()) {
      toRef.current?.focus();
      return;
    }
    setSending(true);
    try {
      await sendEmail({ ...composeData, from: user.email });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSending(false);
        closeCompose();
      }, 1200);
    } catch {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="compose"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 right-6 z-[100] w-[520px] rounded-t-xl shadow-2xl bg-white border border-neutral-200 flex flex-col overflow-hidden"
        style={{ maxHeight: minimized ? 48 : 480 }}
      >
        {/* ── Header ─────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-neutral-900 cursor-pointer select-none flex-shrink-0"
          onClick={() => setMinimized((m) => !m)}
        >
          <span className="text-sm font-semibold text-white truncate">
            {sent ? '¡Correo enviado!' : composeData.subject || 'Nuevo correo'}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMinimized((m) => !m)}
              className="rounded p-1 text-neutral-300 hover:bg-white/10 transition-colors"
              title={minimized ? 'Expandir' : 'Minimizar'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                {minimized
                  ? <path d="M2 12l5-5 5 5"/>
                  : <path d="M2 10h10"/>}
              </svg>
            </button>
            <button
              onClick={closeCompose}
              className="rounded p-1 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
              title="Cerrar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 2l10 10M12 2L2 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body (hidden when minimized) ────────── */}
        {!minimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* From */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5">
              <span className="text-xs text-neutral-400 w-12 flex-shrink-0">De</span>
              <span className="text-sm text-neutral-600 truncate">{user.email}</span>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2">
              <label htmlFor="compose-to" className="text-xs text-neutral-400 w-12 flex-shrink-0">Para</label>
              <input
                id="compose-to"
                ref={toRef}
                type="email"
                value={composeData.to}
                onChange={(e) => updateCompose({ to: e.target.value })}
                placeholder="destinatario@correo.com"
                className="flex-1 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 bg-transparent"
                autoFocus={!composeData.to}
              />
            </div>

            {/* Subject */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2">
              <label htmlFor="compose-subject" className="text-xs text-neutral-400 w-12 flex-shrink-0">Asunto</label>
              <input
                id="compose-subject"
                type="text"
                value={composeData.subject}
                onChange={(e) => updateCompose({ subject: e.target.value })}
                placeholder="Asunto del correo"
                className="flex-1 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 bg-transparent"
              />
            </div>

            {/* Body */}
            <textarea
              value={composeData.body}
              onChange={(e) => updateCompose({ body: e.target.value })}
              placeholder="Escribe tu mensaje aquí..."
              className="flex-1 resize-none px-4 py-3 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 bg-transparent min-h-[200px]"
            />

            {/* Toolbar */}
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 bg-neutral-50 flex-shrink-0">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex items-center gap-2 rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
              >
                {sending ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                    />
                    {sent ? 'Enviado' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1.5 7l11-5.5-5.5 11L6 8.5 1.5 7z"/><path d="M6 8.5l5.5-7"/>
                    </svg>
                    Enviar
                  </>
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={closeCompose}
                  className="rounded p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600 transition-colors"
                  title="Descartar borrador"
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <path d="M3 3l9 9M12 3L3 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
