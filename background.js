// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkLogin") {
    checkLoginStatus().then(loggedIn => {
      sendResponse({ loggedIn });
    });
    return true;
  }

  if (message.action === "checkCookies") {
    chrome.cookies.getAll({ domain: "shoprite.com" }, cookies => {
      const oidcCookie = cookies.find(cookie => cookie.name.includes("oidc.user"));
      sendResponse({ loggedIn: !!oidcCookie });
    });
    return true;
  }

  if (message.action === "clipCoupons") {
    clipAllCoupons().then(result => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "tokenExtracted") {
    chrome.storage.local.set(
      {
        shopRiteAuthToken: message.authToken,
        shopRiteCouponToken: message.couponToken,
        shopRiteStoreId: message.storeId,
        tokenTimestamp: Date.now()
      },
      () => {
        console.log("Tokens saved");
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.action === "loyaltyIdExtracted") {
    if (message.error) {
      console.error("Loyalty ID error:", message.error);
      sendResponse({ success: false, error: message.error });
      return true;
    }

    chrome.storage.local.set(
      {
        shopRiteLoyaltyId: message.loyaltyId,
        loyaltyIdTimestamp: Date.now()
      },
      () => {
        console.log("Loyalty ID saved:", message.loyaltyId);
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.action === "couponTokenExtracted") {
    chrome.storage.local.set(
      {
        shopRiteCouponToken: message.couponToken,
        tokenTimestamp: Date.now()
      },
      () => {
        console.log("couponToken saved:", message.couponToken);
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.action === "apiTokenExtracted") {
    chrome.storage.local.set(
      {
        shopRiteApiToken: message.apiToken,
        tokenTimestamp: Date.now()
      },
      () => {
        console.log("apiToken saved:", message.apiToken);
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

//// WebRequest listener to detect getToken/auth/login
//chrome.webRequest.onCompleted.addListener(
//  details => {
//    console.log("background.js: webRequest completed:", details.url, {
//      method: details.method,
//      status: details.statusCode,
//      initiator: details.initiator
//    });
//    if (details.url.toLowerCase().includes("gettoken/auth/login") && details.method === "POST") {
//      console.log("background.js: Intercepted getToken/auth/login via webRequest", details);
//      // Send message to content script to poll for token
//      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
//        if (tabs[0]) {
//          chrome.tabs.sendMessage(tabs[0].id, { action: "pollForToken" });
//        }
//      });
//    }
//  },
//  { urls: ["https://shop-rite-web-prod.azurewebsites.net/getToken/auth/login*"] },
//  ["responseHeaders"]
//);

chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    if (details.url.toLowerCase().includes("gettoken/auth/login") && details.method === "POST") {
      console.log("background.js: Intercepted getToken/auth/login request headers:", details.requestHeaders);
      const xUserKeyHeader = details.requestHeaders.find(header => header.name.toLowerCase() === "x-user-key");
      if (xUserKeyHeader) {
        const xUserKey = xUserKeyHeader.value;
        console.log("background.js: Found x-user-key:", xUserKey);
        chrome.storage.local.set(
          {
            shopRiteUserKey: xUserKey,
            userKeyTimestamp: Date.now()
          },
          () => {
            console.log("background.js: Stored x-user-key in chrome.storage.local:", xUserKey);
          }
        );
      } else {
        console.error("background.js: x-user-key header not found in request");
      }
    }
  },
  { urls: ["https://shop-rite-web-prod.azurewebsites.net/getToken/auth/login*"] },
  ["requestHeaders"]
);

chrome.webRequest.onBeforeRequest.addListener(
  details => {
    console.log("background.js: Debug - Request detected:", {
      url: details.url,
      method: details.method,
      type: details.type,
      initiator: details.initiator
    });
  },
  { urls: ["https://shop-rite-web-prod.azurewebsites.net/*"] }
);

// Intercept main.*.js response body to extract apiToken
//chrome.webRequest.onResponseStarted.addListener(
//  details => {
//    if (details.url.match(/https:\/\/shop-rite-web-prod\.azurewebsites\.net\/main\.\w+\.js/)) {
//      console.log("background.js: Intercepted main.*.js response:", {
//        url: details.url,
//        status: details.statusCode,
//        type: details.type
//      });
//      const filter = chrome.webRequest.filterResponseData(details.requestId);
//      let data = [];
//
//      filter.ondata = event => {
//        data.push(event.data);
//      };
//
//      filter.onstop = () => {
//        try {
//          // Combine chunks into a single string
//          const decoder = new TextDecoder("utf-8");
//          let responseBody = "";
//          for (const chunk of data) {
//            responseBody += decoder.decode(chunk, { stream: true });
//          }
//
//          console.log("background.js: main.*.js response body length:", responseBody.length);
//
//          // Extract apiToken using regex
//          const tokenMatch = responseBody.match(/apiToken:\s*"Bearer\s*([^"]+)"/);
//          if (tokenMatch && tokenMatch[1]) {
//            const apiToken = tokenMatch[1];
//            console.log("background.js: Found apiToken:", apiToken);
//            chrome.storage.local.set(
//              {
//                shopRiteApiToken: apiToken,
//                apiTokenTimestamp: Date.now()
//              },
//              () => {
//                console.log("background.js: Stored apiToken in chrome.storage.local:", apiToken);
//              }
//            );
//          } else {
//            console.error("background.js: apiToken not found in main.*.js response");
//          }
//        } catch (error) {
//          console.error("background.js: Error processing main.*.js response:", error);
//        }
//        // Pass data through
//        for (const chunk of data) {
//          filter.write(chunk);
//        }
//        filter.close();
//      };
//
//      filter.onerror = error => {
//        console.error("background.js: Filter error for main.*.js:", error);
//      };
//    }
//  },
//  { urls: ["https://shop-rite-web-prod.azurewebsites.net/main.*.js"] },
//  ["blocking"]
//);

async function checkLoginStatus() {
  const data = await chrome.storage.local.get(["shopRiteAuthToken", "tokenTimestamp"]);
  if (data.shopRiteAuthToken && data.tokenTimestamp) {
    const thirtyMinutes = 30 * 60 * 1000;
    if (Date.now() - data.tokenTimestamp < thirtyMinutes) {
      return true;
    }
  }

  try {
    const cookies = await chrome.cookies.getAll({ domain: "shoprite.com" });
    const oidcCookie = cookies.find(cookie => cookie.name.includes("oidc.user"));
    if (oidcCookie) {
      const decodedValue = decodeURIComponent(oidcCookie.value);
      const oidcData = JSON.parse(decodedValue);
      await chrome.storage.local.set({
        shopRiteAuthToken: oidcData.access_token,
        tokenTimestamp: Date.now()
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Cookie check failed:", error);
    return false;
  }
}

async function clipAllCoupons() {
  try {
    const data = await chrome.storage.local.get([
      "shopRiteAuthToken",
//      "shopRiteCouponToken",
      "shopRiteApiToken",
      "shopRiteStoreId",
      "shopRiteLoyaltyId",
      "loyaltyIdTimestamp",
      "shopRiteUserKey",
      "tokenTimestamp"
    ]);

    console.log("clipAllCoupons: Retrieved data:", {
      authToken: !!data.shopRiteAuthToken,
//      couponToken: !!data.shopRiteCouponToken,
      apiToken: !!data.shopRiteApiToken,
      storeId: data.shopRiteStoreId,
      loyaltyId: data.shopRiteLoyaltyId,
      userKey: !!data.shopRiteUserKey
    });

    let authToken = data.shopRiteAuthToken;
    let apiToken = data.shopRiteApiToken;
    let storeId = data.shopRiteStoreId;
    let loyaltyId = data.shopRiteLoyaltyId;
    let shopRiteUserKey = data.shopRiteUserKey;

    const thirtyMinutes = 30 * 60 * 1000;
    if (!loyaltyId || !data.loyaltyIdTimestamp || Date.now() - data.loyaltyIdTimestamp > thirtyMinutes) {
      console.error("No valid loyaltyId found. Storage:", data);
      return { success: false, error: "Loyalty ID not found. Please log in at shoprite.com and visit the digital coupon page." };
    }

//    if (!couponToken || !data.tokenTimestamp || Date.now() - data.tokenTimestamp > thirtyMinutes) {
//      console.error("No valid couponToken found. Storage:", data);
//      return { success: false, error: "Coupon token not found. Please visit the digital coupon page." };
//    }
    // Make API call to get coupon token
    const url = "https://shop-rite-web-prod.azurewebsites.net/getToken/auth/login";
    const headers = {
      "Authorization": `Bearer ${apiToken}`,
      "content-type": "application/json",
      "x-user-key": shopRiteUserKey
    };
    const body = JSON.stringify({ ppc: loyaltyId });

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch coupon token: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    const couponToken = responseData.access_token;

    if (!couponToken) {
      throw new Error("No access_token found in response");
    }


    if (!storeId) {
      const cookie = await chrome.cookies.get({
        url: "https://www.shoprite.com/",
        name: "MI9_RSID"
      });
      if (!cookie) {
        return { success: false, error: "MI9_RSID cookie not found" };
      }
      storeId = cookie.value;
      await chrome.storage.local.set({ shopRiteStoreId: storeId });
      console.log("Retrieved storeId from cookie:", storeId);
    }

    console.log("Fetching available coupons...");
    const couponsResponse = await fetchAvailableCoupons(couponToken, storeId);
    if (!couponsResponse.success) {
      console.error("fetchAvailableCoupons failed:", couponsResponse.error);
      return couponsResponse;
    }
    console.log("Fetched coupons:", couponsResponse.coupons.length);

    console.log("Clipping coupons...");
    const results = await clipCoupons(couponToken, couponsResponse.coupons);
    console.log("Coupon clipping completed:", results);

    return {
      success: true,
      totalCoupons: couponsResponse.coupons.length,
      clippedCount: results.filter(r => r.success).length,
      alreadyClipped: couponsResponse.coupons.filter(c => c.clipped).length,
      failedCount: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("Error clipping coupons:", error);
    return { success: false, error: error.message };
  }
}

async function fetchAvailableCoupons(couponToken, storeId) {
  try {
    console.log("fetchAvailableCoupons: Starting with", { couponToken: !!couponToken, storeId });
    const couponUrl = `https://shop-rite-web-prod.azurewebsites.net/proxy/shoprite/coupons/available?storeId=${storeId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(couponUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${couponToken}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch coupons: ${response.status} ${response.statusText}`);
    }

    const coupons = await response.json();
    console.log("fetchAvailableCoupons: Retrieved coupons:", coupons.length);
    return { success: true, coupons: coupons };
  } catch (error) {
    console.error("fetchAvailableCoupons: Error:", error.message);
    return { success: false, error: error.message };
  }
}

function isCouponAvailable(couponData) {
  return !couponData.redeemed && !couponData.expired && !couponData.clipped && couponData.enabled;
}

async function clipCoupons(token, coupons) {
  const results = [];
  const clipUrl = "https://shop-rite-web-prod.azurewebsites.net/proxy/shoprite/coupons/clip";

  for (const coupon of coupons) {
    if (!isCouponAvailable(coupon)) {
      results.push({
        couponId: coupon.coupon_id,
        success: false,
        status: "not_available",
        message: "Coupon is not available for clipping"
      });
      continue;
    }

    try {
      console.log("clipCoupons: Clipping coupon:", coupon.coupon_id);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(clipUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coupon_id: coupon.coupon_id,
          clip_token: coupon.clip_token
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed with status: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const success = responseData.result === true;

      results.push({
        couponId: coupon.coupon_id,
        success: success,
        status: response.status,
        message: success ? "Successfully clipped" : "Failed to clip"
      });
    } catch (error) {
      console.error("clipCoupons: Error clipping coupon:", coupon.coupon_id, error.message);
      results.push({
        couponId: coupon.coupon_id,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}