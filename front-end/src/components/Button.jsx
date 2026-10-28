const VARIANT_CLASSES = {
  primary:
    "border-2 border-sky-950 bg-sky-800 text-white hover:bg-sky-900 active:bg-sky-950",
  secondary:
    "border-4 border-slate-700 bg-white text-slate-950 hover:bg-slate-100 active:bg-slate-200",
  success:
    "border-2 border-green-950 bg-green-800 text-white hover:bg-green-900 active:bg-green-950",
  danger:
    "border-2 border-red-950 bg-red-800 text-white hover:bg-red-900 active:bg-red-950",
};

const SIZE_CLASSES = {
  md: "px-5 py-3",
  lg: "px-7 py-4",
};

/**
 * Accessible, high-contrast button.
 *
 * @param {{
 *   children: import("react").ReactNode,
 *   onClick?: import("react").MouseEventHandler<HTMLButtonElement>,
 *   variant?: "primary" | "secondary" | "success" | "danger",
 *   size?: "md" | "lg",
 *   disabled?: boolean,
 *   type?: "button" | "submit" | "reset",
 *   className?: string,
 *   [key: string]: any
 * }} props Button content and native button props.
 * @returns {import("react").JSX.Element} A native button element.
 */
export default function Button({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  disabled = false,
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-16 min-w-16 items-center justify-center rounded-xl text-xl font-semibold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </button>
  );
}