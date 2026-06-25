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

// packages/api/src/handlers/get-jobs-blocks.ts
var get_jobs_blocks_exports = {};
__export(get_jobs_blocks_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(get_jobs_blocks_exports);
var import_db = __toESM(require_dist());
var handler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing job id" }) };
  }
  const job = await import_db.prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404, body: JSON.stringify({ error: "Job not found" }) };
  }
  const qs = event.queryStringParameters ?? {};
  const page = Math.max(1, parseInt(qs["page"] ?? "1", 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(qs["limit"] ?? "100", 10) || 100));
  const filterType = qs["type"];
  const filterPage = qs["page_num"] ? parseInt(qs["page_num"], 10) : void 0;
  const where = {
    sourceFile: { jobId }
  };
  if (filterType) where.type = filterType;
  if (filterPage !== void 0 && !isNaN(filterPage)) where.page = filterPage;
  const [blocks, totalCount] = await import_db.prisma.$transaction([
    import_db.prisma.block.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: [{ page: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        sourceFileId: true,
        type: true,
        text: true,
        page: true,
        bbox: true,
        confidence: true,
        createdAt: true
      }
    }),
    import_db.prisma.block.count({ where })
  ]);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks,
      page,
      limit,
      totalCount,
      hasMore: page * limit < totalCount
    })
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
