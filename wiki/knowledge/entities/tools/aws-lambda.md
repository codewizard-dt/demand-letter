---
id: aws-lambda
title: AWS Lambda
aliases: [Lambda, AWS Lambda nodejs24.x, nodejs24.x]
updated: 2026-06-29
sources:
  - ../../../raw/research/node-24-runtime-upgrade/index.md
tags: [aws, serverless, runtime]
---

# AWS Lambda

AWS Lambda is the managed serverless runtime target for the project handlers declared in `template.yaml`. The Node 24 runtime upgrade uses Lambda's current `nodejs24.x` managed runtime as the limiting deployment surface, so Lambda compatibility determines the maximum safe project-wide Node major.

The source records that the SAM template now aligns Lambda function runtimes, the DB layer compatible runtime, and SAM build method to `nodejs24.x`. It also notes that `sam validate` accepts the updated template, while `sam validate --lint` still reports unrelated RDS/SNS warnings. relates_to::[[Node Runtime Policy]]
