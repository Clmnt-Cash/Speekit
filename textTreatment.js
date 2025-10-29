export async function getPageText() {
  try {
    console.log("   🔍 Extraction texte de la page...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractCleanTextDebug
    });

    let text = result[0]?.result || '';
    console.log(`   📊 Texte brut extrait: ${text.length} caractères`);
    console.log(`   Aperçu brut: "${text.substring(0, 200)}..."`);

    if (text.length === 0) {
      console.error("   ❌ Aucun texte extrait de la page !");
      return '';
    }
    
    // Nettoyage léger côté popup
    text = lightCleanup(text);
    console.log(`   ✅ Après nettoyage léger: ${text.length} caractères`);
    console.log(`   Aperçu nettoyé: "${text.substring(0, 200)}..."`);
    
    return text;

  } catch (err) {
    console.error("❌ Erreur récupération texte page:", err);
    console.error("   Stack:", err.stack);
    throw err;
  }
}

function extractCleanTextDebug() {
  console.log("[PAGE] Début extraction...");
  
  // Tags de contenu
  const contentTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'ARTICLE', 'SECTION'];
  
  // Tags à ignorer
  const ignoreTags = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];

  // Sélecteurs à ignorer (version SIMPLIFIÉE)
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
    // Ignorer par tag
    if (ignoreTags.includes(el.tagName)) {
      return true;
    }
    
    // Ignorer par sélecteur (SIMPLIFIÉ - juste matches, pas closest)
    for (const selector of ignoreSelectors) {
      try {
        if (el.matches && el.matches(selector)) {
          return true;
        }
      } catch (e) {}
    }
    
    return false;
  }

  // Trouver le contenu principal
  let mainElement = 
    document.querySelector('main') ||
    document.querySelector('article') ||
    document.querySelector('[role="main"]');

  console.log("[PAGE] Main element:", mainElement ? mainElement.tagName : 'null');

  // Si pas de main, utiliser body
  if (!mainElement) {
    console.log("[PAGE] Pas de main, utilisation de body");
    mainElement = document.body;
  }

  // Collecter les éléments
  const selector = contentTags.map(t => t.toLowerCase()).join(',');
  console.log("[PAGE] Sélecteur:", selector);
  
  const elements = mainElement.querySelectorAll(selector);
  console.log("[PAGE] Éléments trouvés:", elements.length);

  let extractedText = '';
  let validElements = 0;
  let ignoredInvisible = 0;
  let ignoredBySelector = 0;
  let ignoredTooShort = 0;

  elements.forEach((el, index) => {
    // Debug pour les 5 premiers éléments
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

  console.log("[PAGE] Statistiques:");
  console.log(`  - Éléments valides: ${validElements}`);
  console.log(`  - Ignorés (invisibles): ${ignoredInvisible}`);
  console.log(`  - Ignorés (sélecteurs): ${ignoredBySelector}`);
  console.log(`  - Ignorés (trop courts): ${ignoredTooShort}`);
  console.log(`  - Texte extrait: ${extractedText.length} chars`);

  // Nettoyage minimal
  const cleaned = extractedText
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  console.log("[PAGE] Après nettoyage:", cleaned.length, "chars");
  
  return cleaned;
}

// ------------------------------
// ✅ Nettoyage final côté popup
// ------------------------------
function lightCleanup(text) {
  console.log("   🧹 Nettoyage léger...");
  
  // Seulement les patterns les plus évidents
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

  // Nettoyer espaces
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

export async function getPageTextSimple() {
  try {
    console.log("   🔍 Extraction SIMPLE...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Version ultra-basique : juste les paragraphes
        const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3'));
        
        return paragraphs
          .map(p => p.textContent.trim())
          .filter(text => text.length > 30)
          .join('\n\n');
      }
    });

    const text = result[0]?.result || '';
    console.log(`   ✅ Texte simple extrait: ${text.length} chars`);
    
    return text;

  } catch (err) {
    console.error("❌ Erreur extraction simple:", err);
    return '';
  }
}

// Fonction exécutée dans le contexte de la page
function extractTextFromPage() {
    const allowedTags = ['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'FIGCAPTION'];
    const ignoreTags = ['HEADER', 'FOOTER', 'NAV', 'ASIDE', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK'];

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
                const t = (node.textContent || '').trim();  // ✅ textContent au lieu de innerText
                if (t) text += t + '\n';
            }
        }

        node.childNodes.forEach(child => text += getTextFromNode(child));

        return text
            .replace(/\s{2,}/g, ' ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    return getTextFromNode(document.body);
}

// ------------------------------
// Résumé via LLM
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
            console.warn(`   ⚠️ Input LLM trop long: ${webText.length} → ${MAX_INPUT} chars`);
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
            console.error(`   ❌ ATTENTION: Output encore trop long (${outputBytes} bytes)`);
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