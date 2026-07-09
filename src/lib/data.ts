export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  status: "ok" | "wip" | "err" | "live";
  repoUrl?: string;
  liveUrl?: string;
  year: string;
};

export const projects: Project[] = [
  {
    slug: "packet-sniffer-dashboard",
    name: "packet-sniffer-dashboard",
    tagline: "Real-time network traffic visualizer",
    description:
      "A live dashboard that captures and classifies local network packets, rendering protocol breakdowns and traffic spikes as terminal-style bar charts. Built to make packet inspection approachable without a full Wireshark session.",
    stack: ["Python", "Scapy", "WebSockets", "React"],
    status: "live",
    repoUrl: "https://github.com/",
    liveUrl: "https://example.com/",
    year: "2026",
  },
  {
    slug: "cli-task-runner",
    name: "cli-task-runner",
    tagline: "Zero-config task orchestrator for monorepos",
    description:
      "A dependency-aware task runner that reads a single manifest file and parallelizes builds across workspace packages, with cached outputs and a live status TUI.",
    stack: ["Go", "Cobra", "Bubble Tea"],
    status: "ok",
    repoUrl: "https://github.com/",
    year: "2025",
  },
  {
    slug: "shell-first-notes",
    name: "shell-first-notes",
    tagline: "Markdown notes app you drive entirely from the keyboard",
    description:
      "A note-taking tool with vim-style modal navigation, full-text search over a local SQLite index, and a command palette modeled after shell command syntax.",
    stack: ["TypeScript", "Electron", "SQLite"],
    status: "wip",
    repoUrl: "https://github.com/",
    year: "2025",
  },
  {
    slug: "uptime-pager",
    name: "uptime-pager",
    tagline: "Self-hosted status page and on-call pager",
    description:
      "Polls a list of endpoints on a schedule, tracks uptime history, and pages the on-call engineer over SMS/email when a service falls over. Includes a public status page.",
    stack: ["Node.js", "Postgres", "Twilio"],
    status: "ok",
    repoUrl: "https://github.com/",
    liveUrl: "https://example.com/",
    year: "2024",
  },
  {
    slug: "old-portfolio-v1",
    name: "old-portfolio-v1",
    tagline: "First portfolio attempt — retired",
    description:
      "The original version of this site, built as a static single-pager. Kept around for the archive, superseded by the terminal rebuild you're looking at now.",
    stack: ["HTML", "CSS", "jQuery"],
    status: "err",
    repoUrl: "https://github.com/",
    year: "2022",
  },
];

export type Skill = { label: string; value: number };

export const skills: Skill[] = [
  { label: "TypeScript / JavaScript", value: 92 },
  { label: "React / Next.js", value: 88 },
  { label: "Python", value: 80 },
  { label: "Go", value: 65 },
  { label: "SQL / Databases", value: 78 },
  { label: "Systems & Networking", value: 60 },
];

export type ExperienceEntry = {
  role: string;
  org: string;
  period: string;
  location: string;
  summary: string;
  highlights: string[];
};

export const experience: ExperienceEntry[] = [
  {
    role: "Software Engineer",
    org: "Acme Systems",
    period: "2024 — PRESENT",
    location: "Remote",
    summary:
      "Own the internal tooling platform used by ~40 engineers; own reliability of the deployment pipeline.",
    highlights: [
      "Cut average deploy time from 14m to 4m by parallelizing the build graph",
      "Designed the internal CLI now used for all service scaffolding",
      "On-call rotation for platform incidents, average MTTR under 20m",
    ],
  },
  {
    role: "Backend Engineer Intern",
    org: "Nimbus Data",
    period: "2023 — 2024",
    location: "Bengaluru, IN",
    summary:
      "Built ingestion services for a real-time analytics pipeline processing ~2M events/day.",
    highlights: [
      "Rewrote the ingestion queue consumer, cutting p99 latency by 35%",
      "Added structured logging and traces across 6 services",
    ],
  },
  {
    role: "B.Tech, Computer Science",
    org: "University",
    period: "2020 — 2024",
    location: "India",
    summary: "Coursework focused on systems, networks, and distributed computing.",
    highlights: [
      "Teaching assistant for Operating Systems, two semesters",
      "Capstone project: a distributed key-value store with Raft consensus",
    ],
  },
];

export const bio = {
  name: "Gaurav Raj Singh",
  handle: "gaurav",
  role: "Software Developer",
  location: "India",
  summary:
    "I build backend systems and developer tooling — things that are supposed to be invisible when they work. Comfortable across the stack, most at home closer to the metal.",
  focus: ["distributed systems", "developer tooling", "networking", "web performance"],
};
