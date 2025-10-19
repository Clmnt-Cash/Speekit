let mediaRecorder = null;
let audioChunks = [];
let recording = false;
let recordingStartTime = 0;

export function isRecording() {
    return recording;
}

export async function startRecording(onStopCallback) {
    console.log("🎤 [microphone.js] startRecording appelé");

    if (recording) {
        console.log("⚠️ Enregistrement déjà en cours");
        return;
    }

    recording = true;
    recordingStartTime = Date.now();

    try {
        console.log("🎤 Demande d'accès au microphone...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Accès microphone accordé");

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = function (e) {
            console.log(`📊 Chunk reçu: ${e.data.size} bytes`);
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async function () {
            console.log("⏹️ [microphone.js] onstop déclenché");
            recording = false;

            // ✅ Créer les variables une par une
            console.log("📦 Création du Blob...");
            console.log(`   - Chunks disponibles: ${audioChunks.length}`);
            console.log(`   - Type: audio/webm`);

            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log(`✅ Blob créé: ${blob.size} bytes`);

            const duration = Date.now() - recordingStartTime;
            console.log(`⏱️ Durée: ${duration}ms`);

            // ✅ Arrêter le stream
            console.log("🔌 Arrêt des tracks...");
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            console.log("✅ Tracks arrêtés");

            // ✅ Appeler le callback
            console.log("📞 Appel du callback...");
            if (onStopCallback) {
                try {
                    await onStopCallback(blob, duration);
                    console.log("✅ Callback terminé");
                } catch (err) {
                    console.error("❌ Erreur dans callback:", err);
                }
            } else {
                console.warn("⚠️ Aucun callback fourni");
            }
        };

        mediaRecorder.start();
        console.log("✅ Enregistrement démarré");
        return true;

    } catch (err) {
        console.error("❌ Erreur accès micro:", err);
        recording = false;
        throw err;
    }
}

export function stopRecording() {
    console.log("⏹️ [microphone.js] stopRecording appelé");

    if (!recording) {
        console.log("⚠️ Aucun enregistrement en cours");
        return;
    }

    if (!mediaRecorder) {
        console.log("⚠️ Pas de mediaRecorder");
        return;
    }

    console.log("⏹️ Arrêt du MediaRecorder...");
    mediaRecorder.stop();
}