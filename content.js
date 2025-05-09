// content.js
console.log("content.js is running on:", window.location.href);

// Unique identifier for messages
const MESSAGE_PREFIX = "SHOPRITE_EXTENSION_";

// Inject getWindow.js into the page's main world
const s = document.createElement("script");
s.src = chrome.runtime.getURL("getWindow.js");
s.onload = function () {
  console.log("getWindow.js loaded and injected");
  this.remove();
};
s.onerror = function () {
  console.error("Failed to load getWindow.js");
};
(document.head || document.documentElement).appendChild(s);

// Listen for messages from getWindow.js and background.js
window.addEventListener("message", event => {
  if (event.source !== window || !event.data || event.data.source !== MESSAGE_PREFIX) {
    return;
  }

  if (event.data.action === "checkCookies") {
    chrome.runtime.sendMessage({ action: "checkCookies" }, response => {
      window.postMessage(
        {
          source: MESSAGE_PREFIX,
          action: "cookieResponse",
          loggedIn: response.loggedIn
        },
        "*"
      );
    });
  } else if (event.data.action === "loyaltyIdExtracted") {
    console.log("content.js: Received loyaltyId:", event.data.loyaltyId || event.data.error);
    chrome.runtime.sendMessage({
      action: "loyaltyIdExtracted",
      loyaltyId: event.data.loyaltyId,
      error: event.data.error
    });
  } else if (event.data.action === "couponTokenExtracted") {
    console.log("content.js: Received couponToken:", event.data.couponToken);
    chrome.runtime.sendMessage({
      action: "couponTokenExtracted",
      couponToken: event.data.couponToken
    });
  } else if (event.data.action === "apiTokenExtracted") {
    console.log("content.js: Received apiToken:", event.data.apiToken);
    chrome.runtime.sendMessage({
      action: "apiTokenExtracted",
      apiToken: event.data.apiToken
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "refreshPage") {
    console.log("content.js: Received refreshPage runtime message");
    window.location.reload();
    sendResponse({ status: "Page refresh triggered" });
  }
});

function processMainScript() {
  const scripts = Array.from(document.querySelectorAll('script[src*="main."][src$=".js"]'));
  if (scripts.length > 0) {
    const scriptUrl = scripts[0].src;
    console.log("Found main.*.js script:", scriptUrl);
    fetch(scriptUrl)
      .then(response => {
        if (!response.ok) throw new Error(`Failed to fetch ${scriptUrl}: ${response.status}`);
        return response.text();
      })
      .then(text => {
        const tokenMatch = text.match(/apiToken:\s*"Bearer\s*([^"]+)"/);
        if (tokenMatch && tokenMatch[1]) {
          const apiToken = tokenMatch[1];
          console.log("Extracted apiToken:", apiToken);
          chrome.runtime.sendMessage({ action: "apiTokenExtracted", apiToken: apiToken });
        } else {
          console.error("apiToken not found in script");
        }
      })
      .catch(error => console.error("Error fetching script:", error));
  } else {
    console.log("No main.*.js scripts found in this frame");
  }
}

// Check for existing scripts on load
processMainScript();

// Observe dynamically added scripts
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === "SCRIPT" && node.src && node.src.includes("main.") && node.src.endsWith(".js")) {
          console.log("Dynamically added main.*.js script:", node.src);
          processMainScript();
        }
      });
    }
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });
