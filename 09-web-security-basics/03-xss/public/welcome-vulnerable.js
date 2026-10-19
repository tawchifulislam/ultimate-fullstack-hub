// DOM-based XSS: the server never puts the payload into the HTML it sends (this
// is a static file). The browser-side code takes text from the URL and writes it
// into the page as HTML. (The query string still reaches the server in the
// request line; a #fragment would not.)
const name = new URLSearchParams(location.search).get("name") || "guest";
document.getElementById("greeting").innerHTML = "Hello, " + name; // DANGEROUS SINK
