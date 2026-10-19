// Same page, but the text goes in as TEXT, not as HTML.
const name = new URLSearchParams(location.search).get("name") || "guest";
document.getElementById("greeting").textContent = "Hello, " + name; // SAFE SINK
