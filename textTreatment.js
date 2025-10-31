export async function getPageText() {
  try {
    console.log("   🔍 Extraction texte de la page...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractCleanTextDebug
    });

    let text = result[0]?.result || '';

    if (text.length === 0) {
      console.error("   ❌ Aucun texte extrait de la page !");
      return '';
    }
    
    // Cleanup léger
    text = lightCleanup(text);
    console.log(`   ✅ Après nettoyage léger: ${text.length} caractères`);
    
    return text;

  } catch (err) {
    console.error("❌ Erreur récupération texte page:", err);
    console.error("   Stack:", err.stack);
    throw err;
  }
}

function extractCleanTextDebug() {
  console.log("[PAGE] Début extraction...");
  
  // Tags to include as content
  const contentTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'ARTICLE', 'SECTION'];

  // Tags to ignore
  const ignoreTags = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];

  // Selectors to ignore
  const ignoreSelectors = [
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
    '.toc', '#toc', '.navigation', '.menu'
  ];

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function shouldIgnore(el) {
    // Ignore by tag
    if (ignoreTags.includes(el.tagName)) {
      return true;
    }

    // Ignore by selector (SIMPLIFIED - just matches, not closest)
    for (const selector of ignoreSelectors) {
      try {
        if (el.matches && el.matches(selector)) {
          return true;
        }
      } catch (e) {}
    }
    
    return false;
  }

  // Finding main content area
  let mainElement = 
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]');

  console.log("[PAGE] Main element:", mainElement ? mainElement.tagName : 'null');

  // If no main, use body
  if (!mainElement) {
    console.log("[PAGE] Pas de main, utilisation de body");
    mainElement = document.body;
  }

  // Collect elements
  const selector = contentTags.map(t => t.toLowerCase()).join(',');
  console.log("[PAGE] Selector:", selector);

  const elements = mainElement.querySelectorAll(selector);
  console.log("[PAGE] Elements found:", elements.length);

  let extractedText = '';
  let validElements = 0;
  let ignoredInvisible = 0;
  let ignoredBySelector = 0;
  let ignoredTooShort = 0;

  elements.forEach((el, index) => {
    // Debug for the first 5 elements
    if (index < 5) {
      console.log(`[PAGE] Element ${index}:`, el.tagName, el.textContent.substring(0, 50));
    }
    
    if (!isVisible(el)) {
      ignoredInvisible++;
      return;
    }
    
    if (shouldIgnore(el)) {
      ignoredBySelector++;
      return;
    }
    
    const text = (el.textContent || '').trim();
    
    if (text.length < 20) {
      ignoredTooShort++;
      return;
    }
    
    validElements++;
    extractedText += text + '\n\n';
  });

  console.log("[PAGE] Statistics:");
  console.log(`  - Valid elements: ${validElements}`);
  console.log(`  - Ignored (invisible): ${ignoredInvisible}`);
  console.log(`  - Ignored (selectors): ${ignoredBySelector}`);
  console.log(`  - Ignored (too short): ${ignoredTooShort}`);
  console.log(`  - Extracted text: ${extractedText.length} chars`);

  // Minimal cleanup
  const cleaned = extractedText
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  console.log("[PAGE] After cleanup:", cleaned.length, "chars");
  
  return cleaned;
}

// ------------------------------
// ✅ Final cleanup for popup
// ------------------------------
function lightCleanup(text) {
  console.log("   🧹 Light cleanup...");
  
  // Only the most obvious patterns
  const simplePatterns = [
    /Main menu/gi,
    /Personal tools/gi,
    /Contents hide/gi,
    /Toggle .+ subsection/gi,
    /\[\d+\]/g,  // Références [1], [2]
  ];

  let cleaned = text;
  
  for (const pattern of simplePatterns) {
    const before = cleaned.length;
    cleaned = cleaned.replace(pattern, '');
    const removed = before - cleaned.length;
    if (removed > 0) {
      console.log(`     - Pattern ${pattern} supprimé: ${removed} chars`);
    }
  }

  // Clean up spaces and newlines
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

export async function getPageTextSimple() {
  try {
    console.log("   🔍 Easy extraction...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Really simple extraction: just paragraphs and headers
        const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3'));
        
        return paragraphs
          .map(p => p.textContent.trim())
          .filter(text => text.length > 30)
          .join('\n\n');
      }
    });

    const text = result[0]?.result || '';
    console.log(`   ✅ Easy extracted text: ${text.length} chars`);
    
    return text;

  } catch (err) {
    console.error("❌ Error during easy extraction:", err);
    return '';
  }
}

// ------------------------------
// Summary via LLM
// ------------------------------
export async function summarizeText(webText, userQuestion, stylePrompts, selectedStyle) {
    try {
        console.log("   🤖 Appel au LLM...");

        if (typeof LanguageModel === "undefined" || !LanguageModel.availability) {
            console.warn("⚠️ Prompt API not available");
            return webText;
        }

        // ✅ DOUBLE VÉRIFICATION : Limiter l'input
        const MAX_INPUT = 1500;
        if (webText.length > MAX_INPUT) {
            console.warn(`   ⚠️ Input LLM too long: ${webText.length} → ${MAX_INPUT} chars`);
            webText = webText.substring(0, MAX_INPUT);
        }

        const inputBytes = new TextEncoder().encode(webText).length;
        console.log(`   📊 Input LLM: ${webText.length} chars, ${inputBytes} bytes`);

        const availability = await LanguageModel.availability({
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }]
        });

        if (availability === "unavailable") {
            console.warn("⚠️ LLM unavailable");
            return webText;
        }

        const session = await LanguageModel.create({
            monitor(m) {
                m.addEventListener('downloadprogress', e => {
                    console.log(`   📥 LLM download: ${Math.round(e.loaded * 100)}%`);
                });
            },
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }]
        });

        // ✅ PROMPT OPTIMISÉ pour réponse courte
        const prompt = `You are a natural-sounding AI Web agent. Answer the following question clearly, naturally and briefly: ${userQuestion}.
        ${stylePrompts[selectedStyle]}

        CRITICAL: Your answer MUST be under 400 words (maximum 2500 characters) because it will be spoken aloud.
        Be concise, direct, and avoid long explanations. Avoid smiley.

        Base your answer strictly on the information from the web page provided below. Do not add, assume, or invent anything beyond what is given.
        If the information you are looking for aren't in the website text then say than you can't find any information relating to the user question.

        Text from the web page:
        """${webText}"""`;

        console.log(`   📝 Prompt: ${prompt.length} chars`);

        const startTime = Date.now();
        const summary = await session.prompt(prompt);
        const latency = Date.now() - startTime;

        console.log(`   ⚡ LLM Latency: ${latency}ms`);

        // ✅ LIMITATION OUTPUT pour TTS
        let finalSummary = summary || webText;
        const MAX_OUTPUT = 2500;  // ~4000 bytes max pour TTS

        if (finalSummary.length > MAX_OUTPUT) {
            console.warn(`   ⚠️ Output trop long: ${finalSummary.length} → ${MAX_OUTPUT} chars`);

            // Tronquer par phrases
            const sentences = finalSummary.match(/[^.!?]+[.!?]+/g) || [];
            let truncated = '';

            for (const sentence of sentences) {
                if (truncated.length + sentence.length > MAX_OUTPUT - 50) break;
                truncated += sentence;
            }

            finalSummary = truncated || finalSummary.substring(0, MAX_OUTPUT);
        }

        const outputBytes = new TextEncoder().encode(finalSummary).length;
        console.log(`   ✅ Output final: ${finalSummary.length} chars, ${outputBytes} bytes`);

        // ✅ Vérification finale
        if (outputBytes > 4800) {
            console.error(`   ❌ ATTENTION: Output still long (${outputBytes} bytes)`);
            // Dernière troncature brutale
            while (new TextEncoder().encode(finalSummary).length > 4500) {
                finalSummary = finalSummary.substring(0, finalSummary.length - 100);
            }
            console.warn(`   ✂️ Troncature finale: ${new TextEncoder().encode(finalSummary).length} bytes`);
        }

        return finalSummary;

    } catch (err) {
        console.error("❌ Error using Prompt API:", err);
        return webText;
    }
}