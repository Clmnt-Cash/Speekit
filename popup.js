import { GCloud_TTS_API_KEY } from './config.js';

// ------------------------------
// Variables globales
// ------------------------------
let selectedVoice;
let selectedPromptStyle;
let loader;
let mediaRecorder;
let audioChunks = [];
let recording = false;
let timePromptToTTS = 0;

// ------------------------------
// Fonction pour créer les options voix / style
// ------------------------------
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
  container.children[0].classList.add("selected");
}

// ------------------------------
// Récupérer le texte de la page active
// ------------------------------
async function getPageText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const allowedTags = ['P','DIV','SPAN','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','FIGCAPTION'];
        const ignoreTags = ['HEADER','FOOTER','NAV','ASIDE','SCRIPT','STYLE','NOSCRIPT','META','LINK'];
        
        function isVisible(el) {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return style && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }

        function getTextFromNode(node) {
          let text = '';
          if (!node) return text;

          if (node.nodeType === Node.ELEMENT_NODE) {
            if (!isVisible(node)) return '';
            if (ignoreTags.includes(node.tagName)) return '';
            
            if (allowedTags.includes(node.tagName)) {
              const t = (node.innerText || node.textContent || '').trim();
              if (t) text += t + '\n';
            }
          }

          node.childNodes.forEach(child => text += getTextFromNode(child));
          return text;
        }

        return getTextFromNode(document.body);
      }
    });

    return result[0]?.result || '';
  } catch (err) {
    console.error("Erreur récupération texte page:", err);
    return '';
  }
}

// ------------------------------
// Enregistrement audio
// ------------------------------
async function startRecording(micBtn) {
  if (recording) return;
  recording = true;
  micBtn.textContent = "⏹ Stop";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      micBtn.textContent = "🎤 Speak";
      recording = false;

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const userQuestion = await transcribeAudioGCP(audioBlob);
      console.log("Texte micro :", userQuestion);

      const pageText = await getPageText();

      const summary = await summarizeText(pageText, userQuestion);
      await speakResponse(summary);
    };

    mediaRecorder.start();
    console.log("Enregistrement micro démarré...");
  } catch (err) {
    console.error("Erreur accès micro :", err);
    recording = false;
    micBtn.textContent = "🎤 Speak";
  }
}

function stopRecording() {
  if (!recording || !mediaRecorder) return;
  mediaRecorder.stop();
}

// ------------------------------
// Transcription Google Cloud Speech-to-Text
// ------------------------------
async function transcribeAudioGCP(audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBytes = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const body = {
    config: { encoding: "WEBM_OPUS", sampleRateHertz: 48000, languageCode: "en-US" },
    audio: { content: audioBytes }
  };

  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${GCloud_TTS_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!response.ok) {
    console.error("Erreur transcription GCP :", await response.text());
    return '';
  }

  const data = await response.json();
  if (data.results && data.results[0]) return data.results[0].alternatives[0].transcript || '';
  return '';
}

// ------------------------------
// Résumé via LanguageModel
// ------------------------------
async function summarizeText(webText, userQuestion) {
  try {
    if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
      console.warn("Prompt API not available");
      return webText;
    }

    const MAX_INPUT_LENGTH = 10000;
    if (webText.length > MAX_INPUT_LENGTH) webText = webText.substring(0, MAX_INPUT_LENGTH);

    const availability = await LanguageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });

    if (availability === "unavailable") return text;

    const session = await LanguageModel.create({
      monitor(m) { m.addEventListener('downloadprogress', e => console.log(`Prompt API download: ${Math.round(e.loaded*100)}%`)); },
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });

    const stylePrompts = {
      friendly: `
        Respond in a warm and friendly tone.
        Write as if you were explaining it naturally to a friend over coffee.
        Use clear, conversational language with short, easy-to-follow sentences.
      `,
      casual: `
        Respond in a relaxed and informal way.
        Use everyday English, simple words, and a smooth flow — like telling a story.
        Avoid robotic or academic phrasing.
      `,
      formal: `
        Provide a concise and professional answer.
        Maintain a neutral and informative tone, as if writing a corporate report.
        Ensure logical structure, clarity, and smooth transitions between sentences.
      `,
      funny: `
        Respond in a light and humorous way.
        Include mild jokes, wordplay, or witty remarks while keeping the meaning accurate.
        Keep it entertaining but not exaggerated or distracting.
      `
    };

    const prompt = `
      You are a natural-sounding AI Web agent. Answer the following question clearly and naturally: ${userQuestion}.
      ${stylePrompts[selectedPromptStyle]}

      Base your answer strictly on the information provided below. Do not add, assume, or invent anything beyond what is given.

      Text from the web page:
      """${webText}"""
    `;

    console.log(webText);

    let currentTime = Date.now();
    const summary = await session.prompt(prompt);
    timePromptToTTS = Date.now();
    console.log(`LLM Latency: ${Date.now() - currentTime} ms`);
    return summary || text;
  } catch (err) {
    console.error("Error using Prompt API:", err);
    return text;
  }
}

// ------------------------------
// Text-to-Speech Google TTS
// ------------------------------
async function speakResponse(text) {
  if (!text?.trim()) return;
  loader.style.display = "block";

  try {
    if (!GCloud_TTS_API_KEY) { console.error("Missing GCloud_TTS_API_KEY"); loader.style.display = "none"; return; }

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
// Initialisation du DOM après chargement
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("micBtn");
  const stopBtn = document.getElementById("stopBtn");
  loader = document.getElementById("loader");

  // Options voix / style
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

  selectedVoice = voices[0].name;
  selectedPromptStyle = promptStyles[0].name;

  createOptions("voiceOptions", voices, "voice");
  createOptions("styleOptions", promptStyles, "style");

  micBtn.addEventListener("click", () => {
    if (!recording) startRecording(micBtn);
    else stopRecording();
  });

  stopBtn.addEventListener("click", stopRecording);

  // Settings toggle
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsContent = document.querySelector(".settings-content");
  const arrow = document.getElementById("arrow");

  settingsToggle.addEventListener("click", () => {
    settingsContent.classList.toggle("collapsed");
    arrow.style.transform = settingsContent.classList.contains("collapsed") ? "rotate(-45deg)" : "rotate(135deg)";
  });
});
