// ===== CONSTANTS & STATE =====
const STORAGE_KEY = "secretChatHistory";
let compilationHistory = [];

// ===== DOM ELEMENTS =====
// Encoder elements
const textInput = document.getElementById("text-input");
const encodeBtn = document.getElementById("encode-btn");
const binaryOutputContainer = document.getElementById(
  "binary-output-container",
);
const binaryOutput = document.getElementById("binary-output");
const copyBinaryBtn = document.getElementById("copy-binary-btn");

// Decoder elements
const binaryInput = document.getElementById("binary-input");
const decodeBtn = document.getElementById("decode-btn");
const textOutputContainer = document.getElementById("text-output-container");
const textOutput = document.getElementById("text-output");
const copyTextBtn = document.getElementById("copy-text-btn");
const errorMessage = document.getElementById("error-message");

// History elements
const historyList = document.getElementById("history-list");
const clearAllBtn = document.getElementById("clear-all-btn");

// ===== CORE ENCODING/DECODING FUNCTIONS =====

/**
 * Convert text to 8-bit ASCII binary representation
 * @param {string} text - The input text to encode
 * @returns {string} - Space-separated binary string
 */
function textToBinary(text) {
  if (!text || text.trim() === "") {
    return "";
  }

  return text
    .split("")
    .map((char) => {
      // Get ASCII code and convert to 8-bit binary
      const binary = char.charCodeAt(0).toString(2).padStart(8, "0");
      return binary;
    })
    .join(" ");
}

/**
 * Convert binary string back to text
 * @param {string} binary - Space-separated binary string
 * @returns {object} - {success: boolean, result: string, error: string}
 */
function binaryToText(binary) {
  if (!binary || binary.trim() === "") {
    return { success: false, error: "Binary input is empty" };
  }

  // Remove extra spaces and split into bytes
  const bytes = binary.trim().split(/\s+/);

  // Validate each byte
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];

    // Check if byte contains only 0 and 1
    if (!/^[01]+$/.test(byte)) {
      return {
        success: false,
        error: `Invalid binary: Contains non-binary characters at position ${i + 1}`,
      };
    }

    // Check if byte is exactly 8 bits
    if (byte.length !== 8) {
      return {
        success: false,
        error: `Invalid binary: Byte ${i + 1} has ${byte.length} bits (expected 8)`,
      };
    }
  }

  // Convert binary to text
  try {
    const text = bytes
      .map((byte) => String.fromCharCode(parseInt(byte, 2)))
      .join("");

    return { success: true, result: text };
  } catch (error) {
    return { success: false, error: "Failed to decode binary" };
  }
}

// ===== LOCAL STORAGE FUNCTIONS =====

/**
 * Load compilation history from localStorage
 */
function loadHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      compilationHistory = JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load history:", error);
    compilationHistory = [];
  }
}

/**
 * Save compilation history to localStorage
 */
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(compilationHistory));
  } catch (error) {
    console.error("Failed to save history:", error);
  }
}

/**
 * Add a new compilation to history
 * @param {string} type - 'encode' or 'decode'
 * @param {string} original - Original input
 * @param {string} result - Result output
 */
function addToHistory(type, original, result) {
  const historyItem = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    type: type,
    original: original,
    result: result,
    timestamp: new Date().toISOString(),
  };

  // Add to beginning of array (newest first)
  compilationHistory.unshift(historyItem);

  // Limit history to 100 items
  if (compilationHistory.length > 100) {
    compilationHistory = compilationHistory.slice(0, 100);
  }

  saveHistory();
  renderHistory();
  renderPieChart();
}

/**
 * Delete a specific history item
 * @param {string} id - The ID of the item to delete
 */
function deleteHistoryItem(id) {
  compilationHistory = compilationHistory.filter((item) => item.id !== id);
  saveHistory();
  renderHistory();
  renderPieChart();
}

/**
 * Clear all history
 */
function clearAllHistory() {
  if (compilationHistory.length === 0) {
    return;
  }

  if (confirm("Are you sure you want to clear all compilation history?")) {
    compilationHistory = [];
    saveHistory();
    renderHistory();
    renderPieChart();
  }
}

// ===== UI FUNCTIONS =====

/**
 * Format timestamp for display
 * @param {string} isoString - ISO date string
 * @returns {string} - Formatted date/time
 */
function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

  return (
    date.toLocaleDateString() +
    " " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

/**
 * Truncate text for preview
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Render the history list
 */
function renderHistory() {
  if (compilationHistory.length === 0) {
    historyList.innerHTML = `
            <div class="empty-state">
                <p>No compilations yet</p>
                <p class="empty-state-sub">Your encoding and decoding history will appear here</p>
            </div>
        `;
    return;
  }

  historyList.innerHTML = compilationHistory
    .map((item) => {
      const preview =
        item.type === "encode"
          ? truncateText(item.original)
          : truncateText(item.result);

      return `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-type">${item.type}</span>
                    <span class="history-timestamp">${formatTimestamp(item.timestamp)}</span>
                </div>
                <div class="history-preview">${preview}</div>
                <div class="history-actions">
                    <button class="history-btn copy-history-btn" data-id="${item.id}">Copy</button>
                    <button class="history-btn delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;
    })
    .join("");

  // Add event listeners to history buttons
  document.querySelectorAll(".copy-history-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      const item = compilationHistory.find((h) => h.id === id);
      if (item) {
        copyToClipboard(item.result, e.target);
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      deleteHistoryItem(id);
    });
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @param {HTMLElement} button - Button element (for feedback)
 */
function copyToClipboard(text, button) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      const originalText = button.textContent;
      button.textContent = "✓ Copied!";
      button.style.background = "rgba(0, 255, 136, 0.2)";
      button.style.borderColor = "#00ff88";
      button.style.color = "#00ff88";

      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = "";
        button.style.borderColor = "";
        button.style.color = "";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorMessage.classList.add("hidden");
  }, 5000);
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.classList.add("hidden");
}

/**
 * Render the pie chart with encode/decode statistics
 */
function renderPieChart() {
  const encodeCount = compilationHistory.filter(
    (item) => item.type === "encode",
  ).length;
  const decodeCount = compilationHistory.filter(
    (item) => item.type === "decode",
  ).length;
  const total = encodeCount + decodeCount;

  // Update legend counts
  document.getElementById("encode-count").textContent = encodeCount;
  document.getElementById("decode-count").textContent = decodeCount;

  // If no data, show empty chart
  if (total === 0) {
    const svg = document.getElementById("pie-chart");
    svg.innerHTML =
      '<circle cx="100" cy="100" r="90" fill="rgba(10, 5, 21, 0.4)"/>';
    return;
  }

  // Calculate angle for encode slice
  const encodeAngle = (encodeCount / total) * 360;

  // Create SVG pie chart
  const svg = document.getElementById("pie-chart");
  svg.innerHTML = "";

  // Create defs for gradients
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

  // Encode gradient (cyan to green)
  const encodeGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient",
  );
  encodeGradient.setAttribute("id", "encodeGradient");
  encodeGradient.setAttribute("x1", "0%");
  encodeGradient.setAttribute("y1", "0%");
  encodeGradient.setAttribute("x2", "100%");
  encodeGradient.setAttribute("y2", "100%");
  encodeGradient.innerHTML =
    '<stop offset="0%" style="stop-color:#00ffcc;stop-opacity:1" /><stop offset="100%" style="stop-color:#00ff88;stop-opacity:1" />';

  // Decode gradient (bright cyan to bright green)
  const decodeGradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient",
  );
  decodeGradient.setAttribute("id", "decodeGradient");
  decodeGradient.setAttribute("x1", "0%");
  decodeGradient.setAttribute("y1", "0%");
  decodeGradient.setAttribute("x2", "100%");
  decodeGradient.setAttribute("y2", "100%");
  decodeGradient.innerHTML =
    '<stop offset="0%" style="stop-color:#00e5ff;stop-opacity:1" /><stop offset="100%" style="stop-color:#39ff14;stop-opacity:1" />';

  defs.appendChild(encodeGradient);
  defs.appendChild(decodeGradient);
  svg.appendChild(defs);

  // Helper function to convert polar to cartesian coordinates
  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  }

  // Function to create pie slice path
  function createPieSlice(startAngle, endAngle, fill) {
    const start = polarToCartesian(100, 100, 80, endAngle);
    const end = polarToCartesian(100, 100, 80, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = [
      "M",
      100,
      100,
      "L",
      start.x,
      start.y,
      "A",
      80,
      80,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "Z",
    ].join(" ");

    path.setAttribute("d", d);
    path.setAttribute("fill", fill);
    path.setAttribute("stroke", "rgba(10, 5, 21, 0.8)");
    path.setAttribute("stroke-width", "2");
    path.style.transition = "all 0.3s ease";

    path.addEventListener("mouseenter", function () {
      this.setAttribute("opacity", "0.8");
    });

    path.addEventListener("mouseleave", function () {
      this.setAttribute("opacity", "1");
    });

    return path;
  }

  // Draw slices
  if (encodeCount > 0) {
    svg.appendChild(createPieSlice(0, encodeAngle, "url(#encodeGradient)"));
  }

  if (decodeCount > 0) {
    svg.appendChild(createPieSlice(encodeAngle, 360, "url(#decodeGradient)"));
  }

  // Add center circle for donut effect
  const centerCircle = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "circle",
  );
  centerCircle.setAttribute("cx", "100");
  centerCircle.setAttribute("cy", "100");
  centerCircle.setAttribute("r", "50");
  centerCircle.setAttribute("fill", "rgba(10, 5, 21, 0.9)");
  svg.appendChild(centerCircle);

  // Add total count text in center
  const totalText = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  totalText.setAttribute("x", "100");
  totalText.setAttribute("y", "95");
  totalText.setAttribute("text-anchor", "middle");
  totalText.setAttribute("font-size", "24");
  totalText.setAttribute("font-weight", "bold");
  totalText.setAttribute("fill", "#00ffcc");
  totalText.textContent = total;
  svg.appendChild(totalText);

  const totalLabel = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  totalLabel.setAttribute("x", "100");
  totalLabel.setAttribute("y", "115");
  totalLabel.setAttribute("text-anchor", "middle");
  totalLabel.setAttribute("font-size", "12");
  totalLabel.setAttribute("fill", "#a0f0e0");
  totalLabel.textContent = "Total";
  svg.appendChild(totalLabel);
}

// ===== EVENT HANDLERS =====

/**
 * Handle encode button click
 */
function handleEncode() {
  const text = textInput.value;

  if (!text || text.trim() === "") {
    binaryOutputContainer.classList.add("hidden");
    return;
  }

  const binary = textToBinary(text);
  binaryOutput.textContent = binary;
  binaryOutputContainer.classList.remove("hidden");

  // Add to history
  addToHistory("encode", text, binary);
}

/**
 * Handle decode button click
 */
function handleDecode() {
  hideError();
  const binary = binaryInput.value;

  if (!binary || binary.trim() === "") {
    textOutputContainer.classList.add("hidden");
    return;
  }

  const result = binaryToText(binary);

  if (result.success) {
    textOutput.textContent = result.result;
    textOutputContainer.classList.remove("hidden");

    // Add to history
    addToHistory("decode", binary, result.result);
  } else {
    textOutputContainer.classList.add("hidden");
    showError(result.error);
  }
}

/**
 * Handle copy binary button click
 */
function handleCopyBinary() {
  copyToClipboard(binaryOutput.textContent, copyBinaryBtn);
}

/**
 * Handle copy text button click
 */
function handleCopyText() {
  copyToClipboard(textOutput.textContent, copyTextBtn);
}

// ===== EVENT LISTENERS =====
encodeBtn.addEventListener("click", handleEncode);
decodeBtn.addEventListener("click", handleDecode);
copyBinaryBtn.addEventListener("click", handleCopyBinary);
copyTextBtn.addEventListener("click", handleCopyText);
clearAllBtn.addEventListener("click", clearAllHistory);

// Allow Enter key to trigger encoding/decoding
textInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    handleEncode();
  }
});

binaryInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    handleDecode();
  }
});

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();
  renderHistory();
  renderPieChart();
});
