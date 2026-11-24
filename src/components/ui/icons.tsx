import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(paths: string[], opts: { fill?: boolean } = {}) {
  function Icon({ size = 20, className, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={opts.fill ? "currentColor" : "none"}
        stroke={opts.fill ? "none" : "currentColor"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
  return Icon;
}

export const CheckIcon = make(["M5 12.5l4.5 4.5L19 7.5"]);
export const CheckCircleIcon = make(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M8 12.5l2.8 2.8L16 9.8"]);
export const ShieldCheckIcon = make(["M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6l7-3z", "M8.8 12l2.2 2.2 4.2-4.4"]);
export const BuildingIcon = make(["M4 21V5a1 1 0 011-1h8a1 1 0 011 1v16", "M14 10h5a1 1 0 011 1v10", "M2 21h20", "M8 8h2M8 12h2M8 16h2", "M16.5 14h.01M16.5 17.5h.01"]);
export const IdCardIcon = make(["M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5v-11z", "M8.5 12a2 2 0 100-4 2 2 0 000 4z", "M5.5 16c.5-1.5 1.7-2.2 3-2.2s2.5.7 3 2.2", "M14.5 9.5H18M14.5 13H18"]);
export const StarIcon = make(["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.8 6.8 19.7l1-5.9L3.5 9.7l5.9-.8L12 3.5z"], { fill: true });
export const MapPinIcon = make(["M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z", "M12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z"]);
export const ClockIcon = make(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v5l3 2"]);
export const CalendarIcon = make(["M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7z", "M4 10h16M8 3v4M16 3v4"]);
export const BellIcon = make(["M6 16.5V11a6 6 0 1112 0v5.5l1.5 2h-15l1.5-2z", "M10 21h4"]);
export const HomeIcon = make(["M4 11l8-7 8 7", "M6 10v10h12V10", "M10 20v-5h4v5"]);
export const PlusIcon = make(["M12 5v14M5 12h14"]);
export const UserIcon = make(["M12 12a4 4 0 100-8 4 4 0 000 8z", "M4.5 20c.8-3.4 3.7-5.5 7.5-5.5s6.7 2.1 7.5 5.5"]);
export const UsersIcon = make(["M9 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7z", "M2.5 19.5c.7-3 3.2-4.8 6.5-4.8s5.8 1.8 6.5 4.8", "M16 5.3a3.5 3.5 0 010 6.4M18 14.9c1.7.6 2.9 2 3.5 4.6"]);
export const DollarIcon = make(["M12 3v18", "M16.5 7.5C16 6 14.3 5 12 5c-2.5 0-4 1.2-4 3 0 4.2 8.5 2 8.5 6.3 0 1.8-1.7 3-4.5 3-2.5 0-4.3-1-4.7-2.8"]);
export const PercentIcon = make(["M18 6L6 18", "M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M16.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"]);
export const SwapIcon = make(["M4 8h14l-3.5-3.5", "M20 16H6l3.5 3.5"]);
export const LinkIcon = make(["M9.5 14.5l5-5", "M11 6.5l1-1a3.5 3.5 0 015 5l-1 1", "M13 17.5l-1 1a3.5 3.5 0 01-5-5l1-1"]);
export const KeyIcon = make(["M14.5 11a4.5 4.5 0 10-3.4-1.6L3.5 17v3.5H7V19h1.5v-1.5H10l2.1-2.1", "M16.5 7.5h.01"]);
export const LockIcon = make(["M6 11h12a1 1 0 011 1v7a1 1 0 01-1 1H6a1 1 0 01-1-1v-7a1 1 0 011-1z", "M8 11V8a4 4 0 118 0v3"]);
export const AlertIcon = make(["M12 4l9 16H3L12 4z", "M12 10v4.2M12 17h.01"]);
export const XIcon = make(["M6 6l12 12M18 6L6 18"]);
export const ChevronRightIcon = make(["M9 5l7 7-7 7"]);
export const ChevronLeftIcon = make(["M15 5l-7 7 7 7"]);
export const ChevronDownIcon = make(["M5 9l7 7 7-7"]);
export const LogoutIcon = make(["M10 4H6a1 1 0 00-1 1v14a1 1 0 001 1h4", "M15 8l4 4-4 4M19 12H9"]);
export const SendIcon = make(["M21 3L10 14", "M21 3l-7 18-4-7-7-4 18-7z"]);
export const CameraIcon = make(["M4 8a1 1 0 011-1h2.5L9 5h6l1.5 2H19a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V8z", "M12 16a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"]);
export const PhoneIcon = make(["M5 4h4l1.5 4-2 1.3a11 11 0 005.2 5.2L15.2 12.5 19 14v4a2 2 0 01-2 2A13 13 0 013 6a2 2 0 012-2z"]);
export const MailIcon = make(["M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z", "M3.5 7.5L12 13l8.5-5.5"]);
export const FlagIcon = make(["M5 21V4", "M5 4h11l-1.5 4L16 12H5"]);
export const BoltIcon = make(["M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"]);
export const BedIcon = make(["M3 18V7", "M3 14h18v4", "M21 14v-2a3 3 0 00-3-3h-7v5", "M7 12.2a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4z"]);
export const BathIcon = make(["M4 12h16v2a4 4 0 01-4 4H8a4 4 0 01-4-4v-2z", "M6 12V6a2 2 0 013.7-1", "M7 20l-1 1.5M17 20l1 1.5"]);
export const SearchIcon = make(["M11 18a7 7 0 100-14 7 7 0 000 14z", "M20 20l-4-4"]);
export const BriefcaseIcon = make(["M4 8h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z", "M9 8V6a1 1 0 011-1h4a1 1 0 011 1v2", "M3 13h18"]);
export const InfoIcon = make(["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 11v5M12 8h.01"]);
export const ClipboardIcon = make(["M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z", "M8 6H6a1 1 0 00-1 1v13a1 1 0 001 1h12a1 1 0 001-1V7a1 1 0 00-1-1h-2", "M9 13l2 2 4-4"]);
export const MessageIcon = make(["M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V6a1 1 0 011-1z"]);
export const SlidersIcon = make(["M4 7h10M18 7h2M4 17h2M10 17h10", "M16 7a2 2 0 100-.01", "M8 17a2 2 0 100-.01"]);
export const SparkleIcon = make(["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"]);
export const CarIcon = make(["M5 16V11l1.7-4.3A1.5 1.5 0 018.1 5.8h7.8a1.5 1.5 0 011.4.9L19 11v5", "M3.5 16h17v2.5h-3V16M6.5 18.5V16", "M7.5 13h.01M16.5 13h.01"]);
