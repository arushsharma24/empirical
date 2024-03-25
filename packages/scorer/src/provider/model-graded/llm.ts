import { Scorer } from "../../interface/scorer";
import OpenAI from "openai";
import { EmpiricalAI, replacePlaceholders } from "@empiricalrun/ai";
import { inputsForReplacements } from "../../utils";

async function askLlmForEvalResult(
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<{ reason: string; result: "Yes" | "No" }> {
  const ai = new EmpiricalAI("openai");
  const completion = await ai.chat.completions.create({
    messages,
    model: "gpt-3.5-turbo",
    temperature: 0.1,
    tools: [
      {
        type: "function",
        function: {
          name: "set_evaluator_response",
          description: "Sets the response of the evaluation",
          parameters: {
            type: "object",
            properties: {
              reason: {
                type: "string",
                description:
                  "Reasoning for the evaluation, shared as a step-by-step chain of thought",
              },
              result: { type: "string", enum: ["Yes", "No"] },
            },
            required: ["reason", "result"],
          },
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "set_evaluator_response" },
    },
  });
  const rawResponse = completion.choices[0]!;
  const response = rawResponse.message.tool_calls![0];
  return JSON.parse(response!.function.arguments);
}

export const name = "llm-criteria";

const systemPrompt = `You are an expert evaluator who grades an output string based on a criteria. The output must fulfil the criteria to pass the evaluation.`;

export const checkLlmCriteria: Scorer = async ({ sample, output, value }) => {
  let criteria = "";

  if (value) {
    let replacements: any = inputsForReplacements(sample.inputs);
    if (sample.expected) {
      // llm-criteria supports {{expected}} as placeholder
      replacements.expected = sample.expected;
    }
    criteria = replacePlaceholders(value as string, replacements);
  }

  const prompt = `Criteria: ${criteria}\n\nOutput: ${output}`;
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const { result, reason } = await askLlmForEvalResult(messages);
  return [
    {
      score: result === "Yes" ? 1 : 0,
      name: name,
      message: reason,
    },
  ];
};