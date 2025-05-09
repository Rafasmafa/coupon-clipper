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
        sendResponse({ success: true });
      }
    );
    return true;
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    if (details.url.toLowerCase().includes("gettoken/auth/login") && details.method === "POST") {
      const xUserKeyHeader = details.requestHeaders.find(header => header.name.toLowerCase() === "x-user-key");
      if (xUserKeyHeader) {
        const xUserKey = xUserKeyHeader.value;
        chrome.storage.local.set(
          {
            shopRiteUserKey: xUserKey,
            userKeyTimestamp: Date.now()
          },
          () => {
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
      "shopRiteApiToken",
      "shopRiteStoreId",
      "shopRiteLoyaltyId",
      "loyaltyIdTimestamp",
      "shopRiteUserKey",
      "tokenTimestamp"
    ]);

    console.log("clipAllCoupons: Retrieved data:", {
      authToken: !!data.shopRiteAuthToken,
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
    }

    const couponsResponse = await fetchAvailableCoupons(couponToken, storeId);
    if (!couponsResponse.success) {
      console.error("fetchAvailableCoupons failed:", couponsResponse.error);
      return couponsResponse;
    }

    await clipCoupons(couponToken, couponsResponse.coupons.coupons);

    // Send a message to the content script in the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "refreshPage" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
          }
        });
      }
    });

    return {
      success: true,
      totalCoupons: couponsResponse.coupons.coupons.length,
      clippedCount: couponsResponse.coupons.coupons.length,
    };
  } catch (error) {
    console.error("Error clipping coupons:", error);
    return { success: false, error: error.message };
  }
}

async function fetchAvailableCoupons(couponToken, storeId) {
  try {
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
    return { success: true, coupons: coupons };
  } catch (error) {
    console.error("fetchAvailableCoupons: Error:", error.message);
    return { success: false, error: error.message };
  }
}

async function clipCoupons(token, coupons) {
  const clipUrl = "https://shop-rite-web-prod.azurewebsites.net/proxy/shoprite/coupons/clip";
  const coupons_ids = coupons.filter(coupon => coupon.isAvailableForClip).map(coupon => ({ couponId: coupon.id }));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

   const response = await fetch(clipUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(coupons_ids),
        signal: controller.signal
      });
   clearTimeout(timeoutId);
   }