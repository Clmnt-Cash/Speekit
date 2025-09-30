document.getElementById("readPage").addEventListener("click", () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: () => document.body.innerText
    }, (results) => {
      const text = results[0].result;
      chrome.tts.speak(text, { rate: 1.0, pitch: 1.0 });
    });
  });
});

document.getElementById("stop").addEventListener("click", () => {
  chrome.tts.stop();
});
