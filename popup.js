const readBtn = document.getElementById("readPage");
const stopBtn = document.getElementById("stop");
import { GCloud_TTS_API_KEY } from './config.js';

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
// 2. Summarize with Chrome Summarizer API (Gemini Nano)
// ------------------------------
async function summarizeText(text) {
  try {
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      console.warn("Summarizer API is not available on this Chrome.");
      return text;
    }

    // ✅ Limit input length (e.g., 10,000 characters)
    const MAX_INPUT_LENGTH = 10000;
    if (text.length > MAX_INPUT_LENGTH) {
      console.warn(`Input text too long (${text.length}). Truncating to ${MAX_INPUT_LENGTH} characters.`);
      text = text.substring(0, MAX_INPUT_LENGTH);
    }

    const options = {
      type: 'tldr',           // short TL;DR summary
      format: 'plain-text',   // plain text output
      length: 'medium',       // medium length
      outputLanguage: 'en',   // 🔑 only en, es, ja supported
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          console.log(`Model download: ${Math.round(e.loaded * 100)}%`);
        });
      }
    };

    if (!navigator.userActivation.isActive) {
      console.warn("Summarizer.create() must be called after a user action.");
      return text;
    }

    const summarizer = await Summarizer.create(options);
    const summary = await summarizer.summarize(text);

    return summary || text;
  } catch (err) {
    console.error("Error while summarizing:", err);
    return text;
  }
}

// ------------------------------
// 3. Text-to-Speech with Chrome TTS
// ------------------------------
function speakText(text) {
  if (!text || typeof text !== "string") {
    console.warn("No valid text to speak.");
    return;
  }

  chrome.tts.speak(
    text,
    {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      lang: "en-US"   // langue de voix
    }
  );
}

function stopText() {
  chrome.tts.stop();
}

async function speakResponse(text) {
  try {
    if (!text || typeof text !== "string" || text.trim() === "") {
      console.warn("No valid text to speak.");
      return;
    }

    if (!GCloud_TTS_API_KEY) {
      console.error("Missing GCloud_TTS_API_KEY. Please set it in config.js");
      return;
    }

    // Prépare la requête Google TTS
    const requestBody = {
      input: { text },
      voice: {
        languageCode: "en-GB",        // Langue
        name: "en-GB-Neural2-B",      // Voix
      },
      audioConfig: {
        audioEncoding: "MP3",         // Format audio
        speakingRate: 1.0,            // vitesse
        pitch: 0.0                    // ton neutre
      }
    };

    // 📡 Appel API Google Cloud
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCloud_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Google TTS API error: ${err}`);
    }

    // 🎵 Lecture audio
    const data = await response.json();
    const audioContent = data.audioContent;
    const audioBlob = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], {
      type: "audio/mp3"
    });

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    // Sauvegarde pour stopSpeech()
    window.currentAudio = audio;
  } catch (error) {
    console.error("Error during Google Cloud TTS playback:", error);
  }
}

function stopSpeech() {
  if (window.currentAudio) {
    window.currentAudio.pause();
    window.currentAudio.currentTime = 0;
    window.currentAudio = null;
  }
}

// ------------------------------
// 4. Button handlers
// ------------------------------
readBtn.addEventListener("click", async () => {
  const pageText = await getReadableText();
  console.log("Extracted text length:", pageText.length);
  const summary = await summarizeText(pageText);
  // speakText(summary);
  // Or use OpenAI TTS:
  speakResponse(summary);
});

stopBtn.addEventListener("click", () => {
  // stopText();
  stopSpeech();
});
