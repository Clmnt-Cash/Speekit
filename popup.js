import { GCloud_TTS_API_KEY, VOICES, PROMPT_STYLES, STYLE_PROMPTS } from './config.js';
import { startRecording, stopRecording, isRecording } from './microphone.js';
import { transcribeAudio, synthesizeSpeech } from './speech.js';
import { getPageText, summarizeText } from './textTreatment.js';
import { findRelevantContent } from './textFiltering.js';
import { initUI, createOptions, playAudio, stopAudio, showProcessingIndicator, hideProcessingIndicator, resetUI } from './ui.js';

// global variables
let selectedVoice = VOICES[0].name;
let selectedPromptStyle = PROMPT_STYLES[0].name;

// ------------------------------
// ✅ FONCTION CALLBACK - VERSION DEBUG
// ------------------------------
async function processAudio(recordedBlob, duration) {
  console.log("\n" + "=".repeat(60));
  console.log("🎬 [popup.js] processAudio called");
  console.log("=".repeat(60));
  console.log(`📊 Parameters received:`);
  console.log(`   - Blob size: ${recordedBlob.size} bytes`);
  console.log(`   - Blob type: ${recordedBlob.type}`);
  console.log(`   - Duration: ${duration}ms`);

  try {
    // ========== STEP 1 : Vérification Blob ==========
    console.log("\n📦 STEP 1 : Vérification Audio Blob");
    console.log("─".repeat(60));

    if (!recordedBlob) {
      throw new Error("recordedBlob is undefined");
    }

    if (recordedBlob.size === 0) {
      throw new Error("recordedBlob is empty (0 bytes)");
    }

    console.log(`✅ Blob valid: ${recordedBlob.size} bytes`);

    // ========== STEP 2 : Transcription STT ==========
    console.log("\n🎙️ STEP 2 : Transcription STT");
    console.log("─".repeat(60));
    const startSTT = performance.now();
    
    showProcessingIndicator();
    const userQuestion = await transcribeAudio(recordedBlob);

    const durationSTT = (performance.now() - startSTT).toFixed(0);
    console.log(`✅ Transcription ended in ${durationSTT}ms`);
    console.log(`   Text: "${userQuestion}"`);

    if (!userQuestion || userQuestion.trim() === '') {
      console.error("❌ Transcription empty");
      alert("No speech detected. Please try again.");
      return;
    }
    // ========== STEP 3 : Extraction of text from page ==========
    console.log("\n📄 STEP 3 : Extraction of text from page");
    console.log("─".repeat(60));
    const startExtract = performance.now();

    let pageText = await getPageText();

    // ✅ FALLBACK if extraction empty
    if (!pageText || pageText.trim().length < 100) {
      console.warn("   ⚠️ Main extraction failed, trying simple method...");
      
      // Import the simple method
      const { getPageTextSimple } = await import('./textTreatment.js');
      pageText = await getPageTextSimple();
      
      if (!pageText || pageText.trim().length < 100) {
        console.error("   ❌ Both methods failed!");
        alert("Could not extract text from page.");
        return;
      }

      console.log("   ✅ Simple method succeeded!");
    }

    const durationExtract = (performance.now() - startExtract).toFixed(0);
    console.log(`✅ Extraction: ${pageText.length} chars (${durationExtract}ms)`);
    console.log(`   Preview: "${pageText.substring(0, 100)}..."`);

    // ========== STEP 3.5 : Intelligent Filtering ==========
    console.log("\n🎯 STEP 3.5 : Filtering Relevant Content");
    console.log("─".repeat(60));
    const startFilter = performance.now();

    let relevantText = findRelevantContent(pageText, userQuestion, 1500);

    const durationFilter = (performance.now() - startFilter).toFixed(0);
    const reductionPercent = ((1 - relevantText.length / pageText.length) * 100).toFixed(1);
    console.log(`✅ Filtering completed in ${durationFilter}ms`);
    console.log(`   Length before: ${pageText.length} chars`);
    console.log(`   Length after: ${relevantText.length} chars`);
    console.log(`   Reduction: ${reductionPercent}%`);
    console.log(`   Preview: "${relevantText.substring(0, 100)}..."`);

    // ========== STEP 4 : LLM ==========
    console.log("\n🤖 STEP 4 : Generating LLM Response");
    console.log("─".repeat(60));
    const startLLM = performance.now();

    if (relevantText.length == 0) {
      relevantText = pageText;
    }

    const summary = await summarizeText(relevantText, userQuestion, STYLE_PROMPTS, selectedPromptStyle);

    const durationLLM = (performance.now() - startLLM).toFixed(0);
    console.log(`✅ LLM Response generated in ${durationLLM}ms`);
    console.log(`   Length: ${summary.length} characters`);

    if (!summary || summary.trim() === '') {
      console.error("❌ LLM Response is empty");
      alert("Could not generate a response.");
      return;
    }

    // ========== STEP 5 : TTS ==========
    console.log("\n🔊 STEP 5 : Text-to-Speech");
    console.log("─".repeat(60));

    const startTTS = performance.now();

    const ttsBlob = await synthesizeSpeech(summary, selectedVoice);
    await playAudio(ttsBlob);

    const durationTTS = (performance.now() - startTTS).toFixed(0);
    console.log(`✅ TTS completed in ${durationTTS}ms`);

    // ========== SUMMARY ==========
    console.log("\n" + "=".repeat(60));
    console.log("🎉 PROCESSING COMPLETED");
    console.log("=".repeat(60));
    console.log("⏱️  Total Time:");
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
    console.error("❌ CRITICAL ERROR");
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
// Button Management
// ------------------------------
async function handleMicButton(micBtn) {
  console.log("🎤 [popup.js] Microphone button clicked");

  if (!isRecording()) {
    console.log("▶️ Starting recording...");
    micBtn.textContent = "⏹ Stop Recording";

    try {
      // ✅ Passer processAudio comme callback
      console.log("📞 Calling startRecording with callback processAudio");
      await startRecording(processAudio);
      console.log("✅ startRecording called successfully");
    } catch (err) {
      console.error("❌ startRecording error:", err);
      micBtn.textContent = "▶ Speak";
      alert("Microphone access denied");
    }
  } else {
    console.log("⏹️ Stopping recording...");
    stopRecording();
    micBtn.textContent = "▶ Speak";
  }
}

function handleStopButton() {
  console.log("⏹️ [popup.js] Stop button clicked");
  stopRecording();
  stopAudio();
  resetUI();  // Reset all UI elements
}

function handleOptionSelect(value, type) {
  if (type === "voice") {
    selectedVoice = value;
    console.log("✅ Voice selected:", value);
  } else {
    selectedPromptStyle = value;
    console.log("✅ Style selected:", value);
  }
}

// ------------------------------
// Initialisation
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 [popup.js] DOMContentLoaded");

  const micBtn = document.getElementById("micBtn");
  const stopBtn = document.getElementById("stopBtn");

  console.log("📦 Elements found:", {
    micBtn: !!micBtn,
    stopBtn: !!stopBtn
  });

  // Initialiser UI
  initUI();

  // Create options
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

  console.log("✅ Extension initialised");
});