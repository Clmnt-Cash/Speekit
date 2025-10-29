import { GCloud_TTS_API_KEY, VOICES, PROMPT_STYLES, STYLE_PROMPTS } from './config.js';
import { startRecording, stopRecording, isRecording } from './microphone.js';
import { transcribeAudio, synthesizeSpeech } from './speech.js';
import { getPageText, summarizeText } from './textTreatment.js';
import { findRelevantContent, findRelevantContentComparison } from './textFiltering.js';
import { initUI, createOptions, playAudio, stopAudio, showProcessingIndicator, hideProcessingIndicator, resetUI } from './ui.js';

// Variables globales
let selectedVoice = VOICES[0].name;
let selectedPromptStyle = PROMPT_STYLES[0].name;

// ------------------------------
// ✅ FONCTION CALLBACK - VERSION DEBUG
// ------------------------------
async function processAudio(recordedBlob, duration) {
  console.log("\n" + "=".repeat(60));
  console.log("🎬 [popup.js] processAudio appelé");
  console.log("=".repeat(60));
  console.log(`📊 Paramètres reçus:`);
  console.log(`   - Blob size: ${recordedBlob.size} bytes`);
  console.log(`   - Blob type: ${recordedBlob.type}`);
  console.log(`   - Duration: ${duration}ms`);

  try {
    // ========== ÉTAPE 1 : Vérification Blob ==========
    console.log("\n📦 ÉTAPE 1 : Vérification Audio Blob");
    console.log("─".repeat(60));

    if (!recordedBlob) {
      throw new Error("recordedBlob est undefined");
    }

    if (recordedBlob.size === 0) {
      throw new Error("recordedBlob est vide (0 bytes)");
    }

    console.log(`✅ Blob valide : ${recordedBlob.size} bytes`);

    // ========== ÉTAPE 2 : Transcription STT ==========
    console.log("\n🎙️ ÉTAPE 2 : Transcription STT");
    console.log("─".repeat(60));
    const startSTT = performance.now();
    
    showProcessingIndicator();
    const userQuestion = await transcribeAudio(recordedBlob);

    const durationSTT = (performance.now() - startSTT).toFixed(0);
    console.log(`✅ Transcription terminée en ${durationSTT}ms`);
    console.log(`   Texte : "${userQuestion}"`);

    if (!userQuestion || userQuestion.trim() === '') {
      console.error("❌ Transcription vide");
      alert("No speech detected. Please try again.");
      return;
    }

    // ========== ÉTAPE 3 : Extraction texte ==========
    // console.log("\n📄 ÉTAPE 3 : Extraction texte page");
    // console.log("─".repeat(60));
    // const startExtract = performance.now();

    // const pageText = await getPageText();

    // const durationExtract = (performance.now() - startExtract).toFixed(0);
    // console.log(`✅ Extraction terminée en ${durationExtract}ms`);
    // console.log(`   Longueur : ${pageText.length} caractères`);
    // console.log(`   Aperçu : "${pageText.substring(0, 100)}..."`);
    console.log("\n📄 ÉTAPE 3 : Extraction du texte de la page");
    console.log("─".repeat(60));
    const startExtract = performance.now();

    let pageText = await getPageText();

    // ✅ FALLBACK si extraction vide
    if (!pageText || pageText.trim().length < 100) {
      console.warn("   ⚠️ Extraction principale a échoué, essai méthode simple...");
      
      // Importer la méthode simple
      const { getPageTextSimple } = await import('./textTreatment.js');
      pageText = await getPageTextSimple();
      
      if (!pageText || pageText.trim().length < 100) {
        console.error("   ❌ Les deux méthodes ont échoué !");
        alert("Could not extract text from page.");
        return;
      }
      
      console.log("   ✅ Méthode simple a réussi !");
    }

    const durationExtract = (performance.now() - startExtract).toFixed(0);
    console.log(`✅ Extraction: ${pageText.length} chars (${durationExtract}ms)`);
    console.log(`   Aperçu : "${pageText.substring(0, 100)}..."`);

        // ========== ÉTAPE 3.5 : Filtrage intelligent ==========
    console.log("\n🎯 ÉTAPE 3.5 : Filtrage du contenu pertinent");
    console.log("─".repeat(60));
    const startFilter = performance.now();

    const relevantText = findRelevantContent(pageText, userQuestion, 1500);
    // const relevantText = findRelevantContentComparison(pageText, userQuestion, 1500);

    const durationFilter = (performance.now() - startFilter).toFixed(0);
    const reductionPercent = ((1 - relevantText.length / pageText.length) * 100).toFixed(1);
    console.log(`✅ Filtrage terminé en ${durationFilter}ms`);
    console.log(`   Longueur avant : ${pageText.length} chars`);
    console.log(`   Longueur après : ${relevantText.length} chars`);
    console.log(`   Réduction : ${reductionPercent}%`);
    console.log(`   Aperçu filtré : "${relevantText.substring(0, 500)}..."`);

    // ========== ÉTAPE 4 : LLM ==========
    console.log("\n🤖 ÉTAPE 4 : Génération réponse LLM");
    console.log("─".repeat(60));
    const startLLM = performance.now();

    const summary = await summarizeText(relevantText, userQuestion, STYLE_PROMPTS, selectedPromptStyle);

    const durationLLM = (performance.now() - startLLM).toFixed(0);
    console.log(`✅ Réponse LLM en ${durationLLM}ms`);
    console.log(`   Longueur : ${summary.length} caractères`);

    if (!summary || summary.trim() === '') {
      console.error("❌ Réponse LLM vide");
      alert("Could not generate a response.");
      return;
    }

    // ========== ÉTAPE 5 : TTS ==========
    console.log("\n🔊 ÉTAPE 5 : Text-to-Speech");
    console.log("─".repeat(60));

    const startTTS = performance.now();

    const ttsBlob = await synthesizeSpeech(summary, selectedVoice);
    await playAudio(ttsBlob);

    const durationTTS = (performance.now() - startTTS).toFixed(0);
    console.log(`✅ TTS terminé en ${durationTTS}ms`);

    // ========== RÉSUMÉ ==========
    console.log("\n" + "=".repeat(60));
    console.log("🎉 TRAITEMENT TERMINÉ");
    console.log("=".repeat(60));
    console.log("⏱️  Temps total :");
    console.log(`   STT      : ${durationSTT}ms`);
    console.log(`   Extract  : ${durationExtract}ms`);
    console.log(`   Filter   : ${durationFilter}ms`);
    console.log(`   LLM      : ${durationLLM}ms`);
    console.log(`   TTS      : ${durationTTS}ms`);
    const totalTime = parseFloat(durationSTT) + parseFloat(durationExtract) + 
                      parseFloat(durationFilter) + parseFloat(durationLLM) + 
                      parseFloat(durationTTS);
    console.log(`   TOTAL    : ${totalTime.toFixed(0)}ms`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.log("\n" + "!".repeat(60));
    console.error("❌ ERREUR CRITIQUE");
    console.log("!".repeat(60));
    console.error("Type :", error.name);
    console.error("Message :", error.message);
    console.error("Stack :", error.stack);
    console.log("!".repeat(60) + "\n");

    hideProcessingIndicator();
    resetUI();
    alert(`Error: ${error.message}`);
  }
}

// ------------------------------
// Gestion boutons
// ------------------------------
async function handleMicButton(micBtn) {
  console.log("🎤 [popup.js] Bouton micro cliqué");

  if (!isRecording()) {
    console.log("▶️ Démarrage enregistrement...");
    micBtn.textContent = "⏹ Stop";

    try {
      // ✅ Passer processAudio comme callback
      console.log("📞 Appel startRecording avec callback processAudio");
      await startRecording(processAudio);
      console.log("✅ startRecording appelé avec succès");
    } catch (err) {
      console.error("❌ Erreur startRecording:", err);
      micBtn.textContent = "🎤 Speak";
      alert("Microphone access denied");
    }
  } else {
    console.log("⏹️ Arrêt enregistrement...");
    stopRecording();
    micBtn.textContent = "🎤 Speak";
  }
}

function handleStopButton() {
  console.log("⏹️ [popup.js] Bouton stop cliqué");
  stopRecording();
  stopAudio();
  resetUI();  // Reset all UI elements
}

function handleOptionSelect(value, type) {
  if (type === "voice") {
    selectedVoice = value;
    console.log("✅ Voice sélectionnée:", value);
  } else {
    selectedPromptStyle = value;
    console.log("✅ Style sélectionné:", value);
  }
}

// ------------------------------
// Initialisation
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 [popup.js] DOMContentLoaded");

  const micBtn = document.getElementById("micBtn");
  const stopBtn = document.getElementById("stopBtn");

  console.log("📦 Elements trouvés:", {
    micBtn: !!micBtn,
    stopBtn: !!stopBtn
  });

  // Initialiser UI
  initUI();

  // Créer options
  createOptions("voiceOptions", VOICES, "voice", handleOptionSelect);
  createOptions("styleOptions", PROMPT_STYLES, "style", handleOptionSelect);

  // Event listeners
  micBtn.addEventListener("click", () => handleMicButton(micBtn));
  stopBtn.addEventListener("click", handleStopButton);

  // Settings toggle
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsContent = document.querySelector(".settings-content");
  const arrow = document.getElementById("arrow");

  if (settingsToggle && settingsContent && arrow) {
    settingsToggle.addEventListener("click", () => {
      settingsContent.classList.toggle("collapsed");
      arrow.style.transform = settingsContent.classList.contains("collapsed")
        ? "rotate(-45deg)"
        : "rotate(135deg)";
    });
  }

  console.log("✅ Extension initialisée");
});