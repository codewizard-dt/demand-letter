import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { LlmFeature, prisma } from '@demand-letter/db';
import { estimateCostUsd } from './ai';

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

interface InvokeOptions {
  modelId: string;
  feature: LlmFeature;
  userId: string;
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string | Array<Record<string, unknown>> }>;
}

export async function invokeModel(opts: InvokeOptions): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
  });

  const start = Date.now();
  try {
    const response = await client.send(
      new InvokeModelCommand({
        modelId: opts.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(body),
      }),
    );
    const parsed = JSON.parse(Buffer.from(response.body).toString());
    const inputTokens: number = parsed.usage?.input_tokens ?? 0;
    const outputTokens: number = parsed.usage?.output_tokens ?? 0;
    const text: string = parsed.content?.[0]?.text ?? '';

    logAudit(opts, inputTokens, outputTokens, Date.now() - start);
    return text;
  } catch (err) {
    logAudit(opts, 0, 0, Date.now() - start);
    throw err;
  }
}

export async function invokeModelStream(
  opts: InvokeOptions,
): Promise<AsyncIterable<string>> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 8192,
    system: opts.system,
    messages: opts.messages,
  });

  const start = Date.now();
  const response = await client.send(
    new InvokeModelWithResponseStreamCommand({
      modelId: opts.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(body),
    }),
  );

  let inputTokens = 0;
  let outputTokens = 0;

  async function* generate(): AsyncIterable<string> {
    for await (const event of response.body ?? []) {
      const chunk = JSON.parse(Buffer.from(event.chunk?.bytes ?? []).toString());
      if (chunk.type === 'content_block_delta') {
        yield chunk.delta?.text ?? '';
      }
      if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage?.output_tokens ?? outputTokens;
      }
      if (chunk.type === 'message_start') {
        inputTokens = chunk.message?.usage?.input_tokens ?? inputTokens;
      }
    }
    logAudit(opts, inputTokens, outputTokens, Date.now() - start);
  }

  return generate();
}

interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface InvokeWithToolsOptions extends InvokeOptions {
  tools: Tool[];
  tool_choice?: { type: 'auto' } | { type: 'any' } | { type: 'tool'; name: string };
}

export async function invokeModelWithTools(
  opts: InvokeWithToolsOptions,
): Promise<Record<string, unknown>> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: opts.system,
    messages: opts.messages,
    tools: opts.tools,
    tool_choice: opts.tool_choice ?? { type: 'any' },
  });

  const start = Date.now();
  try {
    const response = await client.send(
      new InvokeModelCommand({
        modelId: opts.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(body),
      }),
    );
    const parsed = JSON.parse(Buffer.from(response.body).toString());
    const inputTokens: number = parsed.usage?.input_tokens ?? 0;
    const outputTokens: number = parsed.usage?.output_tokens ?? 0;

    // Find the tool_use content block
    const toolUseBlock = parsed.content?.find(
      (b: Record<string, unknown>) => b.type === 'tool_use',
    );
    if (!toolUseBlock) {
      throw new Error('Claude did not return a tool_use block');
    }

    logAudit(opts, inputTokens, outputTokens, Date.now() - start);
    return toolUseBlock.input as Record<string, unknown>;
  } catch (err) {
    logAudit(opts, 0, 0, Date.now() - start);
    throw err;
  }
}

function logAudit(
  opts: InvokeOptions,
  inputTokens: number,
  outputTokens: number,
  durationMs: number,
): void {
  prisma.llmAuditLog
    .create({
      data: {
        userId: opts.userId,
        feature: opts.feature,
        model: opts.modelId,
        provider: 'bedrock',
        inputTokens,
        outputTokens,
        estimatedCostUsd: estimateCostUsd(opts.modelId, inputTokens, outputTokens),
        durationMs,
      },
    })
    .catch(() => {});
}
