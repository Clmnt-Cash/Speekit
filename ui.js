let loader = null;
let currentAudio = null;

export function initUI(loaderElement) {
    loader = loaderElement;
}

export function showLoader() {
    if (loader) loader.style.display = "block";
}

export function hideLoader() {
    if (loader) loader.style.display = "none";
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

export async function playAudio(audioBlob) {
    stopAudio(); // Arrêter l'audio précédent

    const audioUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
        hideLoader();
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
    hideLoader();
}