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

// packages/api/src/handlers/get-jobs-gap-report.ts
var get_jobs_gap_report_exports = {};
__export(get_jobs_gap_report_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(get_jobs_gap_report_exports);
var import_db2 = __toESM(require_dist());

// packages/api/src/lib/sufficiency-gate.ts
var import_db = __toESM(require_dist());
async function computeGapReport(jobId) {
  const template = await import_db.prisma.template.findFirst({
    where: { jobId },
    orderBy: { ingestedAt: "desc" },
    select: { id: true }
  });
  if (!template) {
    throw new Error(`No template found for job ${jobId}`);
  }
  const slots = await import_db.prisma.templateSlot.findMany({
    where: { templateId: template.id },
    select: { slotName: true }
  });
  const fields = await import_db.prisma.extractedField.findMany({
    where: { jobId },
    select: { fieldName: true, isNull: true, confidence: true, source: true, acceptMissing: true, nullReason: true }
  });
  const fieldMap = new Map(fields.map((f) => [f.fieldName, f]));
  const threshold = parseFloat(process.env.SUFFICIENCY_THRESHOLD ?? "0.80");
  const gaps = [];
  for (const slot of slots) {
    const f = fieldMap.get(slot.slotName);
    const covered = f !== void 0 && (f.acceptMissing || f.source === "attorney-judgment" || !f.isNull && f.confidence >= threshold);
    if (!covered) {
      gaps.push({
        fieldName: slot.slotName,
        nullReason: f?.nullReason ?? null,
        acceptMissing: f?.acceptMissing ?? false
      });
    }
  }
  return { covered: slots.length - gaps.length, total: slots.length, gaps };
}

// packages/api/src/handlers/get-jobs-gap-report.ts
var handler = async (event) => {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing job ID" }) };
  }
  const job = await import_db2.prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return { statusCode: 404, body: JSON.stringify({ error: "Job not found" }) };
  }
  const report = await computeGapReport(jobId);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
