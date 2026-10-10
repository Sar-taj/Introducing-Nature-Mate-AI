
import { pipeline } from
  "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

// Open-weight AI model running in the browser.
let natureAI = null;
let modelPromise = null;

const form = document.getElementById("planForm");
const generateBtn = document.getElementById("generateBtn");
const statusBox = document.getElementById("status");
const result = document.getElementById("result");
const resultTitle = document.getElementById("resultTitle");
const resultBody = document.getElementById("resultBody");
const completeBtn = document.getElementById("completeBtn");

const interestInput = document.getElementById("interest");
const durationInput = document.getElementById("duration");
const locationInput = document.getElementById("location");

const missionCount = document.getElementById("missionCount");
const minuteCount = document.getElementById("minuteCount");

let currentDuration = 20;
let currentMission = "";
let completedCurrentMission = false;

// Read saved progress from this browser.
function getProgress() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("natureMateProgress") || "{}"
    );

    return {
      missions: Number.isFinite(saved.missions) &&
        saved.missions >= 0 ? saved.missions : 0,
      minutes: Number.isFinite(saved.minutes) &&
        saved.minutes >= 0 ? saved.minutes : 0
    };
  } catch {
    return { missions: 0, minutes: 0 };
  }
}

function updateProgress() {
  const progress = getProgress();
  missionCount.textContent = progress.missions;
  minuteCount.textContent = progress.minutes;
}

updateProgress();

// Load the AI model only once.
async function loadAI() {
  if (natureAI) return natureAI;

  if (!modelPromise) {
    modelPromise = pipeline(
      "text2text-generation",
      "Xenova/flan-t5-small"
    );
  }

  try {
    natureAI = await modelPromise;
    return natureAI;
  } catch (error) {
    modelPromise = null;
    throw error;
  }
}

// Ask the open-weight model to create a nature mission.
async function generateMission(interest, duration, location) {
  const ai = await loadAI();

  const place = location || "a safe outdoor area nearby";

  const prompt = `
Create a practical outdoor nature mission for a beginner.

Interest: ${interest}
Time available: ${duration}
Place: ${place}

Requirements:
Give a short creative title.
Give exactly three simple numbered steps.
Suggest one thing to observe or discover.
End with one short reflection question.
Keep the activity safe, inexpensive, and possible without
special equipment. Do not invent local wildlife sightings
or claim that weather conditions are safe.
Keep the response under 110 words.
`;

  const output = await ai(prompt, {
    max_new_tokens: 140,
    do_sample: false
  });

  const text = output?.[0]?.generated_text?.trim();

  if (!text) {
    throw new Error("The AI returned an empty response.");
  }

  return text;
}

// Display the AI output as plain text to avoid unsafe HTML.
function displayMission(text, interest) {
  resultTitle.textContent = "Your " + interest + " adventure";
  resultBody.textContent = text;
  result.hidden = false;
  currentMission = text;
  completedCurrentMission = false;
  completeBtn.disabled = false;
  completeBtn.textContent = "✓ I completed my mission";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const interest = interestInput.value;
  const duration = durationInput.value;
  const location = locationInput.value.trim();

  currentDuration = Number.parseInt(duration, 10) || 20;

  generateBtn.disabled = true;
  generateBtn.textContent = "🌱 Preparing your mission...";
  result.hidden = true;
  statusBox.textContent =
    "Loading the open-weight AI model. The first load may take a while.";

  try {
    const mission = await generateMission(
      interest,
      duration,
      location
    );

    displayMission(mission, interest);
    statusBox.textContent =
      "Your AI-generated mission is ready. Time to step outside!";
  } catch (error) {
    console.error("NatureMate AI error:", error);

    statusBox.textContent =
      "The AI could not load. Check your internet connection, " +
      "model availability, and browser console, then try again.";
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "✨ Generate my nature mission";
  }
});

// Track a completed mission.
completeBtn.addEventListener("click", () => {
  if (!currentMission || completedCurrentMission) return;

  const progress = getProgress();

  progress.missions += 1;
  progress.minutes += currentDuration;

  try {
    localStorage.setItem(
      "natureMateProgress",
      JSON.stringify(progress)
    );

    completedCurrentMission = true;
    completeBtn.disabled = true;
    completeBtn.textContent = "✓ Mission completed!";
    statusBox.textContent =
      "Amazing! You spent time exploring the real world.";
    updateProgress();
  } catch {
    statusBox.textContent =
      "Your browser could not save progress. Check storage settings.";
  }
});
