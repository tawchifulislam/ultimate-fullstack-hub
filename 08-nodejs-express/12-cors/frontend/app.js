// app.js
// The browser side of the CORS demo (loaded by index.html).

const params = new URLSearchParams(location.search);
const API = params.get("api") || "http://localhost:4700";
document.getElementById("origin").textContent = location.origin;
document.getElementById("api").textContent = API;

// The page can only ever see "it worked" or a generic TypeError.
// The real reason for a CORS block is printed to the DevTools console.
async function attempt(name, makeRequest) {
  try {
    const res = await makeRequest();
    const text = await res.text();
    let body = text;
    try { body = JSON.parse(text); } catch (e) { body = text.slice(0, 50).replace(/\s+/g, " ") + "..."; }
    return { name, ok: true, status: res.status, body };
  } catch (err) {
    return { name, ok: false, error: `${err.name}: ${err.message}` };
  }
}

const json = { "Content-Type": "application/json" };

window.runAll = async function () {
  const results = [];
  results.push(await attempt("1. simple GET /data", () => fetch(API + "/data")));
  results.push(await attempt("2. PUT /items/1 with a JSON body", () =>
    fetch(API + "/items/1", { method: "PUT", headers: json, body: JSON.stringify({ name: "x" }) })));
  results.push(await attempt("3. GET /private with an Authorization header", () =>
    fetch(API + "/private", { headers: { Authorization: "Bearer demo-token" } })));
  results.push(await attempt("4. POST /login, credentials: include", () =>
    fetch(API + "/login", { method: "POST", credentials: "include" })));
  results.push(await attempt("5. GET /whoami, credentials: include", () =>
    fetch(API + "/whoami", { credentials: "include" })));
  results.push(await attempt("6. GET /whoami, default credentials", () =>
    fetch(API + "/whoami")));
  results.push(await attempt("7. GET /private with NO Authorization header (a 401)", () =>
    fetch(API + "/private")));
  results.push(await attempt("8. GET /boom (the route throws)", () =>
    fetch(API + "/boom")));
  return results;
};

document.getElementById("run").addEventListener("click", async () => {
  const results = await window.runAll();
  document.getElementById("out").textContent = JSON.stringify(results, null, 2);
});
