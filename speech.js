import { GCloud_TTS_API_KEY } from './config.js';
import { updateTranscriptionText } from './ui.js';

// ------------------------------
// Speech-to-Text (Google Cloud)
// ------------------------------
export async function transcribeAudio(audioBlob) {
    try {
        console.log("   🎙️ Conversion audio in base64...");
        const arrayBuffer = await audioBlob.arrayBuffer();

        // Conversion base64 optimised
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 0x8000;

        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode.apply(null, chunk);
        }

        const audioBytes = btoa(binary);
        console.log(`   ✅ Audio encoded: ${audioBytes.length} chars base64`);

        // ✅ CONFIGURATION OPTIMISED
        const body = {
            config: {
                encoding: "WEBM_OPUS",
                sampleRateHertz: 48000,
                languageCode: "en-US",

                // ✅ NEW Features
                enableAutomaticPunctuation: true,        // Automatic punctuation
                model: "latest_long",                     // Optimised model for long phrases
                useEnhanced: true,                        // Enhanced model

                // ✅ Alternative transcription
                maxAlternatives: 1,

                // ✅ Configuration audio
                audioChannelCount: 1,
                enableSeparateRecognitionPerChannel: false,

                // ✅ Adaptation of speech recognition
                speechContexts: [{
                    phrases: [
                        "what is",
                        "tell me about",
                        "explain",
                        "describe",
                        "how does",
                        "why",
                        "rocking chair",
                        "wikipedia"
                    ],
                    boost: 10  // Boost of 10 for these common phrases
                }]
            },
            audio: {
                content: audioBytes
            }
        };

        console.log("   ⏳ Sending to Google Speech-to-Text...");
        const startTime = performance.now();

        const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${GCloud_TTS_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            }
        );

        const latency = (performance.now() - startTime).toFixed(0);
        console.log(`   ⚡ STT Latency: ${latency}ms`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Error Google STT:", errorText);
            throw new Error(`STT API Error: ${response.status}`);
        }

        const data = await response.json();

        // ✅ Afficher TOUS les résultats pour debug
        if (data.results && data.results.length > 0) {
            console.log(`   📊 RResults STT (${data.results.length} result(s)):`);
            data.results.forEach((result, i) => {
                if (result.alternatives) {
                    result.alternatives.forEach((alt, j) => {
                        const confidence = (alt.confidence || 0) * 100;
                        console.log(`      ${i}.${j}: "${alt.transcript}" (confidence: ${confidence.toFixed(1)}%)`);
                    });
                }
            });

            const transcript = data.results[0].alternatives[0].transcript || '';
            const confidence = data.results[0].alternatives[0].confidence || 0;

            console.log(`   ✅ Transcription: "${transcript}"`);
            console.log(`   📊 Confidence: ${(confidence * 100).toFixed(1)}%`);

            // Update the UI with the transcribed text
            updateTranscriptionText(transcript);

            // ⚠️ Avertir si confiance faible
            if (confidence < 0.7) {
                console.warn(`   ⚠️ Confidence weak (${(confidence * 100).toFixed(1)}%) - Transcription may be incorrect`);
            }

            return transcript;
        }

        console.warn("⚠️ No transcription results");
        return '';

    } catch (err) {
        console.error("❌ Error transcription:", err);
        throw err;
    }
}

// ------------------------------
// Text-to-Speech (Google Cloud)
// ------------------------------
export async function synthesizeSpeech(text, voiceName) {
    if (!text?.trim()) {
        throw new Error("No text to synthesize");
    }

    if (!GCloud_TTS_API_KEY) {
        throw new Error("Missing GCloud_TTS_API_KEY");
    }
    const requestBody = {
        input: { text },
        voice: {
            languageCode: "en-US",
            name: voiceName
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0
        }
    };

    const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GCloud_TTS_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS Error: ${errorText}`);
    }

    const data = await response.json();

    // Convertir base64 en Blob
    const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: "audio/mp3" }
    );

    return audioBlob;
}