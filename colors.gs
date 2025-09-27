
/**
 * Converts color name to Gmail API compatible hex values.
 * @param {string} colorName - The color name from configuration
 * @returns {Object|null} Object with background and text colors or null if invalid
 */
function getColorHex(colorName) {
  // Gmail API allowed colors only
  const colorMap = {
    red: { background: "#fb4c2f", text: "#ffffff" },
    orange: { background: "#ffad47", text: "#000000" },
    yellow: { background: "#fad165", text: "#000000" },
    green: { background: "#16a766", text: "#ffffff" },
    blue: { background: "#4a86e8", text: "#ffffff" },
    purple: { background: "#a479e2", text: "#ffffff" },
    pink: { background: "#f691b3", text: "#000000" },
    gray: { background: "#666666", text: "#ffffff" },
    black: { background: "#000000", text: "#ffffff" },
    white: { background: "#ffffff", text: "#000000" },
    lightblue: { background: "#a4c2f4", text: "#000000" },
    lightgreen: { background: "#89d3b2", text: "#000000" },
    lightpink: { background: "#fbc8d9", text: "#000000" },
    lightgray: { background: "#cccccc", text: "#000000" },
    darkred: { background: "#cc3a21", text: "#ffffff" },
    darkgreen: { background: "#0b804b", text: "#ffffff" },
    darkblue: { background: "#1c4587", text: "#ffffff" },
    darkpurple: { background: "#41236d", text: "#ffffff" },
  };

  return colorMap[colorName.toLowerCase()] || null;
}