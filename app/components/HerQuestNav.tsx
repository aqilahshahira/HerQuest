import Link from 'next/link';

type NavItem = {
  href: string;
  label: string;
  key: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Quest Directory', key: 'marketplace', icon: '💼' },
  { href: '/chathub', label: 'Applicant Inbox', key: 'chathub', icon: '💬' },
  { href: '/calculator', label: 'Income Planner', key: 'calculator', icon: '🧮' },
  { href: '/community', label: 'Safety Hub', key: 'community', icon: '🛡️' },
  { href: '/blueprint', label: 'Content & Legal', key: 'blueprint', icon: '📖' },
];

type HerQuestNavProps = {
  active?: string;
};

export default function HerQuestNav({ active = 'marketplace' }: HerQuestNavProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand" aria-label="HerQuest home">
          <span className="brand-mark">✦</span>
          <span>
            <strong>HerQuest</strong>
            <small>MY 🇲🇾</small>
          </span>
        </Link>

        <nav className="topnav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={active === item.key ? 'nav-link active' : 'nav-link'}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
