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
    slug: "deepdarcy",
    name: "DeepDarcy",
    tagline: "Physics-informed neural network for groundwater inference",
    description:
      "A physics-informed neural network that solves the groundwater diffusion PDE by automatic differentiation and inverts it to recover unreported well pumping rates from sparse sensor data. Validated the forward solver to 0.91% relative L2 error against the analytical Theis solution, and recovered spatially varying depletion rates at 5.15% error on synthetic benchmarks. Held-out spatial validation on unseen Ogallala aquifer wells exposed overfitting; the published model card reports the true 38.3% holdout error and the model's intended-use limits honestly rather than only the best-case numbers. Served behind a FastAPI inference API with a Next.js and Leaflet frontend, containerized with Docker Compose.",
    stack: ["Python", "PyTorch", "FastAPI", "Next.js", "Docker"],
    status: "ok",
    repoUrl: "https://github.com/gauravxsuvo/DeepDarcy",
    year: "2026",
  },
  {
    slug: "notschool",
    name: "notschool",
    tagline: "Multi-agent learning-plan generator. Team lead, 4 engineers.",
    description:
      "Led a four-person team to 37th in Asia-Pacific at the Google Cloud GenAI Academy Hackathon, a submission tier restricted to developers who cleared every codelab in a 192,660-developer program. Built the entire backend and agent layer in 3 days: a LangGraph orchestrator running four Gemini-backed agents for curriculum design, resource retrieval, calendar scheduling, and persistence. Shipped 21 FastAPI endpoints covering Google OAuth 2.0, HMAC-signed guest sessions, multimodal syllabus ingestion, quizzes, and a chat-history-aware tutor. Wired the YouTube Data API and Google Calendar in as Model Context Protocol tools, turning one image or text goal into a scheduled 7-day plan; ran it with 25+ early users.",
    stack: ["LangGraph", "Gemini", "FastAPI", "MCP", "Docker"],
    status: "ok",
    repoUrl: "https://github.com/gauravxsuvo/notschool",
    year: "2026",
  },
  {
    slug: "bharatsim",
    name: "BharatSim",
    tagline: "District-level environmental simulation platform",
    description:
      "A geospatial simulation platform spanning all 759 Indian districts, with four domain modules for flood risk, heatwave, crop yield, and air quality. Backed by FastAPI, SQLAlchemy, and GeoAlchemy2 over PostgreSQL/PostGIS with Redis caching, with a Next.js and Mapbox GL frontend shipped to Vercel and Render.",
    stack: ["Next.js", "FastAPI", "PostGIS", "Redis"],
    status: "live",
    repoUrl: "https://github.com/gauravxsuvo/BharatSim",
    liveUrl: "https://bharat-sim.vercel.app",
    year: "2026",
  },
];

export type SkillGroup = { category: string; items: string[] };

export const skillGroups: SkillGroup[] = [
  { category: "Languages", items: ["Python", "TypeScript", "SQL"] },
  {
    category: "Machine Learning",
    items: [
      "PyTorch",
      "Physics-Informed Neural Networks",
      "Automatic Differentiation",
      "scikit-learn",
      "XGBoost",
      "LightGBM",
    ],
  },
  {
    category: "AI Systems",
    items: [
      "LangGraph",
      "Google Gemini",
      "Model Context Protocol (FastMCP)",
      "Multi-Agent Orchestration",
      "LLM Tool-Calling",
    ],
  },
  {
    category: "Backend & Data",
    items: [
      "FastAPI",
      "SQLAlchemy",
      "GeoAlchemy2",
      "PostgreSQL / PostGIS",
      "SQLite",
      "Redis",
      "REST API Design",
      "OAuth 2.0",
    ],
  },
  {
    category: "Frontend & Infra",
    items: ["Next.js", "React", "Tailwind CSS", "Leaflet", "Docker", "Google Cloud Run", "Vercel", "Git"],
  },
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
    role: "Freelance Video Editor & Graphic Designer",
    org: "Self-employed",
    period: "2021-2024",
    location: "India",
    summary:
      "Video editing and brand design for 50+ paying clients over three years. I found every one of them myself, through cold email, LinkedIn and referrals.",
    highlights: [
      "Sole editor for the @Adityansh YouTube channel. Cut 10 to 12 videos that passed 1,000,000 combined views.",
      "Ran the scoping, pricing, revisions and deadlines myself, across concurrent projects in Premiere Pro, Photoshop and Illustrator.",
    ],
  },
];

export type EducationEntry = {
  school: string;
  degree: string;
  period: string;
  location: string;
  summary: string;
  highlights: string[];
};

export const education: EducationEntry = {
  school: "Indian Institute of Technology Guwahati",
  degree: "B.S. (Honours), Data Science and Artificial Intelligence",
  period: "2026-2030 (Expected)",
  location: "Guwahati, India",
  summary: "Coursework in machine learning, statistics and systems.",
  highlights: [],
};

export type Publication = {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  year: string;
  type: "conference" | "journal" | "workshop" | "preprint" | "thesis";
  status: "published" | "under-review" | "preprint";
  abstract: string;
  links?: { pdf?: string; doi?: string; arxiv?: string; code?: string };
  tags?: string[];
};

export const publications: Publication[] = [
  {
    id: "pinn-groundwater-ogallala",
    title:
      "Physics-Informed Neural Networks for Groundwater Depletion Inference: A Case Study on the Ogallala Aquifer",
    authors: ["Gaurav Raj Singh"],
    venue: "Zenodo",
    year: "2026",
    type: "preprint",
    status: "preprint",
    abstract:
      "A physics-informed neural network solves the groundwater diffusion PDE via automatic differentiation and inverts it to recover unreported well pumping rates from sparse well data. The forward solver validates to 0.91% relative L2 error against the analytical Theis solution, and the model recovers spatially varying depletion rates at 5.15% error on synthetic benchmarks. Held-out spatial validation on unseen Ogallala aquifer wells surfaced an overfitting failure found and fixed during development; the accompanying model card reports the true 38.3% holdout error and the model's intended-use limits.",
    links: { doi: "https://doi.org/10.5281/zenodo.21318191", code: "https://github.com/gauravxsuvo/DeepDarcy" },
    tags: ["machine learning", "physics-informed neural networks", "hydrology"],
  },
];

export const bio = {
  name: "Gaurav Raj Singh",
  handle: "gauravxsuvo",
  // Single source of truth. This used to be copy-pasted into the contact page,
  // the footer, the shell's `email` command and the console easter egg — and the
  // console one had drifted to a different address entirely.
  email: "hello@mysuvo.com",
  github: "https://github.com/gauravxsuvo",
  linkedin: "https://www.linkedin.com/in/gauravxsuvo",
  // The www form, matching PRODUCTION_ORIGIN in lib/site.ts — the apex
  // redirects here, so this is the address that doesn't cost a hop.
  website: "https://www.mysuvo.com",
  orcid: "0009-0009-0810-5513",
  role: "Data Science & AI student",
  location: "India",
  // Kept short and about the person, not the work. The projects, publications
  // and skills sections already say what he builds, at length; repeating it here
  // in the first person is what made this read like a cover letter.
  summary:
    "I'm Gaurav! I'm an undergraduate student at IIT Guwahati. I build machine learning systems and the software around them.",
  // The longer, first-person narrative — rendered only on /about. `summary`
  // above stays short on purpose: it's the hero line, the meta description and
  // the shell's `about.txt`, where a paragraph would be too much.
  about: [
    "I'm an undergrad at IIT Guwahati studying Data Science and AI. Most of what I do boils down to this: I like building things with data and code, and I like knowing why they work.",
    "I got here the usual way, by taking stuff apart. These days that looks like reading a paper and rebuilding it from scratch, or losing an entire evening to a bug that turns out to be one wrong index. Annoying in the moment. Weirdly satisfying after.",
    "The part that hooks me is the overlap between machine learning and plain old software engineering. Training a model is honestly the easy bit. Getting it to hold up against real data and real users is what I keep coming back to, especially in scientific ML, where the model has to respect actual physics instead of just chasing a metric.",
    "I'm not a lone-wolf coder either. I led a four-person hackathon team, freelanced for three years before college, and mentored people where I could. I also keep signing up for things slightly out of my depth. Sometimes that goes badly. I learn either way.",
    "Off the clock I game, mess with whatever new AI tool dropped that week, and start side projects with a survival rate I'd rather not publish.",
    "Right now I'm looking for work in ML engineering, AI research, AI systems or business intelligence. If you're building something interesting, say hi. My inbox is genuinely open.",
  ],
  focus: ["machine learning", "multi-agent systems", "geospatial systems", "full-stack development"],
};
