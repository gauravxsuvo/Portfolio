"use client";

import { usePathname } from "next/navigation";
import { BracketLink } from "@/components/ui/bracket-button";

const KNOWN_ROUTES: { path: string; label: string }[] = [
  { path: "/about", label: "~/about" },
  { path: "/projects", label: "~/projects" },
  { path: "/experience", label: "~/experience" },
  { path: "/publications", label: "~/publications" },
  { path: "/contact", label: "~/contact" },
];

function closestRoute(path: string) {
  const segment = path.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
  if (!segment) return null;
  return (
    KNOWN_ROUTES.find((r) => r.path.slice(1).startsWith(segment) || segment.startsWith(r.path.slice(1))) ??
    null
  );
}

export function NotFoundHint() {
  const pathname = usePathname();
  const suggestion = closestRoute(pathname);

  return (
    <>
      <pre className="text-fg/60 text-xs sm:text-sm overflow-x-auto">
        {`guest@gaurav:~$ cd ${pathname}
bash: cd: no such file or directory`}
      </pre>
      {suggestion && (
        <p className="text-sm text-fg/70">
          did you mean{" "}
          <BracketLink href={suggestion.path} variant="ghost" className="inline-flex">
            {suggestion.label}
          </BracketLink>
          ?
        </p>
      )}
    </>
  );
}
