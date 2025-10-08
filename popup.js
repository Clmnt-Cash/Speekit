const readBtn = document.getElementById("readPage");
const stopBtn = document.getElementById("stop");
import { GCloud_TTS_API_KEY } from './config.js';

// ------------------------------
// Configuration des voix et styles
// ------------------------------

let selectedVoice;
let selectedPromptStyle;
let loader;

document.addEventListener("DOMContentLoaded", () => {
  const voices = [
    { name: "en-US-Wavenet-D", label: "Male 1", icon: "icons/man.png" },
    { name: "en-US-Wavenet-F", label: "Female 1", icon: "icons/woman.png" },
    { name: "en-US-Wavenet-C", label: "Male 2", icon: "icons/man.png" },
    { name: "en-US-Wavenet-E", label: "Female 2", icon: "icons/woman.png" }
  ];

  const promptStyles = [
    { name: "friendly", label: "Friendly", icon: "icons/friendly.png" },
    { name: "casual", label: "Casual", icon: "icons/casual.png" },
    { name: "formal", label: "Formal", icon: "icons/formal.png" },
    { name: "funny", label: "Funny", icon: "icons/funny.png" }
  ];
  // Valeurs par défaut
  selectedVoice = voices[0].name;
  selectedPromptStyle = promptStyles[0].name;

  const voiceSelect = document.getElementById("voiceOptions");
  const styleSelect = document.getElementById("styleOptions");

  // Gérer le changement
  voiceSelect.addEventListener("change", () => {
    selectedVoice = voiceSelect.value;
  });

  styleSelect.addEventListener("change", () => {
    selectedPromptStyle = styleSelect.value;
  });

  // Loader
  loader = document.createElement("div");
  loader.id = "loader";
  loader.style.height = "8px";
  loader.style.width = "100%";
  loader.style.background = "#eee";
  loader.style.borderRadius = "4px";
  loader.style.overflow = "hidden";
  loader.style.marginBottom = "12px";
  loader.style.display = "none";

  const loaderInner = document.createElement("div");
  loaderInner.id = "loader-inner";
  loaderInner.style.height = "100%";
  loaderInner.style.width = "0%";
  loaderInner.style.background = "linear-gradient(90deg, #0476ff, #00c3ff, #0476ff)";
  loaderInner.style.animation = "loading 2s linear infinite";
  loader.appendChild(loaderInner);

  // Insert loader above buttons
  const main = document.querySelector("main");
  main.insertBefore(loader, readBtn);

  function createOptions(containerId, options, type) {
    const container = document.getElementById(containerId);
    options.forEach(opt => {
      const div = document.createElement("div");
      div.className = "option";
      div.innerHTML = `<img src="${opt.icon}" alt="${opt.label}" /> ${opt.label}`;
      div.addEventListener("click", () => {
        container.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
        div.classList.add("selected");
        if(type === "voice") selectedVoice = opt.name;
        else selectedPromptStyle = opt.name;
      });
      container.appendChild(div);
    });
    // Sélection initiale
    container.children[0].classList.add("selected");
  }

  // Créer les options
  createOptions("voiceOptions", voices, "voice");
  createOptions("styleOptions", promptStyles, "style");
});

const settingsToggle = document.getElementById("settingsToggle");
const settingsContent = document.querySelector(".settings-content");
const arrow = document.getElementById("arrow");

settingsToggle.addEventListener("click", () => {
  settingsContent.classList.toggle("collapsed");
  if (settingsContent.classList.contains("collapsed")) {
    arrow.style.transform = "rotate(-45deg)"; // flèche vers le bas
  } else {
    arrow.style.transform = "rotate(135deg)"; // flèche vers le haut
  }
});


// ------------------------------
// 1. Extract readable text
// ------------------------------
async function getReadableText() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const result = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const allowedTags = ['P','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','FIGCAPTION'];
      const ignoreTags = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'SCRIPT', 'STYLE'];

      function isVisible(el) {
        const style = window.getComputedStyle(el);
        return style && style.display !== 'none' && style.visibility !== 'hidden';
      }

      function getTextFromNode(node) {
        let text = '';
        if (!node) return text;

        if (node.nodeType === Node.ELEMENT_NODE) {
          if (!isVisible(node)) return '';
          if (ignoreTags.includes(node.tagName)) return '';

          if (allowedTags.includes(node.tagName)) {
            const t = (node.innerText || node.textContent || "").trim();
            if (t) text += t + '\n';
          }
        }

        node.childNodes.forEach(child => {
          text += getTextFromNode(child);
        });

        return text;
      }

      return getTextFromNode(document.body);
    }
  });

  console.log("Readable text result:", result);
  return result[0].result;
}

// ------------------------------
// 2. Summarize with Gemini API (Chrome built-in if available)
// ------------------------------
// ------------------------------
// 2. Summarize with Chrome Prompt API (Gemini Nano via Prompt API)
// ------------------------------
async function summarizeText(text) {
  try {
    // Vérifie que l’API est disponible
    if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
      console.warn("Prompt API not available in this build.");
      return text;
    }

    // Limite la longueur pour éviter les excès
    const MAX_INPUT_LENGTH = 10000;
    if (text.length > MAX_INPUT_LENGTH) {
      console.warn(`Input text too long (${text.length}). Truncating.`);
      text = text.substring(0, MAX_INPUT_LENGTH);
    }

    // Vérifie la disponibilité du modèle
    const availability = await LanguageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });
    if (availability === "unavailable") {
      console.warn("Prompt API says model unavailable.");
      return text;
    }

    // Crée la session (le modèle peut devoir être téléchargé)  
    const session = await LanguageModel.create({
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Prompt API model download: ${Math.round(e.loaded * 100)}%`);
        });
      },
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });

    const stylePrompts = {
      friendly: "Summarize the following text in a friendly manner, as if talking to a friend.",
      casual: "Summarize the following text casually, keeping it light and easy to read.",
      formal: "Summarize the text in a professional and formal style.",
      funny: "Summarize the text humorously, adding some light jokes."
    };

    const prompt = `
      You are a useful AI agent for web search. ${stylePrompts[selectedPromptStyle]}

      Text:
      ${text}
    `;

    // Envoie le prompt et récupère la réponse
    const summary = await session.prompt(prompt);

    return summary || text;
  } catch (err) {
    console.error("Error using Prompt API:", err);
    return text;
  }
}


// ------------------------------
// 3. Text-to-Speech with Google TTS (Chirp 3 HD)
// ------------------------------
async function speakResponse(text) {
  if (!text || !text.trim()) return;

  loader.style.display = "block"; // afficher loader

  try {
    if (!GCloud_TTS_API_KEY) {
      console.error("Missing GCloud_TTS_API_KEY");
      loader.style.display = "none";
      return;
    }

    const requestBody = {
      input: { text },
      voice: { languageCode: "en-US", name: selectedVoice },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0.0 }
    };

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCloud_TTS_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
    );

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const audioBlob = new Blob([Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))], { type: "audio/mp3" });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    window.currentAudio = audio;
    audio.onended = () => loader.style.display = "none";
  } catch (err) {
    console.error("Error during Google TTS:", err);
    loader.style.display = "none";
  }
}

function stopSpeech() {
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio.currentTime = 0;
    window.currentAudio = null;
  }
  loader.style.display = "none";
}

// ------------------------------
// Boutons
// ------------------------------
readBtn.addEventListener("click", async () => {
  const pageText = await getReadableText();
  const summary = await summarizeText(pageText);
  speakResponse(summary);
});

stopBtn.addEventListener("click", stopSpeech);