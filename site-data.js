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
      status: "Idea",
      kind: "AI inside it",
      title: "Explain It Back",
      summary:
        "A study companion that asks me to explain a technical concept, identifies the gaps in my explanation, and creates one focused follow-up exercise instead of flooding me with answers.",
      tags: ["Generative AI", "Learning", "Feedback loops"],
      reflectionLabel: "What I want to learn",
      reflection:
        "I want to explore how an AI feature can encourage real understanding without quietly doing the thinking for the learner.",
      url: "",
    },
    {
      number: "04",
      status: "Idea",
      kind: "For someone else",
      title: "RouteWatch Community",
      summary:
        "A lightweight reporting and insight tool for people who walk or commute through the city, helping a community share route concerns without turning safety into a vague score.",
      tags: ["Civic tech", "Mobile", "Community data"],
      reflectionLabel: "What I want to learn",
      reflection:
        "I want to practice building for needs that are not my own and learn how to handle location-based claims with care and transparency.",
      url: "",
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
