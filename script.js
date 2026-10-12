(() => {
  const data = window.PORTFOLIO_DATA;
  if (!data) return;

  const { profile, artifacts } = data;
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const themeLabel = document.querySelector(".theme-label");
  const savedTheme = localStorage.getItem("portfolio-theme");
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  const initialTheme = savedTheme || preferredTheme;

  function setTheme(theme) {
    root.dataset.theme = theme;
    toggle.setAttribute("aria-pressed", String(theme === "night"));
    themeLabel.textContent = theme === "night" ? "Day" : "Night";
  }

  setTheme(initialTheme);
  toggle.addEventListener("click", () => {
    const nextTheme = root.dataset.theme === "night" ? "day" : "night";
    setTheme(nextTheme);
    localStorage.setItem("portfolio-theme", nextTheme);
  });

  document.querySelector("#profile-intro").textContent = profile.intro;
  document.querySelector("#profile-about").textContent = profile.about;
  document.querySelectorAll("[data-profile-name]").forEach((node) => (node.textContent = profile.name));
  document.querySelectorAll('[data-profile-link="github"]').forEach((link) => (link.href = profile.github));
  document.querySelector("[data-year]").textContent = new Date().getFullYear();

  const facts = document.querySelector("[data-facts]");
  facts.replaceChildren(
    ...profile.facts.map(({ label, value }) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      wrapper.append(term, description);
      return wrapper;
    }),
  );

  const interestItems = profile.interests.flatMap((interest) => {
    const text = document.createElement("span");
    const star = document.createElement("i");
    text.textContent = interest;
    star.textContent = "✦";
    star.setAttribute("aria-hidden", "true");
    return [text, star];
  });
  // Repeat the set so the ticker loops without an empty gap.
  document.querySelector("[data-interests]").replaceChildren(...interestItems, ...interestItems.map((node) => node.cloneNode(true)), ...interestItems.map((node) => node.cloneNode(true)));

  const list = document.querySelector("#artifact-list");
  const template = document.querySelector("#artifact-template");
  artifacts.forEach((artifact) => {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".artifact-card");
    const status = fragment.querySelector(".artifact-status");
    const link = fragment.querySelector(".artifact-link");

    card.id = `artifact-${Number(artifact.number)}`;
    fragment.querySelector(".artifact-number").textContent = artifact.number;
    status.textContent = artifact.status;
    status.classList.toggle("is-complete", artifact.status.toLowerCase() === "complete");
    fragment.querySelector(".artifact-kind").textContent = artifact.kind;
    fragment.querySelector(".artifact-title").textContent = artifact.title;
    fragment.querySelector(".artifact-summary").textContent = artifact.summary;
    fragment.querySelector(".reflection-label").textContent = artifact.reflectionLabel;
    fragment.querySelector(".reflection-copy").textContent = artifact.reflection;

    const tagList = fragment.querySelector(".artifact-tags");
    artifact.tags.forEach((tag) => {
      const item = document.createElement("li");
      item.textContent = tag;
      tagList.append(item);
    });

    if (artifact.url) {
      link.href = artifact.url;
    } else {
      link.textContent = "Coming this quarter";
      link.setAttribute("aria-disabled", "true");
      link.removeAttribute("href");
    }
    list.append(fragment);
  });

  document.querySelector("[data-complete-count]").textContent = artifacts.filter(
    ({ status }) => status.toLowerCase() === "complete",
  ).length;
})();
