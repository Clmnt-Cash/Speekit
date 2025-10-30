# **Speekit – Chrome Extension**

**Speekit** is a Chrome extension that makes the web more accessible and interactive for everyone.  
It uses the **Chrome Built-in AI API (Gemini)** to understand web content and generate natural answers, and the **Google Cloud Text-to-Speech API** to read them aloud using realistic voices.  

---

## 💡 Inspiration  
The web is full of information and opportunities — but for millions of people, it’s still not truly accessible.  
Visually impaired or elderly users often struggle to read small text, navigate complex layouts, or find the right information quickly.  

We wanted to create something that would **make the web more human**, by allowing users to simply *ask questions* and *listen to answers* instead of struggling with the interface.  
That idea became **Speekit** — a Chrome extension that uses AI to make browsing accessible, conversational, and effortless.

---

## ⚙️ What it does  
**Speekit** transforms any website into an interactive, voice-driven experience.  

When a user asks a question while browsing, Speekit:
1. **Analyzes** the page content and identifies relevant information related to the query.  
2. Sends this context to **Chrome Prompt AI (Gemini)**, which generates a clear and natural-language answer.  
3. **Customizes** the AI’s personality — users can choose between *funny*, *friendly*, *casual*, or *formal* tones.  
4. Converts the response into speech using **Google Cloud Text-to-Speech**, offering **four voice options** (two male and two female).  

Everything happens in seconds, turning passive reading into **active, accessible conversation** with the web.

---

## 🧠 How we built it  
We developed **Speekit** as a Chrome extension using:
- **JavaScript / HTML / CSS** for the interface and core logic  
- **Chrome APIs** for page content extraction and context gathering  
- **Gemini AI (Chrome Prompt API)** for language understanding and response generation  
- **Google Cloud Text-to-Speech API** for voice output  
- **TF-IDF algorithm** for precise information extraction  

The entire architecture is **asynchronous**, ensuring smooth, low-latency communication between the AI and TTS pipeline.  
We also designed a **clean, intuitive popup UI** that requires minimal effort from the user — just one question and one click.

---

## 🧩 Challenges we ran into  
- **Context extraction:** Selecting the right webpage elements to send to Gemini without overloading the model.  
- **Latency optimization:** Achieving near real-time response from both the LLM and the TTS system.  
- **UI accessibility:** Designing a minimalist, high-contrast interface that remains clear for visually impaired and elderly users.  
- **Voice quality:** Balancing speed and natural tone across multiple voice options and styles.  

Each challenge required careful testing, iteration, and fine-tuning to achieve a smooth experience.

---

## 🏆 Accomplishments we’re proud of  
- Built a **fully functional Chrome extension** that integrates Gemini AI and Google Cloud TTS seamlessly.  
- Achieved **fast and reliable responses** despite multiple API calls.  
- Designed a **minimal, inclusive interface** accessible to all users.  
- Enabled **personality and voice customization**, allowing each user to personalize their experience.  
- Made the web feel **more alive, engaging, and inclusive**.

---

## 📚 What we learned  
Through building Speekit, we learned how to:
- Integrate multiple **Google AI services** within a Chrome extension.  
- Use **TF-IDF** to extract relevant context dynamically from webpages.  
- Optimize **performance and latency** for real-time AI responses.  
- Treat **accessibility as a design priority**, not an afterthought.  
- Understand how **personalization** enhances user engagement and comfort.  

This project taught us how thoughtful AI design can make technology truly inclusive.

---

## 🚀 What’s next for Speekit  
We’re planning to:
- Add **multilingual support** for global users.  
- Improve **information extraction** to work across all types of websites.  
- Enhance **summarization quality** for long or complex content.  
- Integrate **real-time translation** for broader accessibility.  
- Publish Speekit on the **Chrome Web Store** for public access.  

Our vision is to make Speekit a trusted **AI accessibility companion** — bringing the power of conversation to the web for everyone.

---

## 🛠️ Installation  
1. Clone the repository:  
   ```bash
   git clone https://github.com/your-repo/speekit.git
   ```
2. Open Chrome and go to:  
   ```
   chrome://extensions/
   ```
3. Enable **Developer mode**  
4. Click **Load unpacked**  
5. Select the project folder  

---

## 🎯 Usage  
1. Click the **Speekit** icon in the Chrome toolbar  
2. Ask your question or choose **“Read the page”**  
3. Listen to the answer, spoken naturally in the voice and tone of your choice  

---

## 🌍 The possibilities are endless  
Summarize an email. Compare products. Explain a GitHub project. Get help filling out forms.  
Whatever you’re doing on the web — **Speekit makes it easier, faster, and more accessible for everyone.**
