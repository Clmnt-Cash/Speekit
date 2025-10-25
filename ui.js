let currentAudio = null;

export function initUI() {
    // Initialize any UI elements if needed
}

export function createOptions(containerId, options, type, onSelectCallback) {
    const container = document.getElementById(containerId);

    options.forEach(opt => {
        const div = document.createElement("div");
        div.className = "option";
        div.innerHTML = `<img src="${opt.icon}" alt="${opt.label}" /> ${opt.label}`;

        div.addEventListener("click", () => {
            container.querySelectorAll(".option").forEach(o => o.classList.remove("selected"));
            div.classList.add("selected");

            if (onSelectCallback) {
                onSelectCallback(opt.name, type);
            }
        });

        container.appendChild(div);
    });

    container.children[0].classList.add("selected");
}

export function updateTranscriptionText(text) {
    const transcriptionElement = document.getElementById('transcriptionText');
    if (transcriptionElement) {
        transcriptionElement.textContent = text;
    }
}

export function showWaveAnimation() {
    const waveContainer = document.querySelector('.wave-container');
    if (waveContainer) {
        waveContainer.classList.add('speaking');
    }
}

export function hideWaveAnimation() {
    const waveContainer = document.querySelector('.wave-container');
    if (waveContainer) {
        waveContainer.classList.remove('speaking');
    }
}

export function showProcessingIndicator() {
    const processingIndicator = document.querySelector('.processing-indicator');
    if (processingIndicator) {
        processingIndicator.classList.add('active');
    }
}

export function hideProcessingIndicator() {
    const processingIndicator = document.querySelector('.processing-indicator');
    if (processingIndicator) {
        processingIndicator.classList.remove('active');
    }
}

export function resetUI() {
    // Hide all animations
    hideWaveAnimation();
    hideProcessingIndicator();
    
    // Clear the transcription text
    const transcriptionText = document.getElementById('transcriptionText');
    if (transcriptionText) {
        transcriptionText.textContent = '';
    }
}

export async function playAudio(audioBlob) {
    stopAudio(); // Arrêter l'audio précédent
    hideProcessingIndicator();

    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    currentAudio.onplay = () => {
        showWaveAnimation();
    };

    currentAudio.onended = () => {
        hideWaveAnimation();
        URL.revokeObjectURL(audioUrl);
    };

    await currentAudio.play();
}

export function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
    hideWaveAnimation();
    hideProcessingIndicator();
}