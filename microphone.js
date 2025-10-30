let mediaRecorder = null;
let audioChunks = [];
let recording = false;
let recordingStartTime = 0;

export function isRecording() {
    return recording;
}

export async function startRecording(onStopCallback) {
    console.log("🎤 [microphone.js] startRecording called");

    if (recording) {
        console.log("Already recording, ignoring startRecording call");
        return;
    }

    recording = true;
    recordingStartTime = Date.now();

    try {
        console.log("🎤 Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone access granted");

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = function (e) {
            console.log(`📊 Chunk received: ${e.data.size} bytes`);
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = async function () {
            console.log("⏹️ [microphone.js] onstop event triggered");
            recording = false;

            // Creation of variables
            console.log("📦 Creating Blob...");
            console.log(`   - Available chunks: ${audioChunks.length}`);
            console.log(`   - Type: audio/webm`);

            const blob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log(`✅ Blob created: ${blob.size} bytes`);

            const duration = Date.now() - recordingStartTime;
            console.log(`⏱️ Duration: ${duration}ms`);

            // Stop the stream
            console.log("🔌 Stopping tracks...");
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
            console.log("✅ Tracks stopped");

            // Call the callback
            console.log("📞 Calling callback...");
            if (onStopCallback) {
                try {
                    await onStopCallback(blob, duration);
                    console.log("✅ Callback finished");
                } catch (err) {
                    console.error("❌ Error in callback:", err);
                }
            } else {
                console.warn("⚠️ No callback provided");
            }
        };

        mediaRecorder.start();
        console.log("✅ Recording started");
        return true;

    } catch (err) {
        console.error("❌ Error accessing microphone:", err);
        recording = false;
        throw err;
    }
}

export function stopRecording() {
    console.log("⏹️ [microphone.js] stopRecording called");

    if (!recording) {
        console.log("⚠️ No recording in progress");
        return;
    }

    if (!mediaRecorder) {
        console.log("⚠️ No mediaRecorder");
        return;
    }

    console.log("⏹️ Stopping MediaRecorder...");
    mediaRecorder.stop();
}