import logoUrl from "../assets/logo-tabdock.png";

type ValknutLogoProps = {
  size?: number;
};

export function ValknutLogo({ size = 26 }: ValknutLogoProps) {
  return (
    <img
      className="brand-logo"
      src={logoUrl}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}
