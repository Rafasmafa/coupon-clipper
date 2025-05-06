// getWindow.js
(function () {
  const MESSAGE_PREFIX = "SHOPRITE_EXTENSION_";

//  // Intercept fetch to capture getToken/auth/login response
//  const originalFetch = window.fetch;
//  window.fetch = async (...args) => {
//    const [url, options] = args;
//    console.log("getWindow.js: Fetch request:", url, options);
//    if (url.toLowerCase().includes("gettoken") && options?.method?.toUpperCase() === "POST") {
//      console.log("getWindow.js: Intercepted fetch to getToken/auth/login", url, options);
//      const response = await originalFetch(...args);
//      const clone = response.clone();
//      try {
//        const text = await clone.text();
//        console.log("getWindow.js: Raw fetch response:", text);
//        const data = JSON.parse(text);
//        console.log("getWindow.js: Fetch response JSON:", data);
//        if (data.access_token) {
//          console.log("getWindow.js: Extracted access_token from fetch:", data.access_token);
//          window.postMessage(
//            {
//              source: MESSAGE_PREFIX,
//              action: "apiTokenExtracted",
//              apiToken: data.access_token
//            },
//            "*"
//          );
//          window.postMessage(
//            {
//              source: MESSAGE_PREFIX,
//              action: "couponTokenExtracted",
//              couponToken: data.access_token
//            },
//            "*"
//          );
//        } else {
//          console.error("getWindow.js: No access_token in fetch response:", data);
//        }
//      } catch (error) {
//        console.error("getWindow.js: Error parsing fetch response for getToken/auth/login:", error);
//      }
//      return response;
//    }
//    return originalFetch(...args);
//  };

//  // Intercept XMLHttpRequest to capture getToken/auth/login response
//  const originalXHROpen = window.XMLHttpRequest.prototype.open;
//  window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
//    console.log("getWindow.js: XHR request:", method, url);
//    if (url.toLowerCase().includes("gettoken") && method.toUpperCase() === "POST") {
//      console.log("getWindow.js: Intercepted XHR to getToken/auth/login", url, method);
//      this.addEventListener("load", function () {
//        try {
//          const text = this.responseText;
//          console.log("getWindow.js: Raw XHR response:", text);
//          const data = JSON.parse(text);
//          console.log("getWindow.js: XHR response JSON:", data);
//          if (data.access_token) {
//            console.log("getWindow.js: Extracted access_token from XHR:", data.access_token);
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "apiTokenExtracted",
//                apiToken: data.access_token
//              },
//              "*"
//            );
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "couponTokenExtracted",
//                couponToken: data.access_token
//              },
//              "*"
//            );
//          } else {
//            console.error("getWindow.js: No access_token in XHR response:", data);
//          }
//        } catch (error) {
//          console.error("getWindow.js: Error parsing XHR response for getToken/auth/login:", error);
//        }
//      });
//      this.addEventListener("error", function () {
//        console.error("getWindow.js: XHR error for getToken/auth/login:", url);
//      });
//    }
//    return originalXHROpen.apply(this, [method, url, ...rest]);
//  };

//  // Intercept Axios or similar libraries
//  if (window.axios) {
//    console.log("getWindow.js: Found axios, intercepting");
//    const originalAxios = window.axios;
//    window.axios = function (config) {
//      console.log("getWindow.js: Axios request:", config);
//      if (config.url?.toLowerCase().includes("gettoken") && config.method?.toUpperCase() === "POST") {
//        console.log("getWindow.js: Intercepted axios to getToken/auth/login", config);
//        return originalAxios(config).then(response => {
//          console.log("getWindow.js: Axios response:", response.data);
//          if (response.data.access_token) {
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "apiTokenExtracted",
//                apiToken: response.data.access_token
//              },
//              "*"
//            );
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "couponTokenExtracted",
//                couponToken: response.data.access_token
//              },
//              "*"
//            );
//          }
//          return response;
//        });
//      }
//      return originalAxios(config);
//    };
//  }

  // Fallback: Poll for access_token in window, localStorage, or sessionStorage
//  function pollForToken() {
//    let attempts = 0;
//    const maxAttempts = 30; // 15 seconds
//    const interval = setInterval(() => {
//      try {
//        // Check window
//        for (const key in window) {
//          if (typeof window[key] === "string" && window[key].startsWith("eyJhbGci")) {
//            console.log("getWindow.js: Found potential token in window:", key, window[key]);
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "apiTokenExtracted",
//                apiToken: window[key]
//              },
//              "*"
//            );
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "couponTokenExtracted",
//                couponToken: window[key]
//              },
//              "*"
//            );
//            clearInterval(interval);
//            return;
//          }
//        }
//        // Check localStorage
//        for (const key in localStorage) {
//          if (localStorage.getItem(key)?.startsWith("eyJhbGci")) {
//            console.log("getWindow.js: Found potential token in localStorage:", key, localStorage.getItem(key));
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "apiTokenExtracted",
//                apiToken: localStorage.getItem(key)
//              },
//              "*"
//            );
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "couponTokenExtracted",
//                couponToken: localStorage.getItem(key)
//              },
//              "*"
//            );
//            clearInterval(interval);
//            return;
//          }
//        }
//        // Check sessionStorage
//        for (const key in sessionStorage) {
//          if (sessionStorage.getItem(key)?.startsWith("eyJhbGci")) {
//            console.log("getWindow.js: Found potential token in sessionStorage:", key, sessionStorage.getItem(key));
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "apiTokenExtracted",
//                apiToken: sessionStorage.getItem(key)
//              },
//              "*"
//            );
//            window.postMessage(
//              {
//                source: MESSAGE_PREFIX,
//                action: "couponTokenExtracted",
//                couponToken: sessionStorage.getItem(key)
//              },
//              "*"
//            );
//            clearInterval(interval);
//            return;
//          }
//        }
//      } catch (error) {
//        console.error("getWindow.js: Error polling for token:", error);
//      }
//      attempts++;
//      if (attempts >= maxAttempts) {
//        console.log("getWindow.js: Stopped polling for token");
//        clearInterval(interval);
//      }
//    }, 500);
//  }

  // Start polling after page load
//  window.addEventListener("load", () => {
//    console.log("getWindow.js: Starting token polling");
//    pollForToken();
//  });

  // Function to attempt loyaltyId extraction
  function extractLoyaltyId() {
    try {
      if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.customer?.details?.loyaltyId) {
        const loyaltyId = window.__PRELOADED_STATE__.customer.details.loyaltyId;
        console.log("getWindow.js: Main-world: Loyalty ID extracted:", loyaltyId);
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
      console.log("getWindow.js: __PRELOADED_STATE__ detected via observer");
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
      console.log("getWindow.js: __PRELOADED_STATE__ detected via polling");
      extractLoyaltyId();
      clearInterval(pollInterval);
      observer.disconnect();
    } else if (attempts >= maxAttempts) {
      console.log("getWindow.js: Stopped polling for __PRELOADED_STATE__");
      clearInterval(pollInterval);
      observer.disconnect();
    }
    attempts++;
  }, 500);

  // Cleanup observer after 10 seconds
  setTimeout(() => {
    observer.disconnect();
    clearInterval(pollInterval);
    console.log("getWindow.js: Stopped observing and polling for __PRELOADED_STATE__");
  }, 10000);
})();