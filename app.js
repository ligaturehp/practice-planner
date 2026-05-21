const days = [
  { id: "sat", label: "SAT", title: "Recovery" },
  { id: "sun", label: "SUN", title: "Active Recovery" },
  { id: "mon", label: "MON", title: "Install" },
  { id: "tue", label: "TUE", title: "Contact" },
  { id: "wed", label: "WED", title: "Specials" },
  { id: "thu", label: "THU", title: "Execution + Speed" },
  { id: "fri", label: "FRI", title: "Game" }
];

const rowLabels = [
  "Pace",
  "Work / rest",
  "Ball in play",
  "Contact",
  "Volume",
  "Tactical focus",
  "Technical skill",
  "Decision making",
  "Speed exposure",
  "S&C emphasis",
  "Recovery emphasis"
];

const rowBlockCategories = {
  "Attack / defense": ["Tactical"],
  Contact: ["Contact"],
  "Tactical focus": ["Tactical"],
  "Technical skill": ["Technical skill"],
  "Unit skills": ["Technical skill"],
  "Decision making": ["Decision making"],
  "Speed exposure": ["Speed"],
  "S&C emphasis": ["Strength", "Conditioning"],
  "Recovery emphasis": ["Recovery"]
};

const templates = {
  gameFriday: {
    sat: ["Rest", "-", "-", "-", "-", "Restore", "Mobility", "-", "None", "Recovery", "High"],
    sun: ["Easy", "Longer rest", "< 10 min", "None", "Low", "Walk-thru", "Fundamentals", "Low", "None", "Recovery", "Moderate"],
    mon: ["Moderate", "Longer rest", "10-15 min", "None", "Moderate", "Install", "Position skill", "Moderate", "Build", "Strength", "Low"],
    tue: ["Fast", "Short rest", "20-30 min", "Full contact", "High", "Full scheme", "Competitive", "High", "Accel / COD", "Power", "Low"],
    wed: ["Moderate", "Moderate rest", "10-15 min", "Limited", "Moderate", "Situational", "Technique", "Medium", "Low sprint", "Volume", "Moderate"],
    thu: ["Fast", "Short + sharp", "15-20 min", "Limited", "Low", "Reps + speed", "Sharp", "Medium", "Max speed", "Power / speed", "Low"],
    fri: ["Max", "-", "Game", "Game contact", "Game", "Game", "Game", "High", "Game", "Activate", "-"]
  },
  gameSaturday: {
    sat: ["Max", "-", "Game", "Game contact", "Game", "Game", "Game", "High", "Game", "Activate", "-"],
    sun: ["Rest", "-", "-", "-", "-", "Restore", "Mobility", "-", "None", "Recovery", "High"],
    mon: ["Easy", "Longer rest", "< 10 min", "None", "Low", "Install", "Fundamentals", "Low", "None", "Recovery", "Moderate"],
    tue: ["Moderate", "Longer rest", "10-15 min", "Controlled", "Moderate", "Install", "Position skill", "Moderate", "Build", "Strength", "Low"],
    wed: ["Fast", "Short rest", "20-30 min", "Full contact", "High", "Full scheme", "Competitive", "High", "Accel / COD", "Power", "Low"],
    thu: ["Moderate", "Moderate rest", "10-15 min", "Limited", "Moderate", "Situational", "Technique", "Medium", "Low sprint", "Volume", "Moderate"],
    fri: ["Fast", "Short + sharp", "15-20 min", "Limited", "Low", "Reps + speed", "Sharp", "Medium", "Max speed", "Power / speed", "Low"]
  }
};

const levelWords = {
  rest: "neutral",
  easy: "low",
  low: "low",
  none: "low",
  recovery: "low",
  moderate: "medium",
  medium: "medium",
  build: "medium",
  limited: "medium",
  fast: "high",
  high: "high",
  contact: "high",
  "full contact": "high",
  max: "max",
  game: "max",
  "game contact": "max"
};

const levelScores = {
  neutral: 0,
  low: 1,
  medium: 2,
  high: 3,
  max: 4
};

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const state = {
  selectedDay: "mon",
  template: "gameFriday",
  grid: {},
  blocks: {
    sat: [],
    sun: [],
    mon: [
      {
        id: createId(),
        name: "Lower-body strength emphasis",
        category: "Strength",
        level: "Medium",
        minutes: 40,
        demand: 7,
        tags: ["heavy sets", "team lift", "moderate volume"],
        exposures: ["Heavy sets", "Total volume load"],
        notes: "Main strength exposure for the week. Keep technical field volume controlled."
      }
    ],
    tue: [
      {
        id: createId(),
        name: "Full-contact competitive period",
        category: "Contact",
        level: "High",
        minutes: 28,
        demand: 9,
        tags: ["contact", "full scheme", "decision speed"],
        exposures: ["Accelerations/decelerations", "Change-of-direction volume"],
        notes: "Primary contact and decision-making stressor. Watch stacking with gym power work."
      }
    ],
    wed: [],
    thu: [
      {
        id: createId(),
        name: "Short max speed exposure",
        category: "Speed",
        level: "Medium",
        minutes: 18,
        demand: 8,
        tags: ["max speed", "full rest", "low volume"],
        exposures: ["Max sprint count", "High-speed running"],
        notes: "Sharp exposure without turning Thursday into a volume day."
      }
    ],
    fri: []
  }
};

const headerRow = document.querySelector("#dayHeaderRow");
const gridBody = document.querySelector("#gridBody");
const sportSelect = document.querySelector("#sportSelect");
const templateSelect = document.querySelector("#templateSelect");
const selectedDayLabel = document.querySelector("#selectedDayLabel");
const selectedDayAu = document.querySelector("#selectedDayAu");
const selectedDayLevel = document.querySelector("#selectedDayLevel");
const weekAu = document.querySelector("#weekAu");
const peakDay = document.querySelector("#peakDay");
const exposureWatch = document.querySelector("#exposureWatch");
const blockList = document.querySelector("#blockList");
const blockForm = document.querySelector("#blockForm");
const clearDayButton = document.querySelector("#clearDayButton");
const printButton = document.querySelector("#printButton");
const selectedDayTheme = document.querySelector("#selectedDayTheme");
const selectedBlockCount = document.querySelector("#selectedBlockCount");
const selectedExposureCount = document.querySelector("#selectedExposureCount");
const blockBuilderDay = document.querySelector("#blockBuilderDay");
const dayFocusInput = document.querySelector("#dayFocusInput");
const blockDialog = document.querySelector("#blockDialog");
const openBlockBuilderButton = document.querySelector("#openBlockBuilderButton");
const closeBlockBuilderButton = document.querySelector("#closeBlockBuilderButton");

function initGridFromTemplate(templateName) {
  state.grid = {};
  const template = templates[templateName];
  days.forEach((day) => {
    state.grid[day.id] = [...template[day.id]];
  });
}

function getDayAu(dayId) {
  return state.blocks[dayId].reduce((sum, block) => {
    return sum + getBlockAu(block);
  }, 0);
}

function getBlockAu(block) {
  return Number(block.minutes) * Number(block.demand);
}

function getDayKeywordScore(dayId) {
  return state.grid[dayId].reduce((sum, value) => {
    return sum + levelScores[classifyCell(value)];
  }, 0);
}

function getDayEvaluationScore(dayId) {
  const dayAu = getDayAu(dayId);
  const keywordScore = getDayKeywordScore(dayId);

  if (dayAu > 0) {
    return 10000 + dayAu + keywordScore * 2;
  }

  return keywordScore * 20;
}

function getDayLevels() {
  const totals = days.map((day) => ({ id: day.id, score: getDayEvaluationScore(day.id) }));
  const nonZero = totals.filter((item) => item.score > 0).sort((a, b) => a.score - b.score);

  if (nonZero.length === 0) {
    return Object.fromEntries(days.map((day) => [day.id, "Low"]));
  }

  return Object.fromEntries(
    totals.map((item) => {
      if (item.score === 0) return [item.id, "Low"];
      const rank = nonZero.findIndex((entry) => entry.id === item.id);
      const percentile = (rank + 1) / nonZero.length;
      if (percentile <= 1 / 3) return [item.id, "Low"];
      if (percentile <= 2 / 3) return [item.id, "Medium"];
      return [item.id, "High"];
    })
  );
}

function classifyCell(value) {
  const normalized = value.trim().toLowerCase();
  const directMatch = levelWords[normalized];
  if (directMatch) return directMatch;
  if (normalized.includes("game")) return "max";
  if (normalized.includes("full") || normalized.includes("high")) return "high";
  if (normalized.includes("moderate") || normalized.includes("medium")) return "medium";
  if (normalized.includes("low") || normalized.includes("easy") || normalized.includes("recovery")) return "low";
  return "neutral";
}

function getBlocksForGridCell(dayId, label) {
  const categories = rowBlockCategories[label] || [];
  return state.blocks[dayId].filter((block) => categories.includes(block.category));
}

function getBlockCellAuLevels() {
  const cellTotals = [];

  rowLabels.forEach((label) => {
    days.forEach((day) => {
      const total = getBlocksForGridCell(day.id, label).reduce((sum, block) => sum + getBlockAu(block), 0);
      if (total > 0) {
        cellTotals.push({ key: `${day.id}:${label}`, total });
      }
    });
  });

  const sorted = [...cellTotals].sort((a, b) => a.total - b.total);

  return Object.fromEntries(
    cellTotals.map((cell) => {
      const rank = sorted.findIndex((entry) => entry.key === cell.key);
      const percentile = (rank + 1) / sorted.length;

      if (percentile <= 1 / 3) return [cell.key, "low"];
      if (percentile <= 2 / 3) return [cell.key, "medium"];
      return [cell.key, "high"];
    })
  );
}

function createBlockReference(block) {
  const details = document.createElement("details");
  details.className = "grid-block-reference";

  const au = getBlockAu(block);
  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span>${escapeHtml(block.name)}</span>
    <strong>${au} AU</strong>
  `;
  details.append(summary);

  const meta = document.createElement("div");
  meta.className = "grid-block-detail";

  const tagLine = document.createElement("p");
  tagLine.innerHTML = `<strong>Tags:</strong> ${escapeHtml(block.tags.join(", ") || "None")}`;

  const exposureLine = document.createElement("p");
  exposureLine.innerHTML = `<strong>Exposure:</strong> ${escapeHtml(block.exposures.join(", ") || "None")}`;

  const notesLine = document.createElement("p");
  notesLine.innerHTML = `<strong>Notes:</strong> ${escapeHtml(block.notes || "None")}`;

  meta.append(tagLine, exposureLine, notesLine);
  details.append(meta);

  return details;
}

function renderHeader() {
  headerRow.innerHTML = '<th scope="col" class="guide-cell">Guide</th>';
  const levels = getDayLevels();

  days.forEach((day) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = `day-head level-${levels[day.id].toLowerCase()}`;
    if (day.id === state.selectedDay) th.classList.add("is-selected");

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.day = day.id;
    button.innerHTML = `
      <span class="day-name">${day.label}</span>
      <span>${day.title}</span>
      <span class="day-au">${getDayAu(day.id)} AU</span>
      <span class="day-level">${levels[day.id]}</span>
    `;
    button.addEventListener("click", () => selectDay(day.id));
    th.append(button);
    headerRow.append(th);
  });
}

function renderGrid() {
  gridBody.innerHTML = "";
  const blockCellAuLevels = getBlockCellAuLevels();

  rowLabels.forEach((label, rowIndex) => {
    const tr = document.createElement("tr");
    const rowHead = document.createElement("th");
    rowHead.scope = "row";
    rowHead.className = "row-label";
    rowHead.textContent = label;
    tr.append(rowHead);

    days.forEach((day) => {
      const value = state.grid[day.id][rowIndex];
      const cellBlocks = getBlocksForGridCell(day.id, label);
      const blockLevel = blockCellAuLevels[`${day.id}:${label}`];
      const td = document.createElement("td");
      td.className = `demand-cell level-${blockLevel || classifyCell(value)}`;
      if (cellBlocks.length) td.classList.add("has-blocks");

      const textarea = document.createElement("textarea");
      textarea.className = "cell-editor";
      textarea.value = value;
      textarea.rows = 2;
      textarea.dataset.day = day.id;
      textarea.dataset.row = rowIndex;
      textarea.addEventListener("focus", () => selectDay(day.id));
      textarea.addEventListener("input", (event) => {
        state.grid[day.id][rowIndex] = event.target.value;
        td.className = `demand-cell level-${classifyCell(event.target.value)}`;
      });
      td.append(textarea);

      if (cellBlocks.length) {
        const stack = document.createElement("div");
        stack.className = "cell-block-stack";

        const stackLabel = document.createElement("div");
        stackLabel.className = "cell-block-label";
        const totalAu = cellBlocks.reduce((sum, block) => sum + getBlockAu(block), 0);
        stackLabel.textContent = `${cellBlocks.length} block${cellBlocks.length === 1 ? "" : "s"} | ${totalAu} AU | ${blockLevel}`;
        stack.append(stackLabel);

        cellBlocks.forEach((block) => {
          const reference = createBlockReference(block);
          stack.append(reference);
        });

        td.append(stack);
      }

      tr.append(td);
    });

    gridBody.append(tr);
  });
}

function renderBlocks() {
  const blocks = state.blocks[state.selectedDay];
  blockList.innerHTML = "";

  if (!blocks.length) {
    blockList.innerHTML = '<p class="block-notes">No blocks added yet. Add a block to create planned AU and exposure flags.</p>';
    return;
  }

  blocks.forEach((block) => {
    const article = document.createElement("article");
    article.className = "block-item";
    const au = Number(block.minutes) * Number(block.demand);
    const tags = block.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
    const exposures = block.exposures.map((exposure) => `<span class="pill">${escapeHtml(exposure)}</span>`).join("");

    article.innerHTML = `
      <header>
        <div>
          <h4>${escapeHtml(block.name)}</h4>
          <span>${escapeHtml(block.category)} | ${escapeHtml(block.level)}</span>
        </div>
        <div>
          <span class="block-au">${au} AU</span>
          <button class="remove-block" type="button" data-id="${block.id}" title="Remove block">X</button>
        </div>
      </header>
      <div class="block-body">
        <div class="block-meta">${tags}</div>
        <div class="block-exposures">${exposures || '<span class="pill">No exposure flags</span>'}</div>
        <p class="block-notes">${escapeHtml(block.notes)}</p>
      </div>
    `;
    article.querySelector(".remove-block").addEventListener("click", () => removeBlock(block.id));
    blockList.append(article);
  });
}

function renderSummary() {
  const levels = getDayLevels();
  const totals = days.map((day) => ({ ...day, au: getDayAu(day.id) }));
  const weekTotal = totals.reduce((sum, day) => sum + day.au, 0);
  const peak = totals.reduce((current, day) => (day.au > current.au ? day : current), totals[0]);
  const selectedTotal = getDayAu(state.selectedDay);
  const selectedLevel = levels[state.selectedDay];
  const selectedDay = days.find((day) => day.id === state.selectedDay);
  const selectedBlocks = state.blocks[state.selectedDay];
  const selectedExposureTotal = new Set(selectedBlocks.flatMap((block) => block.exposures)).size;
  const exposureCounts = countExposures();
  const stacked = Object.entries(exposureCounts).filter(([, count]) => count >= 2);

  weekAu.textContent = weekTotal;
  peakDay.textContent = peak.au > 0 ? `${peak.label} ${peak.au}` : "None";
  selectedDayAu.textContent = selectedTotal;
  selectedDayLevel.textContent = selectedLevel;
  selectedDayLabel.textContent = selectedDay.label;
  selectedDayTheme.textContent = selectedDay.title;
  dayFocusInput.value = selectedDay.title;
  selectedBlockCount.textContent = selectedBlocks.length;
  selectedExposureCount.textContent = selectedExposureTotal;
  blockBuilderDay.textContent = selectedDay.label;
  exposureWatch.textContent = stacked.length ? `${stacked[0][0]} x${stacked[0][1]}` : "Balanced";
}

function renderAll() {
  renderHeader();
  renderGrid();
  renderSummary();
  renderBlocks();
}

function selectDay(dayId) {
  state.selectedDay = dayId;
  renderHeader();
  renderSummary();
  renderBlocks();
}

function removeBlock(blockId) {
  state.blocks[state.selectedDay] = state.blocks[state.selectedDay].filter((block) => block.id !== blockId);
  renderAll();
}

function openBlockDialog() {
  const selectedDay = days.find((day) => day.id === state.selectedDay);
  blockBuilderDay.textContent = selectedDay.label;

  if (typeof blockDialog.showModal === "function") {
    blockDialog.showModal();
  } else {
    blockDialog.setAttribute("open", "");
  }
}

function closeBlockDialog() {
  if (typeof blockDialog.close === "function") {
    blockDialog.close();
  } else {
    blockDialog.removeAttribute("open");
  }
}

function countExposures() {
  return Object.values(state.blocks)
    .flat()
    .flatMap((block) => block.exposures)
    .reduce((counts, exposure) => {
      counts[exposure] = (counts[exposure] || 0) + 1;
      return counts;
    }, {});
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

blockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(blockForm);
  const exposures = data.getAll("exposure");
  const tags = String(data.get("blockTags") || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  state.blocks[state.selectedDay].push({
    id: createId(),
    name: data.get("blockName"),
    category: data.get("blockCategory"),
    level: data.get("blockLevel"),
    minutes: Number(data.get("blockMinutes")),
    demand: Number(data.get("blockDemand")),
    tags,
    exposures,
    notes: data.get("blockNotes")
  });

  renderAll();
  closeBlockDialog();
});

dayFocusInput.addEventListener("input", (event) => {
  const selectedDay = days.find((day) => day.id === state.selectedDay);
  selectedDay.title = event.target.value.trim() || "Untitled";
  renderHeader();
  selectedDayTheme.textContent = selectedDay.title;
  blockBuilderDay.textContent = selectedDay.label;
});

openBlockBuilderButton.addEventListener("click", openBlockDialog);
closeBlockBuilderButton.addEventListener("click", closeBlockDialog);

clearDayButton.addEventListener("click", () => {
  state.blocks[state.selectedDay] = [];
  renderAll();
});

templateSelect.addEventListener("change", (event) => {
  state.template = event.target.value;
  initGridFromTemplate(state.template);
  renderAll();
});

sportSelect.addEventListener("change", (event) => {
  const sport = event.target.value;
  rowLabels[5] = sport === "rugby" ? "Attack / defense" : "Tactical focus";
  rowLabels[6] = sport === "rugby" ? "Unit skills" : "Technical skill";
  renderGrid();
});

printButton.addEventListener("click", () => window.print());

initGridFromTemplate(state.template);
renderAll();
