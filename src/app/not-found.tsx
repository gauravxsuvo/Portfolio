import { BracketLink } from "@/components/ui/bracket-button";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-error text-glow text-sm">
        [ERR] 404: PATH NOT FOUND
      </p>
      <pre className="text-fg/60 text-xs sm:text-sm overflow-x-auto">
{`guest@gaurav:~$ cd ${"<requested-path>"}
bash: cd: no such file or directory`}
      </pre>
      <p className="text-fg/70 text-sm">
        The route you asked for doesn&apos;t exist on this system.
      </p>
      <p className="text-fg/40 text-xs">
        tip: there&apos;s a shell on the homepage — type{" "}
        <span className="text-secondary">help</span> once you&apos;re there.
      </p>
      <div className="mt-2">
        <BracketLink href="/">cd ~</BracketLink>
      </div>
    </div>
  );
}
