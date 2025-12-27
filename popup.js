// Popup UI Controller
// Handles user interaction and communication with background service worker

// DOM Elements
const promptInput = document.getElementById("promptInput");
const txtInput = document.getElementById("txtInput");
const browseBtn = document.getElementById("browseBtn");
const filePath = document.getElementById("filePath");
const delayInput = document.getElementById("delayInput");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const logsContainer = document.getElementById("logsContainer");
const autoDownloadCheckbox = document.getElementById("autoDownloadCheckbox");

// Status bar elements (3 fields in new UI)
const statusBarFields = document.querySelectorAll('.status-bar-field');
const statusBarMain = statusBarFields[0]; // Ready/Running/etc
const statusBarProgress = statusBarFields[1]; // 0 prompts
const statusBarTime = statusBarFields[2]; // 00:00:00

// Progress bar elements
const progressInfo = document.querySelector('.progress-info');
const progressBar = document.querySelector('.progress-bar');

// Track start time for elapsed time display
let startTime = null;

// Debug: Check if critical elements exist
console.log('DOM Elements loaded:', {
	promptInput: !!promptInput,
	txtInput: !!txtInput,
	browseBtn: !!browseBtn,
	filePath: !!filePath,
	statusBarFields: statusBarFields.length,
	progressInfo: !!progressInfo,
	progressBar: !!progressBar
});

/**
 * Add log entry to UI (Windows 95 list view style)
 * @param {string} level - Log level (info, success, warning, error)
 * @param {string} message - Log message
 * @param {string} timestamp - ISO timestamp
 */
function addLog(level, message, timestamp) {
	const time = new Date(timestamp);
	const timeStr = time.toLocaleTimeString("en-US", { hour12: false });

	// Map level to Windows 95 style type
	const typeMap = {
		info: 'INFO',
		success: 'OK',
		warning: 'WARN',
		error: 'ERROR'
	};
	const typeClass = level === 'success' ? 'log-ok' : `log-${level}`;
	const typeText = typeMap[level] || level.toUpperCase();

	const logRow = document.createElement("div");
	logRow.className = "list-row";
	logRow.innerHTML = `
		<div class="list-cell">${timeStr}</div>
		<div class="list-cell ${typeClass}">${typeText}</div>
		<div class="list-cell" title="${message}">${message}</div>
	`;

	logsContainer.appendChild(logRow);

	// Auto-scroll to bottom
	logsContainer.scrollTop = logsContainer.scrollHeight;

	// Keep max 100 logs (excluding header)
	const rows = logsContainer.querySelectorAll('.list-row');
	if (rows.length > 100) {
		rows[0].remove();
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
	// Safety check
	if (!statusBarMain || !statusBarProgress || !statusBarTime || !progressBar || !progressInfo) {
		console.error('Missing UI elements');
		return;
	}

	const isRunning = currentState.state === "running";
	const isPaused = currentState.state === "paused";
	const isIdle = currentState.state === "idle";
	const isFinished = currentState.state === "finished";

	// Update main status bar field with color coding
	const stateText = currentState.state.charAt(0).toUpperCase() + currentState.state.slice(1);
	statusBarMain.textContent = stateText;
	statusBarMain.className = 'status-bar-field';
	if (isRunning) statusBarMain.className += ' status-running';
	else if (isPaused) statusBarMain.className += ' status-paused';
	else if (currentState.state === 'error') statusBarMain.className += ' status-error';

	// Update progress status bar field
	statusBarProgress.textContent = `${currentState.totalPrompts} prompts`;

	// Update elapsed time
	if (isRunning && !startTime) {
		startTime = Date.now();
	} else if (isIdle || isFinished) {
		startTime = null;
	}
	if (startTime) {
		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
		const mins = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
		const secs = (elapsed % 60).toString().padStart(2, '0');
		statusBarTime.textContent = `${hours}:${mins}:${secs}`;
	} else {
		statusBarTime.textContent = '00:00:00';
	}

	// Update progress bar and info
	const percentage = currentState.totalPrompts > 0 
		? Math.round((currentState.currentIndex / currentState.totalPrompts) * 100) 
		: 0;
	progressBar.style.width = `${percentage}%`;
	progressInfo.innerHTML = `
		<span>Processing: ${currentState.currentIndex} of ${currentState.totalPrompts} prompts</span>
		<span>${percentage}%</span>
	`;

	// Update button states
	startBtn.disabled = isRunning;
	pauseBtn.disabled = isIdle || isFinished;
	stopBtn.disabled = isIdle || isFinished;

	// Update button text for pause/resume
	if (isPaused) {
		pauseBtn.innerHTML = '▶ Resume';
	} else {
		pauseBtn.innerHTML = '⏸ Pause';
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

// Browse button - trigger file input
browseBtn.addEventListener("click", () => {
	console.log('Browse button clicked');
	txtInput.click();
});

// TXT file selection
txtInput.addEventListener("change", async (e) => {
	console.log('File input changed', e.target.files);
	const file = e.target.files[0];

	if (file) {
		try {
			console.log('Loading file:', file.name);
			filePath.value = `Loading ${file.name}...`;
			const prompts = await parseTXT(file);
			console.log('Parsed prompts:', prompts.length);

			// Update manual input with parsed prompts
			promptInput.value = prompts.join("\n");
			filePath.value = file.name;
			filePath.title = `Loaded ${prompts.length} prompts from ${file.name}`;
			
			// Add success log
			addLog('success', `Loaded ${prompts.length} prompts from ${file.name}`, new Date().toISOString());
		} catch (error) {
			console.error("TXT parse error:", error);
			filePath.value = "Error loading file";
			filePath.title = error.message;
			alert("Failed to parse TXT: " + error.message);
			addLog('error', `Failed to load file: ${error.message}`, new Date().toISOString());
		}
	} else {
		console.log('No file selected');
		filePath.value = "";
		filePath.placeholder = "No file selected";
	}
});

// Control buttons
startBtn.addEventListener("click", handleStart);
pauseBtn.addEventListener("click", handlePause);
stopBtn.addEventListener("click", handleStop);

console.log('Event listeners attached:', {
	browseBtn: 'click',
	txtInput: 'change',
	startBtn: 'click',
	pauseBtn: 'click',
	stopBtn: 'click'
});

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

// Update elapsed time every second when running
setInterval(() => {
	if (currentState.state === 'running' && startTime) {
		const elapsed = Math.floor((Date.now() - startTime) / 1000);
		const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
		const mins = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
		const secs = (elapsed % 60).toString().padStart(2, '0');
		statusBarTime.textContent = `${hours}:${mins}:${secs}`;
	}
}, 1000);

console.log("Popup initialized");
