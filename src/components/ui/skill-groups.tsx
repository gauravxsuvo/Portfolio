import type { SkillGroup } from "@/lib/data";

export function SkillGroups({ groups }: { groups: SkillGroup[] }) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.category}>
          <p className="mb-2 text-xs uppercase tracking-wide text-fg/40">{group.category}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <span
                key={item}
                className="border border-border px-2 py-0.5 text-xs text-secondary"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
