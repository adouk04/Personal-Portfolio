// Edit this file as the quarter progresses. Every artifact card is generated
// from the data below, so you do not need to change index.html.
window.PORTFOLIO_DATA = {
  profile: {
    name: "Alex",
    github: "https://github.com/adouk04",
    intro:
      "I’m Alex, a software developer interested in mobile products, practical AI, and systems that make complicated decisions easier to understand.",
    about:
      "My favorite projects turn messy, real-world information into a clear next step. I have worked on mobile experiences spanning safer navigation and financial decision-making, and I care about the backend logic that makes those experiences reliable.",
    interests: [
      "Mobile products",
      "Explainable AI",
      "Civic tech",
      "Fintech",
      "Human-centered systems",
    ],
    facts: [
      { label: "Focus", value: "Practical, understandable software" },
      { label: "Current mode", value: "Learning by shipping" },
      { label: "Based near", value: "University of Washington Tacoma" },
    ],
  },
  artifacts: [
    {
      number: "01",
      status: "Complete",
      kind: "Portfolio system",
      title: "Building in Public",
      summary:
        "A responsive portfolio that will hold all five TCSS 490 artifacts in one evolving, public record. It is intentionally data-driven so future cards can be updated without rebuilding the page.",
      tags: ["HTML", "CSS", "JavaScript", "GitHub Pages"],
      reflectionLabel: "What I learned",
      reflection:
        "I learned that a useful prompt is less about naming a visual style and more about defining the job the site needs to do. Separating the artifact content from the layout also made the portfolio easier to maintain for the rest of the quarter. I started the build with ChatGPT and later switched to Claude to make the design changes.",
      url: "https://github.com/adouk04/Personal-Portfolio",
    },
    {
      number: "02",
      status: "Complete",
      kind: "Something I will use",
      title: "NFL Game Simulator",
      summary:
        "Pick any two of the 32 NFL teams and play out a full game play by play to see the final score and player stats, or play 1,000 games to see each team's win odds. It runs from the command line and as a web page.",
      tags: ["Python", "Pyodide", "GitHub Actions", "GitHub Pages"],
      reflectionLabel: "What I learned",
      reflection:
        "It was impressive how much AI could find and pull together, like team stats and starting lineups from so many different sources. I also learned that it can't do everything in one prompt unless the prompt is very detailed, so I got better results by building in steps and checking each one.",
      url: "https://github.com/adouk04/artifact-2-repo",
    },
    {
      number: "03",
      status: "Complete",
      kind: "AI inside it",
      title: "Spending Sorter",
      summary:
        "A terminal tool that sorts a bank export into spending categories. Claude labels each transaction from its description only, never the amounts or dates. Plain code reads the file, checks every label, flags anything unsure or inconsistent with whether money came in or went out, computes all totals in cents, and verifies the output before saving it. It also reports a weekly spending pace and heads-up flags, and an optional summary written by Claude is rejected if it uses any number the code did not compute.",
      tags: ["Node.js", "Claude Code (claude -p)", "Structured output", "Fintech"],
      reflectionLabel: "What I learned",
      reflection:
        "For this artifact, I wanted to create something practical that could help people better understand their spending habits. I decided to build a Spending Sorter that takes transactions from a CSV file, organizes them into categories, and identifies spending patterns. One thing I found interesting was how AI could handle categorizing transactions while regular code handled the calculations and verified the results. I also wanted to go beyond just sorting transactions by adding weekly spending estimates and flags for unusual charges. This project helped me better understand how AI can be combined with traditional programming to create something useful while still keeping accuracy and privacy in mind. One limitation I learned about is that AI can misclassify transactions, so having checks in place is important.",
      url: "https://github.com/adouk04/Personal-Portfolio/tree/main/spending-sorter",
    },
    {
      number: "04",
      status: "Complete",
      kind: "For someone else",
      title: "Resume Builder",
      summary:
        "A web app where a user sets up their resume once as a template, keeps a library of projects, work experience and education, and builds several tailored resumes by dragging entries onto a fixed US Letter page. It warns and highlights the entries that don't fit when content runs past one page, and it exports a PDF that matches the screen. Built with a teammate for a classmate who is job hunting. Live site: artifact4.vercel.app (try Continue as guest). I built login (email, Google and guest mode), the Supabase database with row-level security, the entry library, template setup, a live resume preview and the UI design. My teammate built the drag-and-drop resume page, the overflow check, PDF export and saved resumes.",
      tags: ["Next.js", "TypeScript", "Supabase", "dnd-kit", "Tailwind", "Vercel"],
      reflectionLabel: "What I learned",
      reflection:
        "The hard part of building with a teammate was keeping two AI agents from colliding. A shared PLAN.md, CLAUDE.md and LOG.md gave both agents the same facts, folder ownership kept us out of each other's files, and pull requests let us review each other's work. We still hit merge conflicts when we both edited the resume toolbar, and resolving them by reading both sides taught me to log changes to shared files right away. I also learned that slow navigation can have simple causes: seeding sample data one row at a time and an extra network call on every page load. Batching the inserts and checking the session locally fixed most of it. Because I didn't own the team repo, I forked it so I could deploy on Vercel's free tier.",
      url: "https://github.com/alexalt9924/artifact4",
    },
    {
      number: "05",
      status: "Idea",
      kind: "The moonshot",
      title: "Horus, Fully Realized",
      summary:
        "An explainable financial co-pilot that routes everyday purchases toward the best card while keeping debt, utilization, and long-term financial health visible in every recommendation.",
      tags: ["Fintech", "Decision systems", "Explainability"],
      reflectionLabel: "What I want to learn",
      reflection:
        "I want to learn how to scope an ambitious system, connect many moving parts, and make high-stakes recommendations understandable rather than magical.",
      url: "",
    },
  ],
};
