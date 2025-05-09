document.getElementById('clipCoupons').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  const loader = document.getElementById('loader');
  const statsDiv = document.getElementById('couponStats');

  // Show loading state
  statusDiv.textContent = 'Checking login status...';
  loader.style.display = 'block';

  // Send message to background script to check if user is logged in
  chrome.runtime.sendMessage({action: "checkLogin"}, response => {
    if (response.loggedIn) {
      statusDiv.textContent = 'Starting to clip coupons...';

      // If logged in, send message to clip coupons
      chrome.runtime.sendMessage({action: "clipCoupons"}, result => {
        loader.style.display = 'none';

        if (result.success) {
          statusDiv.textContent = `Successfully clipped all coupons!`
          statsDiv.style.display = 'block';
        } else {
          statusDiv.textContent = `Error: ${result.error}`;
        }
      });
    } else {
      loader.style.display = 'none';
      statusDiv.textContent = 'Error: Please log in to ShopRite first!';
    }
  });
});