import type { Metadata } from 'next';
import { AuthProvider } from '../application/context/auth/AuthContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enterprise SaaS Platform',
  description: 'Unified ERP, CRM, SCM, and BPMS ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
