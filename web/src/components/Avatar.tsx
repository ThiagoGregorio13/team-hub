import { displayName, type MemberCount } from "../api";
import { memberColor } from "../theme";

type AvatarProps = {
  name: string;
  members: MemberCount[];
  size?: "sm" | "md" | "lg";
};

// A cor vem da posição do membro na lista, então a mesma pessoa tem a mesma cor em toda a tela
export function Avatar({ name, members, size = "md" }: AvatarProps) {
  const color = memberColor(Math.max(members.findIndex((m) => m.name === name), 0));
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: color.bg, color: color.fg }}
      title={displayName(name)}
      aria-hidden="true"
    >
      {name[0]}
    </span>
  );
}
