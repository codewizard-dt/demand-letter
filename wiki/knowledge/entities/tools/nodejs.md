---
id: nodejs
title: Node.js
aliases: [Node, Node 24, nodejs24.x]
updated: 2026-06-29
sources:
  - ../../../raw/research/node-24-runtime-upgrade/index.md
tags: [runtime, javascript]
---

# Node.js

Node.js is the JavaScript runtime used by the project backend, frontend tooling, Prisma scripts, test tooling, and Lambda handler builds. The current project policy is **Node 24 only** for the active runtime band, expressed as `engines.node: >=24 <25`, `.nvmrc`/`.node-version` set to `24`, and `@types/node: ^24.0.0` wherever Node APIs are typed.

The Node 24 choice is derived from rel::[[Node Runtime Policy]]: it is the maximum currently safe common target because rel::[[AWS Lambda]] supports `nodejs24.x`, while Node 26 remains outside the current managed Lambda runtime list. derived_from::[[Research — Node 24 Runtime Upgrade]]
