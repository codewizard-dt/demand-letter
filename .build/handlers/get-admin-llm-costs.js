"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/db/dist/index.js
var require_dist = __commonJS({
  "packages/db/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ZoneType = exports2.LlmFeature = exports2.PrismaClient = exports2.prisma = void 0;
    var client_1 = require("@prisma/client");
    exports2.prisma = globalThis.__prisma ?? new client_1.PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalThis.__prisma = exports2.prisma;
    }
    var client_2 = require("@prisma/client");
    Object.defineProperty(exports2, "PrismaClient", { enumerable: true, get: function() {
      return client_2.PrismaClient;
    } });
    Object.defineProperty(exports2, "LlmFeature", { enumerable: true, get: function() {
      return client_2.LlmFeature;
    } });
    Object.defineProperty(exports2, "ZoneType", { enumerable: true, get: function() {
      return client_2.ZoneType;
    } });
  }
});

// packages/api/src/handlers/get-admin-llm-costs.ts
var get_admin_llm_costs_exports = {};
__export(get_admin_llm_costs_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(get_admin_llm_costs_exports);
var import_db = __toESM(require_dist());
var handler = async (event) => {
  const days = parseInt(event.queryStringParameters?.days ?? "30", 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
  const [aggregates, recentRows] = await Promise.all([
    import_db.prisma.llmAuditLog.groupBy({
      by: ["feature"],
      where: { createdAt: { gte: cutoff } },
      _count: { id: true },
      _sum: { inputTokens: true, outputTokens: true, estimatedCostUsd: true },
      orderBy: { _sum: { estimatedCostUsd: "desc" } }
    }),
    import_db.prisma.llmAuditLog.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        userId: true,
        feature: true,
        model: true,
        provider: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        createdAt: true
      }
    })
  ]);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aggregates, recentRows })
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
