interface NetworkIconProps {
  network: string;
  size?: number;
}

export function NetworkIcon({ network, size = 24 }: NetworkIconProps) {
  if (network === "linkedin") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" rx="4" fill="#0A66C2" />
        <path
          d="M7.5 9.5H5V18H7.5V9.5ZM6.25 8.5C7.08 8.5 7.75 7.83 7.75 7C7.75 6.17 7.08 5.5 6.25 5.5C5.42 5.5 4.75 6.17 4.75 7C4.75 7.83 5.42 8.5 6.25 8.5Z"
          fill="white"
        />
        <path
          d="M19 18H16.5V13.75C16.5 12.79 16.48 11.56 15.17 11.56C13.84 11.56 13.63 12.6 13.63 13.68V18H11.13V9.5H13.52V10.6H13.55C13.89 9.97 14.7 9.31 15.92 9.31C18.45 9.31 19 10.98 19 13.14V18Z"
          fill="white"
        />
      </svg>
    );
  }

  if (network === "x") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" rx="4" fill="#000000" />
        <path
          d="M13.42 10.88L18.18 5.5H17.04L12.9 10.15L9.58 5.5H5.5L10.5 12.77L5.5 18.5H6.64L11.02 13.6L14.52 18.5H18.6L13.42 10.88ZM11.6 12.9L11.08 12.18L7.06 6.35H9.03L12.06 10.84L12.58 11.56L16.78 17.67H14.81L11.6 12.9Z"
          fill="white"
        />
      </svg>
    );
  }

  if (network === "instagram") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFDC80" />
            <stop offset="25%" stopColor="#FCAF45" />
            <stop offset="50%" stopColor="#F77737" />
            <stop offset="75%" stopColor="#C13584" />
            <stop offset="100%" stopColor="#833AB4" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="5" fill="url(#ig-grad)" />
        <rect
          x="7"
          y="7"
          width="10"
          height="10"
          rx="3"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <circle
          cx="12"
          cy="12"
          r="2.5"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="16" cy="8" r="0.8" fill="white" />
      </svg>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground"
    >
      {network[0]?.toUpperCase()}
    </div>
  );
}
