import { Link, useLocation } from 'react-router';
import {
  AlarmClock,
  BarChart3,
  Bot,
  Calendar,
  ClipboardCheck,
  FileText,
  Globe,
  MessageSquare,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { ROUTES } from '@/shared/constants/routes';

interface OperatorInfo {
  nickname: string;
  email: string;
}
interface SidebarProps {
  admin: OperatorInfo | null;
}

interface MenuItem {
  label: string;
  to: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}
interface NavSection {
  heading?: string;
  items: MenuItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: '대시보드', to: ROUTES.DASHBOARD, icon: BarChart3, isActive: (p) => p === '/' },
      { label: 'Ravvit', to: ROUTES.RAVVIT, icon: Bot, isActive: (p) => p.startsWith('/ravvit') },
    ],
  },
  {
    heading: '서비스 관리',
    items: [
      {
        label: '컨텐츠 관리',
        to: ROUTES.CHAPTERS,
        icon: FileText,
        isActive: (p) => /^\/(chapters|units|lessons|problems)/.test(p),
      },
      {
        label: '스테이징',
        to: ROUTES.STAGING_LABELS,
        icon: Globe,
        isActive: (p) => p.startsWith('/staging'),
      },
    ],
  },
  {
    heading: '운영',
    items: [
      { label: '유저 관리', to: ROUTES.USERS, icon: User, isActive: (p) => p.startsWith('/users') },
      {
        label: '신고 관리',
        to: ROUTES.REPORTS,
        icon: AlarmClock,
        isActive: (p) => p.startsWith('/reports'),
      },
      {
        label: '문의 관리',
        to: ROUTES.INQUIRIES,
        icon: MessageSquare,
        isActive: (p) => p.startsWith('/inquiries'),
      },
      {
        label: '공지 관리',
        to: ROUTES.NOTICES,
        icon: Calendar,
        isActive: (p) => p.startsWith('/notices'),
      },

      {
        label: 'QA',
        to: ROUTES.QA_SPRINTS,
        icon: ClipboardCheck,
        isActive: (p) => p.startsWith('/qa'),
      },
    ],
  },
];

export function Sidebar({ admin }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-0 flex h-screen w-sidebar flex-col border-r border-border bg-surface">
      <div className="flex h-header items-center px-4">
        <span className="text-h3 font-semibold text-foreground">Gravit Admin</span>
      </div>

      <nav className="flex flex-1 flex-col py-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.heading ?? `section-${si}`} className="flex flex-col">
            {section.heading && (
              <p className="px-4 pb-1 pt-4 text-caption font-medium text-fg-secondary">
                {section.heading}
              </p>
            )}
            {section.items.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex w-full items-center gap-2.5 border-r-2 px-4 py-2.5 text-body',
                    active
                      ? 'border-primary bg-primary-subtle font-medium text-primary'
                      : 'border-transparent text-fg-secondary hover:bg-primary-faint',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-border p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hover text-body font-medium text-fg-secondary">
          {admin?.nickname ? (
            admin.nickname.trim().charAt(0)
          ) : (
            <User className="h-5 w-5 text-fg-muted" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-body text-foreground">{admin?.nickname ?? '운영자'}</p>
          {admin?.email && <p className="truncate text-caption text-fg-muted">{admin.email}</p>}
        </div>
      </div>
    </aside>
  );
}
