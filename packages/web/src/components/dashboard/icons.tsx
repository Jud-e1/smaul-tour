import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export type Icon = (props: IconProps) => JSX.Element;

export const IconCalendar: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const IconCompass: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </svg>
);

export const IconHeart: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.3-9.3-8.4C1.2 9 2.3 5.8 5.3 5.1 7.2 4.6 9 5.5 12 8c3-2.5 4.8-3.4 6.7-2.9 3 .7 4.1 3.9 2.6 6.5C19 15.7 12 20 12 20z" />
  </svg>
);

export const IconUser: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20a7.5 7.5 0 0115 0" />
  </svg>
);

export const IconBell: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" />
    <path d="M10 20a2 2 0 004 0" />
  </svg>
);

export const IconHome: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M3.5 11L12 4l8.5 7" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const IconLogout: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4" />
    <path d="M9 16l-4-4 4-4M5 12h11" />
  </svg>
);

export const IconSparkles: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.6L18.5 9.4 13.8 11.2 12 16l-1.8-4.8L5.5 9.4l4.7-1.8z" />
    <path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
  </svg>
);

export const IconWallet: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M3 7.5A2.5 2.5 0 015.5 5H18a2 2 0 012 2v1" />
    <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
    <circle cx="16.5" cy="13.5" r="1.4" />
  </svg>
);

export const IconStar: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 4l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 15.9 7.4 18.3l.9-5.1L4.5 9.5l5.2-.8z" />
  </svg>
);

export const IconPlus: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChart: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M4 20V4M20 20H4" />
    <path d="M8 16v-3M12 16V8M16 16v-5" />
  </svg>
);

export const IconClock: Icon = (p) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconCheck: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const IconClipboard: Icon = (p) => (
  <svg {...base(p)}>
    <rect x="6" y="4.5" width="12" height="16" rx="2" />
    <path d="M9 4.5a3 3 0 016 0" />
    <path d="M9 11h6M9 15h4" />
  </svg>
);

export const IconTicket: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2 2 2 0 000 4 2 2 0 000 4 2 2 0 01-2 2H6a2 2 0 01-2-2 2 2 0 000-4 2 2 0 000-4z" />
    <path d="M14 6v12" />
  </svg>
);

export const IconPlane: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M10.5 13.5L3 11l1-2 8 1 4.5-4.6c.9-.9 2.4-.9 3 .1.5.8.2 1.7-.5 2.4L14 12.5l1 8-2 1-2.5-8z" />
  </svg>
);

export const IconMenu: Icon = (p) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
