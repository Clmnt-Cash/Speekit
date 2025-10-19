export const GCloud_TTS_API_KEY = "AIzaSyAa3X5OxtCEjzB8Yui2BXLVZP_r96HTY0c";

export const VOICES = [
    { name: "en-US-Wavenet-D", label: "Male 1", icon: "icons/man.png" },
    { name: "en-US-Wavenet-F", label: "Female 1", icon: "icons/woman.png" },
    { name: "en-US-Wavenet-C", label: "Male 2", icon: "icons/man.png" },
    { name: "en-US-Wavenet-E", label: "Female 2", icon: "icons/woman.png" }
];

export const PROMPT_STYLES = [
    { name: "friendly", label: "Friendly", icon: "icons/friendly.png" },
    { name: "casual", label: "Casual", icon: "icons/casual.png" },
    { name: "formal", label: "Formal", icon: "icons/formal.png" },
    { name: "funny", label: "Funny", icon: "icons/funny.png" }
];

export const STYLE_PROMPTS = {
    friendly: `
    Respond in a warm and friendly tone.
    Write as if you were explaining it naturally to a friend over coffee.
    Use clear, conversational language with short, easy-to-follow sentences.
  `,
    casual: `
    Respond in a relaxed and informal way.
    Use everyday English, simple words, and a smooth flow — like telling a story.
    Avoid robotic or academic phrasing.
  `,
    formal: `
    Provide a concise and professional answer.
    Maintain a neutral and informative tone, as if writing a corporate report.
    Ensure logical structure, clarity, and smooth transitions between sentences.
  `,
    funny: `
    Respond in a light and humorous way.
    Include mild jokes, wordplay, or witty remarks while keeping the meaning accurate.
    Keep it entertaining but not exaggerated or distracting.
  `
};