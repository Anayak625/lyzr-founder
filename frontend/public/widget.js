(function() {
  const SCRIPT_TAG = document.currentScript;
  if (!SCRIPT_TAG) {
    console.error('Lyzr Widget: Could not find the script tag. Please ensure the script is loaded directly, not as a module.');
    return;
  }

  // --- Configuration ---
  const AGENT_ID = SCRIPT_TAG.getAttribute('data-agent-id');
  const APP_HOST = new URL(SCRIPT_TAG.src).origin; 

  if (!AGENT_ID) {
    console.error('Lyzr Widget: The "data-agent-id" attribute is missing from the script tag.');
    return;
  }

  // --- Widget Container on the Host Page ---
  const widgetContainer = document.createElement('div');
  widgetContainer.id = `lyzr-widget-container-${AGENT_ID}`;
  widgetContainer.style.position = 'fixed';
  widgetContainer.style.bottom = '20px';
  widgetContainer.style.right = '20px';
  widgetContainer.style.width = '400px'; 
  widgetContainer.style.height = '600px';
  widgetContainer.style.zIndex = '999999';
  document.body.appendChild(widgetContainer);

  // --- Shadow DOM for Style Isolation ---
  const shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
  
  // root element inside the shadow DOM where our React app will mount.
  const appRoot = document.createElement('div');
  appRoot.id = 'lyzr-widget-root'; 
  shadowRoot.appendChild(appRoot);

  // 1. Widget's CSS file
  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = `${APP_HOST}/assets/widget.css`; 
  shadowRoot.appendChild(cssLink);
  
  // 2. Widget's JavaScript Application
  const mainScript = document.createElement('script');
  mainScript.type = 'module';
  mainScript.src = `${APP_HOST}/assets/widget.js`; 
  
  mainScript.onload = () => {
    if (window.mountLyzrWidget) {
      window.mountLyzrWidget(appRoot, AGENT_ID);
    } else {
      console.error('Lyzr Widget: The mount function is not available. The widget script may have failed to load.');
    }
  };
  
  shadowRoot.appendChild(mainScript);
})();