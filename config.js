// Configuration for DOM selectors and timing
// This file is injected before content.js to provide easy customization

window.AUTO_SUBMIT_CONFIG = {
	/**
	 * CSS selector for the input field
	 * Examples:
	 * - 'textarea' - any textarea
	 * - 'input[type="text"]' - text input
	 * - '#prompt-input' - specific ID
	 * - '.prompt-field' - specific class
	 * - 'textarea[placeholder*="prompt"]' - textarea with "prompt" in placeholder
	 */
	inputSelector: "textarea",

	/**
	 * CSS selector for the submit button
	 * Adobe Firefly specific: Button is inside Shadow DOM
	 * - Host element: firefly-video-generation-generate-button
	 * - Shadow button: sp-button[data-testid="video-generation-generate-button"]
	 */
	submitButtonSelector:
		'sp-button[data-testid="video-generation-generate-button"], sp-button#generate-button',

	/**
	 * Host element that contains Shadow DOM for the button
	 * Leave empty if button is in regular DOM
	 */
	shadowHostSelector: "firefly-video-generation-generate-button",

	/**
	 * Maximum time to wait for elements or button to become enabled (ms)
	 * Default: 180000 (3 minutes)
	 */
	waitTimeoutMs: 180000,

	/**
	 * Delay after clicking submit before processing next prompt (ms)
	 * Default: 1000 (1 second) - Just a small buffer between prompts
	 * Note: This can be overridden from the popup UI
	 * The actual wait time is controlled by waiting for button to become enabled again
	 */
	submitDelayMs: 1000,

	/**
	 * Auto-download video after generation complete
	 * Default: true
	 */
	autoDownload: true,
};

console.log("Auto Submit Config loaded:", window.AUTO_SUBMIT_CONFIG);
