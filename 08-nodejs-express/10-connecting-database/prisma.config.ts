// prisma.config.ts
// In Prisma 7 the database URL lives here, not in schema.prisma.
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "file:./dev.db",
  },
});
