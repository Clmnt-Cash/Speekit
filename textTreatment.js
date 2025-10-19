// ------------------------------
// Extraction du texte de la page
// ------------------------------
export async function getPageText() {
    try {
        console.log("   🔍 Extraction texte de la page...");

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractTextFromPage
        });

        let text = result[0]?.result || '';
        console.log(`   📊 Texte brut extrait: ${text.length} caractères`);

        // ✅ LIMITATION STRICTE : 1500 caractères MAX
        const MAX_CHARS = 1500;
        if (text.length > MAX_CHARS) {
            console.warn(`   ⚠️ TRONCATURE: ${text.length} → ${MAX_CHARS} chars`);

            // Tronquer par phrases pour garder du sens
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
            let truncated = '';

            for (const sentence of sentences) {
                if (truncated.length + sentence.length > MAX_CHARS) break;
                truncated += sentence;
            }

            // Si aucune phrase complète, couper brutalement
            if (truncated.length < 100) {
                truncated = text.substring(0, MAX_CHARS);
            }

            text = truncated;
        }

        console.log(`   ✅ Texte final: ${text.length} caractères`);
        return text;

    } catch (err) {
        console.error("❌ Erreur récupération texte page:", err);
        throw err;
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
        const prompt = `You are a natural-sounding AI Web agent. Answer the following question clearly and naturally: ${userQuestion}.
        ${stylePrompts[selectedStyle]}

        CRITICAL: Your answer MUST be under 400 words (maximum 2500 characters) because it will be spoken aloud.
        Be concise, direct, and avoid long explanations.

        Base your answer strictly on the information provided below. Do not add, assume, or invent anything beyond what is given.

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