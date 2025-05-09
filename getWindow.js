// getWindow.js
(function () {
  const MESSAGE_PREFIX = "SHOPRITE_EXTENSION_";

  // Function to attempt loyaltyId extraction
  function extractLoyaltyId() {
    try {
      if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.customer?.details?.loyaltyId) {
        const loyaltyId = window.__PRELOADED_STATE__.customer.details.loyaltyId;
//        console.log("getWindow.js: Main-world: Loyalty ID extracted:", loyaltyId);
        window.postMessage(
          {
            source: MESSAGE_PREFIX,
            action: "loyaltyIdExtracted",
            loyaltyId: loyaltyId
          },
          "*"
        );
        window.__LOYALTY_ID_EXTRACTED__ = true;
      } else {
        console.error(
          "getWindow.js: Main-world: Loyalty ID not found",
          window.__PRELOADED_STATE__ ? window.__PRELOADED_STATE__ : "No __PRELOADED_STATE__"
        );
        window.postMessage(
          {
            source: MESSAGE_PREFIX,
            action: "loyaltyIdExtracted",
            error: window.__PRELOADED_STATE__
              ? "No loyaltyId in __PRELOADED_STATE__.customer.details"
              : "__PRELOADED_STATE__ not found"
          },
          "*"
        );
      }
    } catch (error) {
      console.error("getWindow.js: Main-world: Error extracting loyaltyId:", error);
      window.postMessage(
        {
          source: MESSAGE_PREFIX,
          action: "loyaltyIdExtracted",
          error: error.message
        },
        "*"
      );
    }
  }

  // Run extraction immediately
  if (!window.__LOYALTY_ID_EXTRACTED__) {
    extractLoyaltyId();
  }

  // Observe DOM changes to detect __PRELOADED_STATE__ loading
  const observer = new MutationObserver(() => {
    if (window.__PRELOADED_STATE__ && !window.__LOYALTY_ID_EXTRACTED__) {
//      console.log("getWindow.js: __PRELOADED_STATE__ detected via observer");
      extractLoyaltyId();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Polling fallback for __PRELOADED_STATE__
  const maxAttempts = 20; // 10 seconds
  let attempts = 0;
  const pollInterval = setInterval(() => {
    if (window.__PRELOADED_STATE__ && !window.__LOYALTY_ID_EXTRACTED__) {
//      console.log("getWindow.js: __PRELOADED_STATE__ detected via polling");
      extractLoyaltyId();
      clearInterval(pollInterval);
      observer.disconnect();
    } else if (attempts >= maxAttempts) {
//      console.log("getWindow.js: Stopped polling for __PRELOADED_STATE__");
      clearInterval(pollInterval);
      observer.disconnect();
    }
    attempts++;
  }, 500);

  // Cleanup observer after 10 seconds
  setTimeout(() => {
    observer.disconnect();
    clearInterval(pollInterval);
//    console.log("getWindow.js: Stopped observing and polling for __PRELOADED_STATE__");
  }, 10000);
})();