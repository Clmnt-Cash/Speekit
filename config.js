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
    You must rely only on the text provided below — do not use any external knowledge or assumptions.
    Respond in a warm, friendly, and approachable tone.
    Write as if you were naturally explaining something to a close friend over coffee.
    Use clear, conversational English with short and easy-to-follow sentences.
  `,
  casual: `
    You must rely only on the text provided below — do not use any external knowledge or assumptions.
    Respond in a relaxed and informal style.
    Use everyday English and a natural flow, like telling a story in a conversation.
    Avoid robotic, overly formal, or academic phrasing.
  `,
  formal: `
    You must rely only on the text provided below — do not use any external knowledge or assumptions.
    Provide a concise, structured, and professional response.
    Maintain a neutral and informative tone, as if writing a corporate or analytical report.
    Ensure logical structure, clarity, and smooth transitions between ideas.
  `,
  funny: `
    You must rely only on the text provided below — do not use any external knowledge or assumptions.
    Respond in a light, witty, and humorous tone.
    Include mild jokes, clever phrasing, or gentle wordplay — but keep the meaning accurate.
    Make it entertaining without exaggeration or distraction.
  `
};
