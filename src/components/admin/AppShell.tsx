import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileSearch,
  Flag,
  ShoppingBag,
  Settings,
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  Command,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import { adminApi, clearToken } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type NavGroup = {
  labelKey: keyof import('@/i18n/en').Messages;
  items: {
    to: string;
    labelKey: string;
    icon: typeof LayoutDashboard;
    count?: number;
    tone?: 'warning' | 'danger' | 'info';
  }[];
};

function SidebarContent({
  onNavigate,
  counts,
}: {
  onNavigate?: () => void;
  counts: { pendingReview: number; pendingVerification: number; reports: number; disputes: number };
}) {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const navGroups: NavGroup[] = [
    {
      labelKey: 'navOverview',
      items: [{ to: '/', labelKey: 'dashboard', icon: LayoutDashboard }],
    },
    {
      labelKey: 'navTrustSafety',
      items: [
        {
          to: '/verifications',
          labelKey: 'verifications',
          icon: ShieldCheck,
          count: counts.pendingVerification || undefined,
          tone: 'warning',
        },
        {
          to: '/content',
          labelKey: 'contentReview',
          icon: FileSearch,
          count: counts.pendingReview || undefined,
        },
        { to: '/reports', labelKey: 'reports', icon: Flag, count: counts.reports || undefined, tone: 'danger' },
      ],
    },
    {
      labelKey: 'navOperations',
      items: [
        { to: '/users', labelKey: 'users', icon: Users },
        {
          to: '/orders',
          labelKey: 'orders',
          icon: ShoppingBag,
          count: counts.disputes || undefined,
          tone: 'info',
        },
      ],
    },
    {
      labelKey: 'navPlatform',
      items: [{ to: '/config', labelKey: 'config', icon: Settings }],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-[11px] font-bold tracking-tight text-white ring-1 ring-white/15">
          HM
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">HeyMarket</p>
        </div>
        <Badge
          variant="outline"
          className="border-white/15 bg-white/5 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/70"
        >
          {t('envProd')}
        </Badge>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.labelKey} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
              {t(group.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.to === '/'
                    ? pathname === '/'
                    : pathname === item.to || pathname.startsWith(`${item.to}/`);
                const Icon = item.icon;
                const toneClass =
                  item.tone === 'danger'
                    ? 'bg-destructive/90 text-white'
                    : item.tone === 'warning'
                      ? 'bg-warning/90 text-warning-foreground'
                      : item.tone === 'info'
                        ? 'bg-info/80 text-info-foreground'
                        : 'bg-white/10 text-sidebar-foreground/80';
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-sidebar-foreground/75 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      {active ? (
                        <span
                          className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-white"
                          aria-hidden
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-white' : 'text-sidebar-foreground/60',
                        )}
                      />
                      <span className="flex-1 truncate">{t(item.labelKey as never)}</span>
                      {item.count ? (
                        <span
                          className={cn(
                            'inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums',
                            toneClass,
                          )}
                        >
                          {item.count}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({
    pendingReview: 0,
    pendingVerification: 0,
    reports: 0,
    disputes: 0,
  });

  useEffect(() => {
    adminApi
      .stats()
      .then((s) =>
        setCounts({
          pendingReview: s.pendingReviewCount,
          pendingVerification: s.pendingVerificationCount,
          reports: s.reportCount,
          disputes: s.disputeOrderCount,
        }),
      )
      .catch(() => undefined);
  }, [title]);

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent counts={counts} />
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <SidebarContent counts={counts} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={t('openNav')}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden min-w-0 items-baseline gap-2 md:flex">
            <h1 className="truncate text-[13px] font-semibold text-foreground">{title}</h1>
            {description ? (
              <span className="truncate text-xs text-muted-foreground">· {description}</span>
            ) : null}
          </div>

          <div className="relative ml-auto hidden w-full max-w-sm items-center md:flex">
            <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              className="h-8 pl-8 pr-14 text-sm"
              aria-label={t('searchPlaceholder')}
            />
            <kbd className="pointer-events-none absolute right-2 inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>

          <Button variant="ghost" size="icon" aria-label={t('notifications')} className="relative ml-auto h-8 w-8 md:ml-0">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-background" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 gap-2 px-1.5">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary ring-1 ring-primary/15">
                  AD
                </span>
                <span className="hidden text-xs font-medium sm:inline">{t('adminLabel')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('account')}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocale(locale === 'en' ? 'zh' : 'en')}>
                {t('language')}: {locale === 'en' ? t('langChinese') : t('langEnglish')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="border-b border-border bg-background px-4 py-2.5 md:hidden">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed right-4 top-4 z-[60] grid h-9 w-9 place-items-center rounded-full bg-background text-foreground shadow-lg lg:hidden"
          aria-label={t('closeNav')}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
