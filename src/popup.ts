document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusContent = document.getElementById('status-content');

  if (!statusElement || !statusContent) return;

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('Cannot access tab URL');
    }

    const isNetflix = tab.url.includes('netflix.com');
    
    if (isNetflix) {
      statusElement.className = 'status status-active';
      statusContent.innerHTML = `
        <span class="emoji">✅</span>
        <strong>Active on Netflix</strong><br>
        <small>Title: ${tab.title || 'Loading...'}</small>
      `;
    } else {
      statusElement.className = 'status status-inactive';
      statusContent.innerHTML = `
        <span class="emoji">⏸️</span>
        <strong>Not on Netflix</strong><br>
        <small>Navigate to Netflix to use Titleflix</small>
      `;
    }
  } catch (error) {
    statusElement.className = 'status status-inactive';
    statusContent.innerHTML = `
      <span class="emoji">❌</span>
      <strong>Error</strong><br>
      <small>Cannot access current tab</small>
    `;
    console.error('Titleflix popup error:', error);
  }
});