// check-schema.js
// Validates a .prisma file with Prisma's own schema parser (compiled to
// WASM), entirely locally. No database and no engine download involved,
// which is why it could run in an environment where `npx prisma validate`
// could not (the CLI tries to download engine binaries first).
//
//   node prisma/check-schema.js prisma/schema.prisma
//   node prisma/check-schema.js prisma/invalid-examples/old-style-datasource-url.prisma

const fs = require("fs");
const wasm = require("@prisma/prisma-schema-wasm");

const file = process.argv[2] || "prisma/schema.prisma";
const params = JSON.stringify({ prismaSchema: [[file, fs.readFileSync(file, "utf8")]], noColor: true });

try {
  wasm.validate(params);
  console.log("VALID:", file);
  const dmmf = JSON.parse(wasm.get_dmmf(params));
  for (const model of dmmf.datamodel.models) {
    console.log(`model ${model.name}:`);
    for (const f of model.fields) {
      const type = `${f.type}${f.isList ? "[]" : ""}${f.isRequired ? "" : "?"}`;
      console.log(`  ${f.name}: ${type}${f.relationName ? `  (relation ${f.relationName})` : ""}`);
    }
  }
} catch (err) {
  console.log("INVALID:", file);
  console.log(String(err.message || err));
  process.exitCode = 1;
}
