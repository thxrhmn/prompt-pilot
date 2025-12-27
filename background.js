// Background Service Worker (Manifest V3)
// Manages queue state and coordinates automation across tabs

// Global state
let state = {
	state: "idle", // idle, running, paused, finished, error
	prompts: [],
	currentIndex: 0,
	totalPrompts: 0,
	currentPrompt: "",
	delay: 1000,
	tabId: null,
	autoDownload: true,
};

/**
 * Broadcast state update to all popup instances
 */
async function broadcastState() {
	try {
		// Try to send to popup if it's open
		chrome.runtime
			.sendMessage({
				action: "stateUpdate",
				state: {
					state: state.state,
					currentIndex: state.currentIndex,
					totalPrompts: state.totalPrompts,
					currentPrompt: state.currentPrompt,
				},
			})
			.catch(() => {
				// Popup not open, ignore error
			});
	} catch (error) {
		// Ignore - popup might not be open
	}

	// Also save to storage for persistence
	await chrome.storage.local.set({ automationState: state });
}

/**
 * Send log message to popup
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} message - Log message
 */
async function sendLog(level, message) {
	try {
		chrome.runtime
			.sendMessage({
				action: "log",
				level: level,
				message: message,
				timestamp: new Date().toISOString(),
			})
			.catch(() => {});
	} catch (error) {
		// Ignore if popup not open
	}
}

/**
 * Inject content script into tab if not already injected
 * @param {number} tabId - Tab ID
 */
async function injectContentScript(tabId) {
	try {
		await chrome.scripting.executeScript({
			target: { tabId: tabId },
			files: ["config.js", "content.js"],
		});
		await sendLog("info", "Content script injected");
		// Wait a bit for script to initialize
		await new Promise((resolve) => setTimeout(resolve, 500));
	} catch (error) {
		console.error("Failed to inject content script:", error);
		await sendLog("error", `Failed to inject script: ${error.message}`);
		throw error;
	}
}

/**
 * Send message to content script in active tab with retry
 * @param {number} tabId - Tab ID to send message to
 * @param {object} message - Message to send
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>} Response from content script
 */
async function sendToContent(tabId, message, maxRetries = 2) {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await new Promise((resolve, reject) => {
				chrome.tabs.sendMessage(tabId, message, (response) => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve(response);
					}
				});
			});
		} catch (error) {
			if (attempt < maxRetries) {
				await sendLog("warning", `Retry ${attempt}/${maxRetries}...`);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} else {
				throw error;
			}
		}
	}
}

/**
 * Get the currently active tab
 * @returns {Promise<number>} Active tab ID
 */
async function getActiveTab() {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	if (tabs.length === 0) {
		throw new Error("No active tab found");
	}
	return tabs[0].id;
}

/**
 * Process next prompt in queue
 */
async function processNextPrompt() {
	// Check if we should continue
	if (state.state !== "running") {
		console.log("Processing stopped - state is", state.state);
		return;
	}

	if (state.currentIndex >= state.totalPrompts) {
		console.log("Queue finished");
		await sendLog("success", "✅ All prompts completed!");
		state.state = "finished";
		state.currentPrompt = "";
		await broadcastState();
		return;
	}

	// Get current prompt
	const prompt = state.prompts[state.currentIndex];
	const promptPreview =
		prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt;
	console.log(
		`Processing prompt ${state.currentIndex + 1}/${state.totalPrompts}:`,
		prompt
	);
	await sendLog(
		"info",
		`Processing ${state.currentIndex + 1}/${
			state.totalPrompts
		}: ${promptPreview}`
	);

	// Set current prompt AFTER logging but BEFORE sending
	state.currentPrompt = promptPreview;
	await broadcastState();

	try {
		// Send prompt to content script
		const response = await sendToContent(state.tabId, {
			action: "submitPrompt",
			prompt: prompt,
			delay: state.delay,
			autoDownload: state.autoDownload,
		});

		// Check if state is still running after async operation
		// User might have clicked Stop while content script was processing
		if (state.state !== "running") {
			console.log(
				"State changed to",
				state.state,
				"during processing. Stopping."
			);
			await sendLog("warning", "⚠️ Stopped mid-processing");
			return;
		}

		if (response.success) {
			console.log("Prompt submitted successfully");
			await sendLog(
				"success",
				`✓ Submitted ${state.currentIndex + 1}/${state.totalPrompts}`
			);

			// Move to next prompt
			state.currentIndex++;

			// Check state again before scheduling next
			if (
				state.state === "running" &&
				state.currentIndex < state.totalPrompts
			) {
				await broadcastState();
				// Small delay before starting next prompt processing
				setTimeout(() => processNextPrompt(), 100);
			} else {
				// Queue complete
				state.state = "finished";
				state.currentPrompt = "";
				await broadcastState();
			}
		} else {
			throw new Error(response.error || "Submission failed");
		}
	} catch (error) {
		console.error("Error processing prompt:", error);
		await sendLog("error", `✗ Error: ${error.message}`);
		state.state = "error";
		state.currentPrompt = `Error: ${error.message}`;
		await broadcastState();
	}
}

/**
 * Start automation
 * @param {string[]} prompts - Array of prompts to process
 * @param {number} delay - Delay in ms after each submission
 * @param {boolean} autoDownload - Auto-download videos after generation
 */
async function startAutomation(prompts, delay, autoDownload = true) {
	try {
		await sendLog("info", "🚀 Starting automation...");

		// Get active tab
		const tabId = await getActiveTab();
		await sendLog("info", `Tab ID: ${tabId}`);

		// Always inject content script to ensure it's loaded
		await sendLog("info", "Injecting content script...");
		await injectContentScript(tabId);

		// Initialize state
		state = {
			state: "running",
			prompts: prompts,
			currentIndex: 0,
			totalPrompts: prompts.length,
			currentPrompt: "",
			delay: delay,
			tabId: tabId,
			autoDownload: autoDownload,
		};

		await broadcastState();
		await sendLog(
			"success",
			`Loaded ${prompts.length} prompts, delay: ${delay}ms, auto-download: ${
				autoDownload ? "ON" : "OFF"
			}`
		);

		// Start processing
		processNextPrompt();

		return { success: true };
	} catch (error) {
		console.error("Start automation error:", error);
		await sendLog("error", `❌ Failed to start: ${error.message}`);
		state.state = "error";
		state.currentPrompt = error.message;
		await broadcastState();
		return { success: false, error: error.message };
	}
}

/**
 * Pause automation
 */
async function pauseAutomation() {
	if (state.state === "running") {
		state.state = "paused";
		await sendLog("warning", "⏸️ Automation paused");
		await broadcastState();
		return { success: true };
	}
	return { success: false, error: "Not running" };
}

/**
 * Resume automation
 */
async function resumeAutomation() {
	if (state.state === "paused") {
		state.state = "running";
		await sendLog("info", "▶️ Automation resumed");
		await broadcastState();

		// Continue processing
		processNextPrompt();

		return { success: true };
	}
	return { success: false, error: "Not paused" };
}

/**
 * Stop automation
 */
async function stopAutomation() {
	if (state.state === "running" || state.state === "paused") {
		const stoppedAt = `${state.currentIndex}/${state.totalPrompts}`;
		await sendLog("warning", `⏹️ Automation stopped at ${stoppedAt}`);
		state.state = "idle";
		state.currentPrompt = "";
		await broadcastState();
		return { success: true };
	}
	return { success: false, error: "Not running" };
}

/**
 * Get current state
 */
function getState() {
	return {
		state: {
			state: state.state,
			currentIndex: state.currentIndex,
			totalPrompts: state.totalPrompts,
			currentPrompt: state.currentPrompt,
		},
	};
}

// Message handler for popup and content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Background received message:", message.action);

	// Handle async operations
	(async () => {
		try {
			let response;

			switch (message.action) {
				case "start":
					response = await startAutomation(
						message.prompts,
						message.delay,
						message.autoDownload
					);
					break;

				case "pause":
					response = await pauseAutomation();
					break;

				case "resume":
					response = await resumeAutomation();
					break;

				case "stop":
					response = await stopAutomation();
					break;

				case "getState":
					response = getState();
					break;

				case "log":
					// Forward log from content script to popup
					chrome.runtime
						.sendMessage({
							action: "log",
							level: message.level,
							message: message.message,
							timestamp: message.timestamp,
						})
						.catch(() => {});
					response = { success: true };
					break;

				default:
					response = { success: false, error: "Unknown action" };
			}

			sendResponse(response);
		} catch (error) {
			console.error("Message handler error:", error);
			sendResponse({ success: false, error: error.message });
		}
	})();

	// Return true to indicate we'll send response asynchronously
	return true;
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
	chrome.sidePanel.open({ windowId: tab.windowId });
});

// Restore state on startup
chrome.runtime.onStartup.addListener(async () => {
	try {
		const result = await chrome.storage.local.get("automationState");
		if (result.automationState) {
			// Restore but reset to idle if it was running
			state = result.automationState;
			if (state.state === "running" || state.state === "paused") {
				state.state = "idle";
				state.currentPrompt = "";
			}
		}
	} catch (error) {
		console.error("Error restoring state:", error);
	}
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
	console.log("Auto Submit Prompt Queue extension installed");
});

console.log("Background service worker initialized");
