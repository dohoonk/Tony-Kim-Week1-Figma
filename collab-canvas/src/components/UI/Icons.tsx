type IconProps = { size?: number; color?: string };

function Svg({ children, size = 18, color = 'currentColor' }: { children: React.ReactNode; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', color }}
    >
      {children}
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14l-4-4 4-4" />
      <path d="M20 20H10a8 8 0 0 1 0-16h1" />
    </Svg>
  );
}

export function RedoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 14l4-4-4-4" />
      <path d="M4 20h10a8 8 0 0 0 0-16h-1" />
    </Svg>
  );
}

export function SquareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" />
    </Svg>
  );
}

export function CircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
    </Svg>
  );
}

export function TriangleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5l7 12H5z" />
    </Svg>
  );
}

export function TypeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6h16v2H13v10h-2V8H4z" />
    </Svg>
  );
}

export function AlignCenterIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18" />
      <path d="M3 12h18" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M9 8l-4 4 4 4" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M15 8l4 4-4 4" />
    </Svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M8 9l4-4 4 4" />
    </Svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M8 15l4 4 4-4" />
    </Svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </Svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h12" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 21h14" />
    </Svg>
  );
}


