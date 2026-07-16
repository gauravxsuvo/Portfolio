import { bio, education, experience, projects, publications, skillGroups } from "@/lib/data";
import { siteUrl } from "@/lib/site";

/**
 * llms.txt — the emerging convention for handing an LLM a clean, structured
 * summary of a site instead of making it scrape a JS-heavy page. Cheap to serve
 * and it means anything asking "who is this person" gets the accurate version.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# ${bio.name}

> ${bio.role}

${bio.summary}

- Location: ${bio.location}
- Email: ${bio.email}
- GitHub: ${bio.github}
- LinkedIn: ${bio.linkedin}
- ORCID: ${bio.orcid}
- Site: ${siteUrl}

## Focus

${bio.focus.map((f) => `- ${f}`).join("\n")}

## Education

- ${education.degree}, ${education.school} (${education.period}), ${education.location}

## Projects

${projects
  .map(
    (p) => `### ${p.name} (${p.year})

${p.tagline}

- Status: ${p.status}
- Stack: ${p.stack.join(", ")}
${p.repoUrl ? `- Repo: ${p.repoUrl}\n` : ""}${p.liveUrl ? `- Live: ${p.liveUrl}\n` : ""}- Page: ${siteUrl}/projects/${p.slug}

${p.description}`
  )
  .join("\n\n")}

## Publications

${publications
  .map(
    (p) => `### ${p.title}

- Authors: ${p.authors.join(", ")}
- Venue: ${p.venue} (${p.year}), ${p.type}, ${p.status}
${p.links?.doi ? `- DOI: ${p.links.doi}\n` : ""}${p.links?.code ? `- Code: ${p.links.code}\n` : ""}
${p.abstract}`
  )
  .join("\n\n")}

## Experience

${experience
  .map(
    (e) => `### ${e.role}, ${e.org} (${e.period})

${e.summary}

${e.highlights.map((h) => `- ${h}`).join("\n")}`
  )
  .join("\n\n")}

## Skills

${skillGroups.map((g) => `- **${g.category}**: ${g.items.join(", ")}`).join("\n")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
