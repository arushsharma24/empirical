import {
  IAIProvider,
  IChatCompletion,
  ICreateChatCompletion,
  ICreateAndRunAssistantThread,
  IAssistantRunResponse,
} from "@empiricalrun/types";
import OpenAI from "openai";
import promiseRetry from "promise-retry";
import { AIError, AIErrorEnum } from "../../error";
import { DEFAULT_TIMEOUT } from "../../constants";
import { BatchTaskManager } from "../../utils";
import { AssistantStreamEvent } from "openai/resources/beta/assistants.mjs";

const batchTaskManager = new BatchTaskManager(20, 100);

const createChatCompletion: ICreateChatCompletion = async (body) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      AIErrorEnum.MISSING_PARAMETERS,
      "process.env.OPENAI_API_KEY is not set",
    );
  }
  const timeout = body.timeout || DEFAULT_TIMEOUT;
  if (body.timeout) {
    delete body.timeout;
  }
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout,
  });

  try {
    const startedAt = Date.now();
    const completions = await promiseRetry<IChatCompletion>(
      (retry) => {
        return openai.chat.completions.create(body).catch((err) => {
          if (
            err instanceof OpenAI.RateLimitError &&
            err.type === "insufficient_quota"
          ) {
            throw err;
          } else if (
            err instanceof OpenAI.RateLimitError ||
            err instanceof OpenAI.APIConnectionError ||
            err instanceof OpenAI.APIConnectionTimeoutError ||
            err instanceof OpenAI.InternalServerError
          ) {
            retry(err);
            throw err;
          }
          throw err;
        });
      },
      {
        randomize: true,
        minTimeout: 1000,
      },
    );
    const latency = Date.now() - startedAt;
    return { ...completions, latency };
  } catch (err) {
    throw new AIError(
      AIErrorEnum.FAILED_CHAT_COMPLETION,
      `Failed to fetch output from model ${body.model}: ${(err as any)?.error?.message}`,
    );
  }
};

const runAssistant: ICreateAndRunAssistantThread = async (body) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      AIErrorEnum.MISSING_PARAMETERS,
      "process.env.OPENAI_API_KEY is not set",
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const { executionDone } = await batchTaskManager.waitForTurn();
  try {
    let requestStartTime = Date.now();
    const finalResp = await promiseRetry<IAssistantRunResponse>(
      // @ts-ignore
      (retry, attempt) => {
        return (async () => {
          const run = await openai.beta.threads.createAndRun({
            thread: body.thread,
            assistant_id: body.assistant_id,
            stream: true,
          });
          const stream = run.toReadableStream();
          const reader = stream.getReader();
          let asstRunResp: IAssistantRunResponse = {
            citations: [],
            content: "",
          };
          while (true && reader) {
            const { done, value } = await reader.read();
            const resp = new Response(value);
            const text = await resp.text();
            if (text) {
              const eventData: AssistantStreamEvent = JSON.parse(text);
              if (eventData.event === "thread.message.completed") {
                if (eventData.data.content?.[0]?.type === "text") {
                  const txt = eventData.data.content?.[0].text;
                  asstRunResp.content = txt.value;
                  const citations = txt.annotations.map((ann) => ({
                    text: ann.text,
                    file_id:
                      ann.type === "file_citation"
                        ? ann.file_citation.file_id
                        : ann.file_path.file_id,
                    quote:
                      ann.type === "file_citation"
                        ? ann.file_citation.quote
                        : undefined,
                  }));
                  asstRunResp.citations = citations;
                } else {
                  throw new AIError(
                    AIErrorEnum.UNSUPPORTED_COMPLETION_TYPE,
                    `Unsupported completion type: ${eventData.data.content?.[0]?.type}`,
                  );
                }
              }

              if (eventData.event === "thread.run.completed") {
                asstRunResp.usage = eventData.data.usage || undefined;
              }

              if (eventData.event === "thread.run.requires_action") {
                const { tool_calls } = eventData.data.required_action
                  ?.submit_tool_outputs || {
                  tool_calls: [],
                };
                const toolSummary = tool_calls.map((tc) => {
                  return `${tc.function.name} with args ${tc.function.arguments}`;
                });
                asstRunResp.content = `Attempting to make tool call: ${toolSummary.join(", ") || ""}`;
                asstRunResp.tool_calls = tool_calls;
              }

              if (eventData.event === "thread.run.failed") {
                throw new AIError(
                  AIErrorEnum.FAILED_CHAT_COMPLETION,
                  `Failed to complete the run: ${JSON.stringify(eventData.data.last_error)}`,
                );
              }
            }
            if (done) {
              break;
            }
          }
          return asstRunResp;
        })().catch((err: any) => {
          if ((err.message as string).includes("server_error")) {
            console.log(
              `Retrying request due to server error (attempt ${attempt})`,
            );
            requestStartTime = Date.now();
            retry(err);
          } else {
            throw err;
          }
        });
      },
      {
        randomize: true,
        minTimeout: 1000,
      },
    );
    executionDone();
    const latency = Date.now() - requestStartTime;
    finalResp.latency = latency;
    return finalResp;
  } catch (err: any) {
    executionDone();
    console.error(err);
    throw new AIError(
      AIErrorEnum.FAILED_CHAT_COMPLETION,
      `Failed to fetch output from assistant ${body.assistant_id}: ${err.message || err}`,
    );
  }
};

export const OpenAIProvider: IAIProvider = {
  name: "openai",
  chat: createChatCompletion,
  assistant: runAssistant,
};
