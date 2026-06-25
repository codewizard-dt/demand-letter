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

// packages/api/src/handlers/sns-textract-completion.ts
var sns_textract_completion_exports = {};
__export(sns_textract_completion_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(sns_textract_completion_exports);
var import_db = __toESM(require_dist());
var import_client = require("@prisma/client");

// packages/api/src/lib/textract-client.ts
var import_client_textract = require("@aws-sdk/client-textract");
var textractClient = new import_client_textract.TextractClient({ region: process.env.AWS_REGION ?? "us-east-1" });
async function getTextractResults(jobId) {
  const blocks = [];
  let nextToken;
  do {
    const cmd = new import_client_textract.GetDocumentAnalysisCommand({ JobId: jobId, NextToken: nextToken });
    const response = await textractClient.send(cmd);
    if (response.Blocks) {
      response.Blocks.forEach((block) => {
        if (block.BlockType === "LINE" || block.BlockType === "WORD") {
          const geo = block.Geometry?.BoundingBox;
          blocks.push({
            type: block.BlockType,
            text: block.Text ?? "",
            page: block.Page ?? 1,
            confidence: block.Confidence ?? 0.8,
            bbox: {
              left: geo?.Left ?? 0,
              top: geo?.Top ?? 0,
              width: geo?.Width ?? 0,
              height: geo?.Height ?? 0
            }
          });
        }
      });
    }
    nextToken = response.NextToken;
  } while (nextToken);
  return blocks;
}

// packages/api/src/handlers/sns-textract-completion.ts
var handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const { JobId: textractJobId, Status: status } = message;
    if (status !== "SUCCEEDED") {
      if (status === "FAILED") {
        const sourceFile2 = await import_db.prisma.sourceFile.findFirst({
          where: { textractJobId }
        });
        if (sourceFile2) {
          await import_db.prisma.sourceFile.update({
            where: { id: sourceFile2.id },
            data: { status: "error", errorMessage: "Textract job failed" }
          });
        }
      }
      continue;
    }
    const sourceFile = await import_db.prisma.sourceFile.findFirst({
      where: { textractJobId }
    });
    if (!sourceFile) {
      console.error(`No SourceFile found for Textract job ${textractJobId}`);
      continue;
    }
    try {
      const results = await getTextractResults(textractJobId);
      const blockData = results.map((r) => ({
        sourceFileId: sourceFile.id,
        type: r.type,
        text: r.text,
        page: r.page,
        confidence: r.confidence,
        bbox: r.bbox,
        phiOffsets: import_client.Prisma.JsonNull
      }));
      if (blockData.length > 0) {
        await import_db.prisma.block.createMany({ data: blockData });
      }
      await import_db.prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { status: "complete" }
      });
    } catch (e) {
      await import_db.prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { status: "error", errorMessage: e.message }
      });
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
