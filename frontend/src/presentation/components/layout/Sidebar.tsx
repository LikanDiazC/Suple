'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { tokens } from '../../theme/tokens';
import { sidebarVariants } from '../../animations/variants';
import { useMobileMenu } from '../../../application/context/mobile-menu/MobileMenuContext';
import { useTranslation } from '../../../application/context/locale/LocaleContext';
import type { TranslationKey } from '../../../application/i18n/translations';

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { labelKey: TranslationKey; href: string }[];
}

const NAV_SECTIONS_DEF: { titleKey: TranslationKey; items: NavItem[] }[] = [
  {
    titleKey: 'nav.general',
    items: [
      { labelKey: 'nav.dashboard', href: '/dashboard', icon: <GridIcon /> },
    ],
  },
  {
    titleKey: 'nav.modules',
    items: [
      {
        labelKey: 'nav.crm',
        href: '/dashboard/crm',
        icon: <UsersIcon />,
        children: [
          { labelKey: 'nav.contacts',  href: '/dashboard/crm/contacts' },
          { labelKey: 'nav.companies', href: '/dashboard/crm/companies' },
          { labelKey: 'nav.deals',     href: '/dashboard/crm/deals' },
          { labelKey: 'nav.inbox',     href: '/dashboard/crm/inbox' },
          { labelKey: 'nav.catalog',   href: '/dashboard/crm/catalog' },
        ],
      },
      {
        labelKey: 'nav.marketing',
        href: '/dashboard/marketing',
        icon: <MegaphoneIcon />,
        children: [
          { labelKey: 'nav.campaigns', href: '/dashboard/marketing/campaigns' },
          { labelKey: 'nav.forms',     href: '/dashboard/marketing/forms' },
        ],
      },
      {
        labelKey: 'nav.erp',
        href: '/dashboard/erp',
        icon: <LedgerIcon />,
        children: [
          { labelKey: 'nav.accounting', href: '/dashboard/erp' },
          { labelKey: 'nav.orders',     href: '/dashboard/erp/orders' },
          { labelKey: 'nav.sii',        href: '/dashboard/sii' },
        ],
      },
      {
        labelKey: 'nav.scm',
        href: '/dashboard/scm',
        icon: <TruckIcon />,
        children: [
          { labelKey: 'nav.inventory',  href: '/dashboard/scm/inventory' },
        ],
      },
      {
        labelKey: 'nav.bpms',
        href: '/dashboard/bpms',
        icon: <WorkflowIcon />,
        children: [
          { labelKey: 'nav.processes', href: '/dashboard/bpms/processes' },
          { labelKey: 'nav.tasks',     href: '/dashboard/bpms/tasks' },
          { labelKey: 'nav.monitor',   href: '/dashboard/bpms/monitor' },
          { labelKey: 'nav.designer',  href: '/dashboard/bpms/designer' },
        ],
      },
    ],
  },
  {
    titleKey: 'nav.system',
    items: [
      { labelKey: 'nav.settings', href: '/dashboard/settings', icon: <GearIcon /> },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  // Track expanded sections by their href (stable identifier) instead of translated label
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['/dashboard/crm', '/dashboard/marketing', '/dashboard/erp', '/dashboard/scm', '/dashboard/bpms']),
  );
  const pathname = usePathname();
  const { isOpen: mobileOpen, close: closeMobile } = useMobileMenu();
  const { t } = useTranslation();

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });
  };

  // Close the mobile sidebar after navigating (UX: mirror native app drawers).
  const handleMobileNavigate = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      closeMobile();
    }
  };

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={collapsed ? 'collapsed' : 'expanded'}
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-neutral-200 bg-white transition-transform duration-300 ${
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } lg:translate-x-0 lg:shadow-none`}
    >
      {/* Logo Header */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-lg font-bold tracking-tight text-neutral-900"
            >
              Suple
            </motion.span>
          )}
        </AnimatePresence>
        {/* Desktop collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:inline-flex rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {collapsed ? (
              <>
                <path d="M3 4h12M3 9h12M3 14h12" />
              </>
            ) : (
              <>
                <path d="M3 4h12M3 9h8M3 14h12" />
              </>
            )}
          </svg>
        </button>

        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          className="lg:hidden rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          aria-label="Cerrar menú"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l10 10M14 4L4 14" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" role="navigation" aria-label="Main navigation">
        {NAV_SECTIONS_DEF.map((section) => (
          <div key={section.titleKey} className="mb-6">
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-neutral-400"
                >
                  {t(section.titleKey)}
                </motion.p>
              )}
            </AnimatePresence>

            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedSections.has(item.href);

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleSection(item.href)}
                      className={`
                        group relative mx-2 mb-0.5 flex w-[calc(100%-16px)] items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition-all duration-150 text-left
                        ${isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                        }
                      `}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500"
                          transition={tokens.motion.easing.spring}
                        />
                      )}
                      <span className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'}`}>
                        {item.icon}
                      </span>
                      <AnimatePresence mode="wait">
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1"
                          >
                            {t(item.labelKey)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {!collapsed && (
                        <motion.svg
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
                          className="text-neutral-400"
                        >
                          <path d="M3 5l3 3 3-3"/>
                        </motion.svg>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={handleMobileNavigate}
                      className={`
                        group relative mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5
                        text-sm font-medium transition-all duration-150
                        ${isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                        }
                      `}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      {isActive && !hasChildren && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500"
                          transition={tokens.motion.easing.spring}
                        />
                      )}
                      <span className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600'}`}>
                        {item.icon}
                      </span>
                      <AnimatePresence mode="wait">
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                          >
                            {t(item.labelKey)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {item.badge && !collapsed && (
                        <span className="ml-auto rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-bold text-danger-700">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}

                  {/* Expandable children */}
                  {hasChildren && !collapsed && (
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {item.children!.map((child) => {
                            const childActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={handleMobileNavigate}
                                className={`
                                  mx-2 mb-0.5 flex items-center gap-2 rounded-lg py-2 pl-10 pr-3
                                  text-[13px] transition-all duration-150
                                  ${childActive
                                    ? 'bg-primary-50 font-medium text-primary-700'
                                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                                  }
                                `}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${childActive ? 'bg-primary-500' : 'bg-neutral-300'}`} />
                                {t(child.labelKey)}
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Tenant indicator */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary-500 flex items-center justify-center">
            <span className="text-xs font-bold text-white">E</span>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="truncate text-sm font-semibold text-neutral-900">Suple</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG Icons (16x16)
// ---------------------------------------------------------------------------

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" /><rect x="10.5" y="2" width="5.5" height="5.5" rx="1" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" /><rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="5.5" r="2.5" /><path d="M2 15.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
      <circle cx="13" cy="6" r="2" /><path d="M13.5 11c1.8.3 3 1.7 3 3.5" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="12" height="14" rx="1.5" /><path d="M7 6h5M7 9h5M7 12h3" /><path d="M3 2h2v14H3" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="10" height="8" rx="1" /><path d="M11 7h3l2.5 3V12h-5.5V7z" /><circle cx="5" cy="14" r="1.5" /><circle cx="14" cy="14" r="1.5" />
    </svg>
  );
}

function WorkflowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="7" width="4" height="4" rx="0.5" /><rect x="7" y="2" width="4" height="4" rx="0.5" />
      <rect x="7" y="12" width="4" height="4" rx="0.5" /><rect x="13" y="7" width="4" height="4" rx="0.5" />
      <path d="M5 9h2M11 4h2.5a.5.5 0 0 1 .5.5V7M11 14h2.5a.5.5 0 0 0 .5-.5V11" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="2.5" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.4 3.4l1.4 1.4M13.2 13.2l1.4 1.4M3.4 14.6l1.4-1.4M13.2 4.8l1.4-1.4" />
    </svg>
  );
}

function SiiIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2"/>
      <path d="M6 7h6M6 10h6M6 13h3"/>
      <path d="M2 5h3v8H2"/>
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v4h2.5L13 15V3L5.5 7H3z"/>
      <path d="M15.5 6.5a3 3 0 0 1 0 5"/>
    </svg>
  );
}
