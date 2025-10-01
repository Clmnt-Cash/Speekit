const readBtn = document.getElementById("readPage");
const stopBtn = document.getElementById("stop");

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
      lang: "en-US"   // ✅ English voice
    }
  );
}

function stopText() {
  chrome.tts.stop();
}

// ------------------------------
// 4. Button handlers
// ------------------------------
readBtn.addEventListener("click", async () => {
  const pageText = await getReadableText();
  console.log("Extracted text length:", pageText.length);
  const summary = await summarizeText(pageText);
  speakText(summary);
});

stopBtn.addEventListener("click", () => {
  stopText();
});
