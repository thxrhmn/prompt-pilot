// Popup UI Controller
// Handles user interaction and communication with background service worker

// DOM Elements
const promptInput = document.getElementById("promptInput");
const txtInput = document.getElementById("txtInput");
const fileName = document.getElementById("fileName");
const delayInput = document.getElementById("delayInput");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const statusState = document.getElementById("statusState");
const statusProgress = document.getElementById("statusProgress");
const statusCurrent = document.getElementById("statusCurrent");
const logsContainer = document.getElementById("logsContainer");
const autoDownloadCheckbox = document.getElementById("autoDownloadCheckbox");

/**
 * Add log entry to UI
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} message - Log message
 * @param {string} timestamp - ISO timestamp
 */
function addLog(level, message, timestamp) {
	const time = new Date(timestamp);
	const timeStr = time.toLocaleTimeString("en-US", { hour12: false });

	const logEntry = document.createElement("div");
	logEntry.className = `log-entry log-${level}`;
	logEntry.innerHTML = `<span class="log-time">${timeStr}</span><span class="log-level">${level}</span>${message}`;

	logsContainer.appendChild(logEntry);

	// Auto-scroll to bottom
	logsContainer.scrollTop = logsContainer.scrollHeight;

	// Keep max 100 logs
	while (logsContainer.children.length > 100) {
		logsContainer.removeChild(logsContainer.firstChild);
	}
}

// State
let currentState = {
	state: "idle",
	currentIndex: 0,
	totalPrompts: 0,
	currentPrompt: "",
};

/**
 * Parse TXT file - one prompt per line
 * @param {File} file - TXT file object
 * @returns {Promise<string[]>} Array of prompts
 */
async function parseTXT(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const text = e.target.result;
				const lines = text.split(/\r?\n/);

				// Each line is a prompt, filter empty lines
				const prompts = lines
					.map((line) => line.trim())
					.filter((line) => line.length > 0);

				resolve(prompts);
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

/**
 * Get prompts from manual input (one per line)
 * @returns {string[]} Array of prompts
 */
function getManualPrompts() {
	const text = promptInput.value.trim();
	if (!text) return [];

	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

/**
 * Update UI based on current state
 */
function updateUI() {
	// Update state display with color coding
	statusState.textContent =
		currentState.state.charAt(0).toUpperCase() + currentState.state.slice(1);
	statusState.className = "status-value state-" + currentState.state;

	// Update progress
	statusProgress.textContent = `${currentState.currentIndex} / ${currentState.totalPrompts}`;

	// Update current prompt (truncate if too long)
	const currentText = currentState.currentPrompt || "—";
	statusCurrent.textContent =
		currentText.length > 50
			? currentText.substring(0, 50) + "..."
			: currentText;

	// Update button states
	const isRunning = currentState.state === "running";
	const isPaused = currentState.state === "paused";
	const isIdle = currentState.state === "idle";
	const isFinished = currentState.state === "finished";

	startBtn.disabled = isRunning;
	pauseBtn.disabled = isIdle || isFinished;
	stopBtn.disabled = isIdle || isFinished;

	// Update button text for pause/resume
	if (isPaused) {
		pauseBtn.textContent = "▶️ Resume";
	} else {
		pauseBtn.textContent = "⏸️ Pause";
	}

	// Disable inputs during operation
	promptInput.disabled = isRunning || isPaused;
	txtInput.disabled = isRunning || isPaused;
	delayInput.disabled = isRunning || isPaused;
}

/**
 * Send message to background service worker
 * @param {object} message - Message object to send
 * @returns {Promise<any>} Response from background
 */
async function sendToBackground(message) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(message, (response) => {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve(response);
			}
		});
	});
}

/**
 * Start automation process
 */
async function handleStart() {
	try {
		// Get prompts from either manual input or CSV
		let prompts = getManualPrompts();

		if (prompts.length === 0) {
			alert("Please enter prompts or upload a TXT file");
			return;
		}

		// Get delay setting
		const delay = parseInt(delayInput.value) || 1000;

		// Get auto-download setting
		const autoDownload = autoDownloadCheckbox.checked;

		// Send start command to background
		const response = await sendToBackground({
			action: "start",
			prompts: prompts,
			delay: delay,
			autoDownload: autoDownload,
		});

		if (response.success) {
			console.log("Automation started");
		} else {
			alert("Failed to start: " + (response.error || "Unknown error"));
		}
	} catch (error) {
		console.error("Start error:", error);
		alert("Error starting automation: " + error.message);
	}
}

/**
 * Pause/Resume automation
 */
async function handlePause() {
	try {
		const action = currentState.state === "paused" ? "resume" : "pause";
		const response = await sendToBackground({ action });

		if (!response.success) {
			alert(
				"Failed to " + action + ": " + (response.error || "Unknown error")
			);
		}
	} catch (error) {
		console.error("Pause/Resume error:", error);
		alert("Error: " + error.message);
	}
}

/**
 * Stop automation
 */
async function handleStop() {
	try {
		const response = await sendToBackground({ action: "stop" });

		if (!response.success) {
			alert("Failed to stop: " + (response.error || "Unknown error"));
		}
	} catch (error) {
		console.error("Stop error:", error);
		alert("Error: " + error.message);
	}
}

/**
 * Request current state from background
 */
async function requestStateUpdate() {
	try {
		const response = await sendToBackground({ action: "getState" });
		if (response.state) {
			currentState = response.state;
			updateUI();
		}
	} catch (error) {
		console.error("State update error:", error);
	}
}

// Event Listeners

// TXT file selection
txtInput.addEventListener("change", async (e) => {
	const file = e.target.files[0];

	if (file) {
		try {
			fileName.textContent = `Loading ${file.name}...`;
			const prompts = await parseTXT(file);

			// Update manual input with parsed prompts
			promptInput.value = prompts.join("\n");
			fileName.textContent = `✓ Loaded ${prompts.length} prompts from ${file.name}`;
		} catch (error) {
			console.error("TXT parse error:", error);
			fileName.textContent = "✗ Error parsing TXT file";
			alert("Failed to parse TXT: " + error.message);
		}
	} else {
		fileName.textContent = "No file selected";
	}
});

// Control buttons
startBtn.addEventListener("click", handleStart);
pauseBtn.addEventListener("click", handlePause);
stopBtn.addEventListener("click", handleStop);

// Listen for state updates and logs from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === "stateUpdate") {
		currentState = message.state;
		updateUI();
		sendResponse({ received: true });
	} else if (message.action === "log") {
		addLog(message.level, message.message, message.timestamp);
		sendResponse({ received: true });
	}
	return true; // Keep message channel open for async response
});

// Initialize - request current state
requestStateUpdate();

// Poll for state updates (backup in case messages are missed)
setInterval(requestStateUpdate, 1000);

console.log("Popup initialized");
