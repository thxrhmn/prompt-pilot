// Content Script - DOM Automation for Adobe Firefly
// Handles nested Shadow DOM interaction for Adobe Firefly Video Generation

// Access shared config (injected before this script)
const CONFIG = window.AUTO_SUBMIT_CONFIG || {
	inputSelector: "textarea",
	submitButtonSelector:
		'sp-button[data-testid="video-generation-generate-button"]',
	shadowHostSelector: "firefly-video-generation-generate-button",
	waitTimeoutMs: 30000,
	submitDelayMs: 3000,
};

/**
 * Wait for element with polling (for nested shadow DOM)
 * @param {string} selector - CSS selector
 * @param {Document|ShadowRoot} root - Root to search in
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<HTMLElement>} Found element
 */
function waitForElement(selector, root = document, timeout = 10000) {
	return new Promise((resolve, reject) => {
		const startTime = Date.now();

		const checkElement = () => {
			const element = root.querySelector(selector);

			if (element) {
				resolve(element);
			} else if (Date.now() - startTime > timeout) {
				reject(new Error(`Timeout: ${selector} tidak ditemukan`));
			} else {
				setTimeout(checkElement, 200);
			}
		};

		checkElement();
	});
}

/**
 * Navigate through nested Shadow DOM to find textarea
 * Adobe Firefly structure:
 * firefly-video-generation →
 *   firefly-video-generation-generate-tab-contents →
 *     firefly-video-generation-prompt-panel →
 *       firefly-prompt →
 *         firefly-textfield →
 *           textarea
 */
async function findTextarea(timeout = 10000) {
	console.log("🔍 Searching for textarea in nested Shadow DOM...");

	try {
		// Level 1: firefly-video-generation
		const firefly = await waitForElement(
			"firefly-video-generation",
			document,
			timeout
		);
		console.log("✅ Level 1: firefly-video-generation found");
		const sr1 = firefly.shadowRoot;
		if (!sr1) throw new Error("Shadow root 1 not found");

		// Level 2: firefly-video-generation-generate-tab-contents
		const contents = await waitForElement(
			"firefly-video-generation-generate-tab-contents",
			sr1,
			timeout
		);
		console.log("✅ Level 2: generate-tab-contents found");
		const sr2 = contents.shadowRoot;
		if (!sr2) throw new Error("Shadow root 2 not found");

		// Level 3: firefly-video-generation-prompt-panel
		const promptPanel = await waitForElement(
			"firefly-video-generation-prompt-panel",
			sr2,
			timeout
		);
		console.log("✅ Level 3: prompt-panel found");
		const sr3 = promptPanel.shadowRoot;
		if (!sr3) throw new Error("Shadow root 3 not found");

		// Level 4: firefly-prompt
		const fireflyPrompt = await waitForElement(
			"firefly-prompt",
			sr3,
			timeout
		);
		console.log("✅ Level 4: firefly-prompt found");
		const sr4 = fireflyPrompt.shadowRoot;
		if (!sr4) throw new Error("Shadow root 4 not found");

		// Level 5: firefly-textfield
		const textField = await waitForElement("firefly-textfield", sr4, timeout);
		console.log("✅ Level 5: firefly-textfield found");
		const sr5 = textField.shadowRoot;
		if (!sr5) throw new Error("Shadow root 5 not found");

		// Level 6: textarea
		const textarea = await waitForElement("textarea", sr5, timeout);
		console.log("✅ Level 6: textarea found!", textarea);

		return textarea;
	} catch (error) {
		console.error("❌ Error finding textarea:", error);
		throw error;
	}
}

/**
 * Navigate through nested Shadow DOM to find Download button
 * Adobe Firefly structure:
 * firefly-video-generation →
 *   firefly-video-generation-generate-tab-contents →
 *     firefly-video-generation-video-panel →
 *       firefly-video-generation-core-video-player →
 *         firefly-media-timeline-download-button →
 *           sp-action-button
 */
async function findDownloadButton(timeout = 15000) {
	console.log("🔍 Searching for Download button in nested Shadow DOM...");

	try {
		// Level 1: firefly-video-generation
		const firefly = await waitForElement(
			"firefly-video-generation",
			document,
			timeout
		);
		console.log("✅ Level 1: firefly-video-generation found");
		const sr1 = firefly.shadowRoot;
		if (!sr1) throw new Error("Shadow root 1 not found");

		// Level 2: firefly-video-generation-generate-tab-contents
		const contents = await waitForElement(
			"firefly-video-generation-generate-tab-contents",
			sr1,
			timeout
		);
		console.log("✅ Level 2: generate-tab-contents found");
		const sr2 = contents.shadowRoot;
		if (!sr2) throw new Error("Shadow root 2 not found");

		// Level 3: firefly-video-generation-video-panel
		const videoPanel = await waitForElement(
			"firefly-video-generation-video-panel",
			sr2,
			timeout
		);
		console.log("✅ Level 3: video-panel found");
		const sr3 = videoPanel.shadowRoot;
		if (!sr3) throw new Error("Shadow root 3 not found");

		// Level 4: firefly-video-generation-core-video-player
		const player = await waitForElement(
			"firefly-video-generation-core-video-player",
			sr3,
			timeout
		);
		console.log("✅ Level 4: core-video-player found");
		const sr4 = player.shadowRoot;
		if (!sr4) throw new Error("Shadow root 4 not found");

		// Level 5: firefly-media-timeline-download-button
		const downloadHost = await waitForElement(
			"firefly-media-timeline-download-button",
			sr4,
			timeout
		);
		console.log("✅ Level 5: download-button host found");
		const sr5 = downloadHost.shadowRoot;
		if (!sr5) throw new Error("Shadow root 5 not found");

		// Level 6: sp-action-button
		const button = await waitForElement("sp-action-button", sr5, timeout);
		console.log("✅ Level 6: sp-action-button found!", button);

		return button;
	} catch (error) {
		console.error("❌ Error finding download button:", error);
		throw error;
	}
}

/**
 * Navigate through nested Shadow DOM to find Generate button
 * Adobe Firefly structure:
 * firefly-video-generation →
 *   firefly-video-generation-generate-tab-contents →
 *     firefly-video-generation-prompt-panel →
 *       firefly-video-generation-generate-button →
 *         sp-button
 */
async function findGenerateButton(timeout = 10000) {
	console.log("🔍 Searching for Generate button in nested Shadow DOM...");

	try {
		// Level 1: firefly-video-generation
		const firefly = await waitForElement(
			"firefly-video-generation",
			document,
			timeout
		);
		console.log("✅ Level 1: firefly-video-generation found");
		const sr1 = firefly.shadowRoot;
		if (!sr1) throw new Error("Shadow root 1 not found");

		// Level 2: firefly-video-generation-generate-tab-contents
		const contents = await waitForElement(
			"firefly-video-generation-generate-tab-contents",
			sr1,
			timeout
		);
		console.log("✅ Level 2: generate-tab-contents found");
		const sr2 = contents.shadowRoot;
		if (!sr2) throw new Error("Shadow root 2 not found");

		// Level 3: firefly-video-generation-prompt-panel
		const promptPanel = await waitForElement(
			"firefly-video-generation-prompt-panel",
			sr2,
			timeout
		);
		console.log("✅ Level 3: prompt-panel found");
		const sr3 = promptPanel.shadowRoot;
		if (!sr3) throw new Error("Shadow root 3 not found");

		// Level 4: firefly-video-generation-generate-button
		const generateHost = await waitForElement(
			"firefly-video-generation-generate-button",
			sr3,
			timeout
		);
		console.log("✅ Level 4: generate-button host found");
		const sr4 = generateHost.shadowRoot;
		if (!sr4) throw new Error("Shadow root 4 not found");

		// Level 5: sp-button
		const button = await waitForElement("sp-button", sr4, timeout);
		console.log("✅ Level 5: sp-button found!", button);

		return button;
	} catch (error) {
		console.error("❌ Error finding button:", error);
		throw error;
	}
}

/**
 * Wait for button to become enabled
 * Checks both 'disabled' attribute and 'aria-disabled'
 * Uses MutationObserver for efficient detection
 * @param {HTMLElement} element - Button element to watch
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<boolean>} True if element became enabled
 */
function waitForElementEnabled(element, timeout) {
	return new Promise((resolve, reject) => {
		// Check if already enabled (both disabled and aria-disabled)
		const isDisabled =
			element.hasAttribute("disabled") ||
			element.getAttribute("aria-disabled") === "true";

		if (!isDisabled) {
			console.log("✅ Button already enabled");
			resolve(true);
			return;
		}

		console.log("⏳ Waiting for button to become enabled...");
		let timeoutId;
		let observer;

		// Cleanup function
		const cleanup = () => {
			if (observer) observer.disconnect();
			if (timeoutId) clearTimeout(timeoutId);
		};

		// Set timeout
		timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error("Timeout waiting for button to become enabled"));
		}, timeout);

		// Create mutation observer to watch for disabled attribute changes
		observer = new MutationObserver((mutations) => {
			const isStillDisabled =
				element.hasAttribute("disabled") ||
				element.getAttribute("aria-disabled") === "true";

			if (!isStillDisabled) {
				console.log("✅ Button became enabled!");
				cleanup();
				resolve(true);
			}
		});

		// Observe both disabled and aria-disabled attributes
		observer.observe(element, {
			attributes: true,
			attributeFilter: ["disabled", "aria-disabled"],
		});

		// Check again in case it changed before observer started
		const recheckDisabled =
			element.hasAttribute("disabled") ||
			element.getAttribute("aria-disabled") === "true";
		if (!recheckDisabled) {
			console.log("✅ Button enabled during setup");
			cleanup();
			resolve(true);
		}
	});
}

/**
 * Query element in regular DOM or Shadow DOM
 * @param {string} selector - CSS selector
 * @param {string} shadowHostSelector - Optional shadow host selector
 * @returns {HTMLElement|null} Found element
 */
function querySelectorDeep(selector, shadowHostSelector = null) {
	// If shadow host is specified, look inside its shadow root
	if (shadowHostSelector) {
		const host = document.querySelector(shadowHostSelector);
		if (host && host.shadowRoot) {
			const element = host.shadowRoot.querySelector(selector);
			if (element) return element;
		}
	}

	// Check regular DOM
	let element = document.querySelector(selector);
	if (element) return element;

	// Search all shadow roots in the page
	const allElements = document.querySelectorAll("*");
	for (const el of allElements) {
		if (el.shadowRoot) {
			element = el.shadowRoot.querySelector(selector);
			if (element) return element;
		}
	}

	return null;
}

/**
 * Dispatch proper events to simulate user interaction
 * Required for frameworks like React/Vue to detect changes
 * @param {HTMLElement} element - Target element
 * @param {string} eventType - Event type (input, change, etc.)
 */
function dispatchInputEvent(element, eventType) {
	const event = new Event(eventType, {
		bubbles: true,
		cancelable: true,
		composed: true,
	});
	element.dispatchEvent(event);

	// Also dispatch InputEvent for better compatibility
	if (eventType === "input") {
		const inputEvent = new InputEvent("input", {
			bubbles: true,
			cancelable: true,
			composed: true,
			inputType: "insertText",
		});
		element.dispatchEvent(inputEvent);
	}
}

/**
 * Set value on input/textarea and dispatch events
 * @param {HTMLElement} element - Input or textarea element
 * @param {string} value - Value to set
 */
function setInputValue(element, value) {
	// Use native setter if available (for React)
	const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLInputElement.prototype,
		"value"
	)?.set;

	const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
		window.HTMLTextAreaElement.prototype,
		"value"
	)?.set;

	// Set value using native setter
	if (element.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
		nativeTextAreaValueSetter.call(element, value);
	} else if (element.tagName === "INPUT" && nativeInputValueSetter) {
		nativeInputValueSetter.call(element, value);
	} else {
		element.value = value;
	}

	// Dispatch events in proper order
	dispatchInputEvent(element, "input");
	dispatchInputEvent(element, "change");
	element.dispatchEvent(new Event("blur", { bubbles: true }));
}

/**
 * Click element with proper event dispatching
 * Simplified to prevent double-click in Shadow DOM
 * @param {HTMLElement} element - Element to click
 */
function clickElement(element) {
	// Focus element first
	element.focus();

	// Only use native click - no event dispatches
	// Multiple events can cause double-click in Shadow DOM components
	element.click();
}

/**
 * Download the generated video
 * @returns {Promise<boolean>} True if download successful
 */
async function downloadVideo() {
	try {
		console.log("⬇️ Starting video download...");

		// Find download button
		const downloadButton = await findDownloadButton(15000);

		// Check if button is enabled
		const isDisabled =
			downloadButton.hasAttribute("disabled") ||
			downloadButton.getAttribute("aria-disabled") === "true";

		if (isDisabled) {
			console.log("❌ Download button is disabled");
			return false;
		}

		// Click download
		console.log("👆 Clicking download button...");
		downloadButton.click();

		// Wait a bit for download to start
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log("✅ Download initiated successfully");
		return true;
	} catch (error) {
		console.error("❌ Error downloading video:", error);
		return false;
	}
}

/**
 * Main automation function - submit a single prompt
 * @param {string} prompt - The prompt text to submit
 * @param {number} delay - Delay after submission in ms
 * @returns {Promise<object>} Result object
 */
async function submitPrompt(prompt, delay) {
	try {
		console.log("🚀 Starting prompt submission:", prompt);

		// Step 1: Find textarea in nested Shadow DOM
		console.log("📝 Finding textarea...");
		const textarea = await findTextarea(CONFIG.waitTimeoutMs);

		// Step 2: Find Generate button in nested Shadow DOM
		console.log("🔘 Finding Generate button...");
		const button = await findGenerateButton(CONFIG.waitTimeoutMs);

		// Step 3: Wait for button to become enabled
		console.log("⏳ Waiting for button to become enabled...");
		await waitForElementEnabled(button, CONFIG.waitTimeoutMs);
		console.log("✅ Button is enabled");

		// Step 4: Clear existing value if present
		if (textarea.value) {
			console.log("🗑️ Clearing existing value");
			setInputValue(textarea, "");
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		// Step 5: Set the prompt value
		console.log("✏️ Setting prompt value...");
		setInputValue(textarea, prompt);

		// Give time for value to be processed
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Step 6: Wait for button to be enabled after input (may become disabled briefly)
		console.log("⏳ Waiting for button ready after input...");
		await waitForElementEnabled(button, CONFIG.waitTimeoutMs);
		console.log("✅ Button ready");

		// Step 7: Click submit button
		console.log("👆 Clicking Generate button...");
		clickElement(button);

		// Small buffer to ensure click is processed
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Step 8: Wait for configured delay after submission
		console.log(`⏱️ Waiting ${delay}ms after submission...`);
		await new Promise((resolve) => setTimeout(resolve, delay));

		// Step 9: Download video if auto-download enabled
		if (CONFIG.autoDownload) {
			console.log(
				"📥 Auto-download enabled, attempting to download video..."
			);
			try {
				const downloaded = await downloadVideo();
				if (downloaded) {
					console.log("✅ Video download initiated successfully");
				} else {
					console.log("⚠️ Video download failed or button not ready");
					sendLog("warning", "⚠️ Download button not ready");
				}
			} catch (error) {
				console.log("⚠️ Download error (non-fatal):", error.message);
				sendLog("warning", `⚠️ Download failed: ${error.message}`);
				// Don't fail the entire submission just because download failed
			}
		}

		console.log("✅ Prompt submitted successfully");
		return { success: true };
	} catch (error) {
		console.error("❌ Error submitting prompt:", error);
		sendLog("error", `❌ Submission error: ${error.message}`);
		return { success: false, error: error.message };
	}
}

/**
 * Handle messages from background service worker
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Content script received message:", message.action);

	if (message.action === "submitPrompt") {
		// Override config if autoDownload is specified
		if (typeof message.autoDownload !== "undefined") {
			CONFIG.autoDownload = message.autoDownload;
			console.log("Auto-download setting:", CONFIG.autoDownload);
		}

		// Process prompt asynchronously
		submitPrompt(message.prompt, message.delay || CONFIG.submitDelayMs)
			.then((result) => sendResponse(result))
			.catch((error) =>
				sendResponse({ success: false, error: error.message })
			);

		// Return true to indicate async response
		return true;
	}

	return false;
});

/**
 * Send log to background (which forwards to UI)
 * Only for errors and critical events
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} message - Log message
 */
function sendLog(level, message) {
	try {
		chrome.runtime
			.sendMessage({
				action: "log",
				level: level,
				message: message,
				timestamp: new Date().toISOString(),
			})
			.catch(() => {
				// Background might not be ready, ignore
			});
	} catch (error) {
		// Ignore if background not available
	}
}

// Log when content script is loaded (only in console, not UI)
console.log("🎬 Auto Submit content script loaded for Adobe Firefly");
console.log("Configuration:", CONFIG);
