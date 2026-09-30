type P = { size?: number };

const svg = (size: number, d: React.ReactNode, vb = '0 0 24 24') => (
  <svg viewBox={vb} width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

export const IconDrop = ({ size = 22 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d="M12 2.5c-3.6 4.6-6.5 8.4-6.5 11.8a6.5 6.5 0 0 0 13 0C18.5 10.9 15.6 7.1 12 2.5z" fill="currentColor" /></svg>
);
export const IconPin = ({ size = 20 }: P) => svg(size, <><path d="M12 21s-7-7.6-7-12a7 7 0 0 1 14 0c0 4.4-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></>);
export const IconTarget = ({ size = 20 }: P) => svg(size, <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>);
export const IconHome = ({ size = 20 }: P) => svg(size, <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>);
export const IconShield = ({ size = 20 }: P) => svg(size, <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>);
export const IconEye = ({ size = 20 }: P) => svg(size, <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>);
export const IconBox = ({ size = 20 }: P) => svg(size, <><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>);
export const IconAlert = ({ size = 20 }: P) => svg(size, <><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18v.5" /></>);
export const IconBottle = ({ size = 20 }: P) => svg(size, <><path d="M10 2h4v3l2 3v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8l2-3z" /><path d="M8 12h8" /></>);
export const IconPill = ({ size = 20 }: P) => svg(size, <><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-35 12 12)" /><path d="M9.5 8.5l5 7" /></>);
export const IconTorch = ({ size = 20 }: P) => svg(size, <><path d="M8 3h8l-1 6H9z" /><path d="M9 9h6v12H9z" /><path d="M12 13v3" /></>);
export const IconBattery = ({ size = 20 }: P) => svg(size, <><rect x="3" y="7" width="16" height="10" rx="2" /><path d="M21 11v2" /><path d="M11 9l-2 3h4l-2 3" /></>);
export const IconDoc = ({ size = 20 }: P) => svg(size, <><path d="M6 2h9l4 4v16H6z" /><path d="M14 2v5h5" /><path d="M9 13h6M9 17h6" /></>);
export const IconFood = ({ size = 20 }: P) => svg(size, <><rect x="5" y="8" width="14" height="13" rx="2" /><path d="M5 12h14" /><path d="M8 8V5a4 4 0 0 1 8 0v3" /></>);
export const IconCar = ({ size = 20 }: P) => svg(size, <><path d="M3 16v-4l2-5h14l2 5v4" /><path d="M3 16h18v3H3z" /><circle cx="7" cy="16" r="1.5" /><circle cx="17" cy="16" r="1.5" /></>);
export const IconBolt = ({ size = 20 }: P) => svg(size, <><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>);
export const IconRadio = ({ size = 20 }: P) => svg(size, <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 8l10-5" /><circle cx="15" cy="14" r="3" /><path d="M6 12h4M6 16h4" /></>);
export const IconPhone = ({ size = 20 }: P) => svg(size, <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>);
