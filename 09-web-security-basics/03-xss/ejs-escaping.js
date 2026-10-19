// ejs-escaping.js
// In ejs, <%= value %> HTML-escapes the value and <%- value %> prints it raw.
// One character of difference decides whether a template is safe. No browser
// needed: this only prints what the template engine produces.
//
//   node ejs-escaping.js

const ejs = require("ejs");

const attack = `<img src=x onerror=alert(1)>`;
const quoteAttack = `" onfocus="alert(1)" autofocus="`;

console.log('1. <p><%= x %></p>   (escaped)');
console.log("  ", ejs.render("<p><%= x %></p>", { x: attack }));

console.log('\n2. <p><%- x %></p>   (RAW, the mistake)');
console.log("  ", ejs.render("<p><%- x %></p>", { x: attack }));

console.log('\n3. <input value="<%= x %>">   (escaping also covers quotes inside a quoted attribute)');
console.log("  ", ejs.render('<input value="<%= x %>">', { x: quoteAttack }));

console.log("\n4. <%= x %> on values that are not strings");
console.log("   number:", ejs.render("<%= x %>", { x: 42 }));
console.log("   null  :", JSON.stringify(ejs.render("<%= x %>", { x: null })));
console.log("   array :", ejs.render("<%= x %>", { x: ["<b>", "a&b"] }));
