import axios from "axios";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { getAISettings, AISettings, AIServiceType } from "@/lib/ai-settings";
// @ts-ignore
import OpenAI from "openai";

// Singleton instance
let aiServiceInstance: AIService | null = null;

// Helper function to get AIService instance
export async function getAIService(): Promise<AIService> {
  if (!aiServiceInstance) {
    const settings = await getAISettings();
    aiServiceInstance = new AIService(settings);
  }
  return aiServiceInstance;
}

export class AIService {
  private api_keys: {
    openai: string;
    gemini: string;
    claude: string;
    grok: string;
  };
  private api_endpoints: {
    claude: string;
    grok: string;
  };
  private model_names: {
    openai: string;
    gemini: string;
    claude: string;
    grok: string;
  };
  private openai: OpenAI | null = null;
  private gemini: GenerativeModel | null = null;

  constructor(settings: AISettings) {
    this.api_keys = {
      openai: settings.openai_api_key,
      gemini: settings.gemini_api_key,
      claude: settings.claude_api_key,
      grok: settings.grok_api_key,
    };
    this.api_endpoints = {
      claude: settings.claude_api_endpoint,
      grok: settings.grok_api_endpoint,
    };
    this.model_names = {
      openai: settings.openai_model,
      gemini: settings.gemini_model,
      claude: settings.claude_model,
      grok: settings.grok_model,
    };
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      if (!this.api_keys.openai) {
        throw new Error(
          "OpenAI API key is not set. Please set it in Settings page or in OPENAI_API_KEY environment variable."
        );
      }

      this.openai = new OpenAI({
        apiKey: this.api_keys.openai,
      });
    }
    return this.openai;
  }

  private getGeminiModel(): GenerativeModel {
    if (!this.gemini) {
      if (!this.api_keys.gemini) {
        throw new Error(
          "Gemini API key is not set. Please set it in Settings page or in GEMINI_API_KEY environment variable."
        );
      }

      const genAI = new GoogleGenerativeAI(this.api_keys.gemini);
      this.gemini = genAI.getGenerativeModel({
        model: this.model_names.gemini,
      });

      console.log(`[Gemini API] Using model: ${this.model_names.gemini}`);
      console.log(`[Gemini API] API Key: ${this.api_keys.gemini.substring(0, 5)}...`);
    }
    return this.gemini;
  }

  private async callClaudeAPI(prompt: string): Promise<string> {
    if (!this.api_keys.claude) {
      throw new Error(
        "Claude API key is not set. Please set it in Settings page or in CLAUDE_API_KEY environment variable."
      );
    }

    try {
      const requestBody = {
        model: this.model_names.claude,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
        temperature: 0.2,
      };

      // Log curl command for debugging
      console.log(`[Claude API] Using model: ${this.model_names.claude}`);
      const curlCommand = `curl -X POST "${this.api_endpoints.claude}/messages" \\
        -H "Content-Type: application/json" \\
        -H "x-api-key: ${this.api_keys.claude.substring(0, 5)}..." \\
        -H "anthropic-version: 2023-06-01" \\
        -d '${JSON.stringify(requestBody).replace(/'/g, "'\\''")}'`;
      console.log(`[Claude API] Equivalent curl command:\n${curlCommand}`);

      const response = await axios.post(
        `${this.api_endpoints.claude}/messages`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.api_keys.claude,
            "anthropic-version": "2023-06-01",
          },
        }
      );

      return response.data.content?.[0]?.text || "";
    } catch (error) {
      console.error("Error calling Claude API:", error);
      throw new Error("Failed to get response from Claude API");
    }
  }

  private async callGrokAPI(prompt: string): Promise<string> {
    if (!this.api_keys.grok) {
      throw new Error(
        "Grok API key is not set. Please set it in Settings page or in GROK_API_KEY environment variable."
      );
    }

    try {
      const requestBody = {
        model: this.model_names.grok,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.5,
      };

      // Log API information
      console.log(`[Grok API] Using model: ${this.model_names.grok}`);
      console.log(`[Grok API] API Endpoint: ${this.api_endpoints.grok}`);
      console.log(`[Grok API] API Key: ${this.api_keys.grok.substring(0, 5)}...`);
      console.log(`[Grok API] Equivalent curl command:
curl -X POST "${this.api_endpoints.grok}/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${this.api_keys.grok.substring(0, 5)}..." \\
  -d '${JSON.stringify(requestBody).replace(/'/g, "'\\''")}'`);

      const response = await axios.post(
        `${this.api_endpoints.grok}/chat/completions`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.api_keys.grok}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      if (
        !response.data ||
        !response.data.choices ||
        !response.data.choices.length
      ) {
        console.error(
          "Grok API returned empty or invalid response:",
          response.data
        );
        throw new Error("Invalid response from Grok API");
      }

      return response.data.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("Error calling Grok API:", error);

      // More descriptive error messages based on error type
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Connection to Grok API at ${this.api_endpoints.grok} refused. Check your network or API endpoint.`
        );
      } else if (error.code === "ECONNABORTED") {
        throw new Error(
          "Connection to Grok API timed out. The server might be overloaded or unreachable."
        );
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        const message =
          error.response.data?.error?.message || error.response.statusText;
        throw new Error(`Grok API error (${status}): ${message}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(
          "No response received from Grok API. Check your internet connection and API endpoint."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(
          `Failed to get response from Grok API: ${error.message}`
        );
      }
    }
  }

  extractJSONFromText(text: string): any {
    try {
      // Handle case when JSON is wrapped in a code block
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        const jsonContent = codeBlockMatch[1].trim();
        return JSON.parse(jsonContent);
      }

      // Find JSON object in text
      const jsonRegex = /\{[\s\S]*?\}|\[[\s\S]*?\]/g;
      const matches = text.match(jsonRegex);

      if (!matches) {
        throw new Error("No JSON found in response");
      }

      // Try to parse the first match
      for (const match of matches) {
        try {
          return JSON.parse(match);
        } catch (e) {
          console.log("Failed to parse JSON match:", match);
          // Continue to next match
        }
      }

      throw new Error("No valid JSON found");
    } catch (error) {
      console.error("Error extracting JSON:", error);
      // Return a default response as fallback
      return {
        action: "click",
        selector: "",
        data: "",
        expected: "",
      };
    }
  }

  private generateBasicPlaywrightScript(
    testCaseName: string,
    testSteps: Array<{
      id: string;
      order: number;
      action: string;
      data?: string | null;
      expected?: string | null;
    }>,
    tags?: string[]
  ): string {
    const sanitizedTestName = testCaseName.replace(/[^\w\s]/gi, "");

    // Generate code for each step
    const stepsCode = testSteps
      .map((step) => {
        const action = step.action?.toLowerCase() || "";

        if (
          action.includes("navigate") ||
          action.includes("go to") ||
          action.includes("open")
        ) {
          const url = step.data || "https://example.com";
          return `  // Step ${step.order}: ${step.action}\n  await page.goto('${url}');`;
        }

        if (action.includes("click")) {
          return `  // Step ${step.order}: ${
            step.action
          }\n  await page.click('${step.data || "selector"}');`;
        }

        if (
          action.includes("fill") ||
          action.includes("type") ||
          action.includes("enter")
        ) {
          const selector = step.data?.split(",")[0] || "input";
          const value = step.data?.split(",")[1] || "text";
          return `  // Step ${step.order}: ${step.action}\n  await page.fill('${selector}', '${value}');`;
        }

        if (action.includes("select")) {
          const selector = step.data?.split(",")[0] || "select";
          const value = step.data?.split(",")[1] || "option";
          return `  // Step ${step.order}: ${step.action}\n  await page.selectOption('${selector}', '${value}');`;
        }

        if (action.includes("check")) {
          return `  // Step ${step.order}: ${
            step.action
          }\n  await page.check('${step.data || "checkbox"}');`;
        }

        if (action.includes("wait")) {
          return `  // Step ${step.order}: ${step.action}\n  await page.waitForTimeout(1000);`;
        }

        // Default case for unknown actions
        return `  // Step ${step.order}: ${
          step.action
        }\n  // TODO: Implement action "${step.action}" with data: ${
          step.data || "N/A"
        }`;
      })
      .join("\n\n");

    // Create the full script with optional tags
    const tagsPart =
      tags && tags.length > 0
        ? `, {
  tag: ${
    tags.length === 1
      ? `'${tags[0]}'`
      : `[${tags.map((tag) => `'${tag}'`).join(", ")}]`
  }
}`
        : "";

    return `import { test, expect } from '@playwright/test';

test('${sanitizedTestName}'${tagsPart}, async ({ page }) => {
${stepsCode}
});`;
  }

  async generatePlaywrightFromSteps(
    testCaseName: string,
    testSteps: Array<{
      id: string;
      order: number;
      action: string;
      data?: string | null;
      expected?: string | null;
    }>,
    existingCode: string = "",
    options: {
      preserveImports?: boolean;
      preserveFixtures?: boolean;
      preserveSetup?: boolean;
      preserveTeardown?: boolean;
      tags?: string[];
      provider?: "openai" | "gemini" | "claude" | "grok";
    } = {}
  ): Promise<string> {
    const {
      preserveImports = true,
      preserveFixtures = true,
      preserveSetup = true,
      preserveTeardown = true,
      tags = [],
      provider = "openai", // Default to OpenAI
    } = options;

    // Create a readable format of test steps
    const stepsText = testSteps
      .map((step) => {
        return `Step ${step.order}: ${step.action || "N/A"}
  Data: ${step.data || "N/A"}
  Expected: ${step.expected || "N/A"}`;
      })
      .join("\n\n");

    // Create a readable format of tags if available
    const tagsText =
      tags && tags.length > 0 ? `\nTags: ${tags.join(", ")}` : "";

    // Build prompt based on whether there's existing code
    let prompt = "";
    if (existingCode) {
      prompt = `Generate a complete Playwright test script for the test case named "${testCaseName}" based on these test steps:

${stepsText}${tagsText}

The current Playwright code is:
\`\`\`typescript
${existingCode}
\`\`\`

${
  preserveImports
    ? "Preserve the import statements."
    : "Update imports as needed."
}
${preserveFixtures ? "Preserve the existing test fixtures." : ""}
${preserveSetup ? "Preserve the existing setup code." : ""}
${preserveTeardown ? "Preserve the existing teardown code." : ""}
${
  tags && tags.length > 0
    ? `Include the following tags: ${tags.join(", ")}. 
Tags must be added to the test definition using the 'tag' property:
test('Test name', { tag: ${
        tags.length === 1 ? `'${tags[0]}'` : JSON.stringify(tags)
      } }, async ({ page }) => { ... })`
    : ""
}

IMPORTANT: Always return a full, runnable Playwright test script, not just a JSON object or partial code.
Your response must be a complete Playwright TypeScript test file that can be executed directly.`;
    } else {
      prompt = `Generate a complete Playwright test script for the test case named "${testCaseName}" based on these test steps:

${stepsText}${tagsText}

Create a standardized Playwright test structure with:
1. Necessary imports (import { test, expect } from '@playwright/test';)
2. A test block with the test case name
3. Implementation of each test step in sequence
4. Proper error handling and assertions where appropriate
${
  tags && tags.length > 0
    ? `5. Include the following tags: ${tags.join(", ")}. 
Tags must be added to the test definition using the 'tag' property:
test('Test name', { tag: ${
        tags.length === 1 ? `'${tags[0]}'` : JSON.stringify(tags)
      } }, async ({ page }) => { ... })`
    : ""
}

Example format:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test('${testCaseName}'${
        tags && tags.length > 0
          ? `, {
  tag: ${tags.length === 1 ? `'${tags[0]}'` : JSON.stringify(tags)}
}`
          : ""
      }, async ({ page }) => {
  // Implementation of test steps
  await page.goto('url');
  await page.click('selector');
  // etc.
});
\`\`\`

IMPORTANT: Always return a full, runnable Playwright test script, not just a JSON object or partial code.
Your response must be a complete Playwright TypeScript test file that can be executed directly.`;
    }

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Extract the code block from the response
      const codeMatch = text.match(/```(?:typescript|ts|js)?\s*([\s\S]*?)```/);

      if (codeMatch && codeMatch[1]) {
        const extractedCode = codeMatch[1].trim();

        // Check if the extracted code looks like a JSON object instead of Playwright code
        if (extractedCode.startsWith("{") && extractedCode.endsWith("}")) {
          try {
            const jsonObj = JSON.parse(extractedCode);
            console.log("Received JSON instead of code:", jsonObj);

            // Generate a basic Playwright script from the JSON object
            return this.generateBasicPlaywrightScript(
              testCaseName,
              testSteps,
              tags
            );
          } catch (e) {
            // Not valid JSON, continue with the extracted code
          }
        }

        // Check if the code contains import statements and test function
        if (
          !extractedCode.includes("import") ||
          !extractedCode.includes("test(")
        ) {
          console.log(
            "Generated code missing essential elements, using fallback"
          );
          return this.generateBasicPlaywrightScript(
            testCaseName,
            testSteps,
            tags
          );
        }

        return extractedCode;
      }

      // Check if the response is a JSON object
      try {
        const jsonObj = JSON.parse(text);
        console.log("Received JSON response instead of code:", jsonObj);
        return this.generateBasicPlaywrightScript(
          testCaseName,
          testSteps,
          tags
        );
      } catch (e) {
        // Not JSON, continue
      }

      // If we got here, the response didn't contain code block markers
      // Check if it at least contains import statements and test function
      if (!text.includes("import") || !text.includes("test(")) {
        console.log(
          "Generated text missing essential elements, using fallback"
        );
        return this.generateBasicPlaywrightScript(
          testCaseName,
          testSteps,
          tags
        );
      }

      // Use the raw text as a last resort
      return text;
    } catch (error) {
      console.error("Error generating Playwright script:", error);
      return this.generateBasicPlaywrightScript(testCaseName, testSteps, tags);
    }
  }

  async analyzePlaywrightCode(
    playwrightCode: string,
    provider?: AIServiceType
  ): Promise<any> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    if (!playwrightCode.trim()) {
      throw new Error("Playwright code is empty");
    }

    const prompt = `Analyze the following Playwright test commands and convert them into manual test steps:

\`\`\`typescript
${playwrightCode}
\`\`\`

For each playwright command or assertion, extract:
1. The action being performed (e.g., click, fill, check, etc.)
2. The element being acted upon (include selector)
3. Any data being used
4. The expected result where applicable

Return the results in JSON format as an array of test steps:
[
  {
    "order": 1,
    "action": "click",
    "selector": "#login-button", 
    "data": null,
    "expected": "User is logged in"
  },
  ...
]

Only include steps that correspond to actual Playwright commands. Don't include steps for importing modules, defining functions, etc.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const parsedData = this.extractJSONFromText(text);

      if (Array.isArray(parsedData)) {
        // Ensure we have valid test steps
        return {
          imports: [],
          fixtures: [],
          setup: [],
          teardown: [],
          tests: [{
            name: "Test Case",
            tags: [],
            steps: parsedData.map((step, index) => ({
              action: step.action || "unknown",
              data: step.data,
              expected: step.expected,
            }))
          }]
        };
      }

      throw new Error(`Invalid response format from ${provider} API`);
    } catch (error) {
      console.error("Error analyzing Playwright code:", error);
      throw new Error("Failed to analyze Playwright code");
    }
  }

  async generatePlaywrightTestStep(
    request: any,
    provider?: AIServiceType
  ): Promise<any> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }

    const { action, data, expected } = request;
    const prompt = `Generate a Playwright test step for the following action:

Action: ${action}
${data ? `Data: ${data}` : ""}
${expected ? `Expected: ${expected}` : ""}

IMPORTANT: Generate Playwright code for this step. If the action seems to require multiple operations, 
you can include multiple commands in the playwrightCode field.

Examples of correctly formatted responses:
- For navigation: await page.goto('https://example.com');
- For clicking: await page.locator('.button').click();
- For filling: await page.locator('#email').fill('user@example.com');
- For multiple operations: 
  await page.locator('#dropdown').click();
  await page.locator('.option').click();

Analyze the action and generate appropriate Playwright code to implement it.
If the action is a navigation, use page.goto().
If the action is a click, use page.click() or page.locator().click().
If the action is filling a form field, use page.fill() or page.locator().fill().
If the action is selecting from a dropdown, use page.selectOption().
If the action is checking/unchecking a checkbox, use page.check() or page.uncheck().
If the action involves waiting, use page.waitForSelector() or other appropriate wait methods.
For assertions, use expect() with appropriate matchers.

Return in this JSON format:
{
  "action": "The refined action description",
  "selector": "The best CSS selector or locator for this action",
  "data": "The data to be used (if applicable)",
  "expected": "The expected result (if applicable)",
  "playwrightCode": "The executable Playwright code for this step, can include multiple lines if needed"
}

Do NOT include imports or test() function in the playwrightCode.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result;
    } catch (error) {
      console.error("Error generating Playwright test step:", error);
      throw error;
    }
  }

  async generatePlaywrightTestFixture(
    name: string,
    description: string,
    provider: "openai" | "gemini" | "claude" | "grok" = "openai"
  ): Promise<string> {
    const prompt = `Generate a Playwright test fixture with the following details:

Name: ${name}
Description: ${description}

Return a JSON object with the following structure:
{
  "code": "the Playwright fixture code",
  "explanation": "explanation of what the fixture does"
}

IMPORTANT: Return ONLY the JSON object, no other text.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result.code || "";
    } catch (error) {
      console.error("Error generating Playwright test fixture:", error);
      throw error;
    }
  }

  async generatePlaywrightTestSetup(
    description: string,
    provider: "openai" | "gemini" | "claude" | "grok" = "openai"
  ): Promise<string> {
    const prompt = `Generate a Playwright test setup with the following description:

${description}

Return a JSON object with the following structure:
{
  "code": "the Playwright setup code",
  "explanation": "explanation of what the setup does"
}

IMPORTANT: Return ONLY the JSON object, no other text.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result.code || "";
    } catch (error) {
      console.error("Error generating Playwright test setup:", error);
      throw error;
    }
  }

  async generatePlaywrightTestTeardown(
    description: string,
    provider: "openai" | "gemini" | "claude" | "grok" = "openai"
  ): Promise<string> {
    const prompt = `Generate a Playwright test teardown with the following description:

${description}

Return a JSON object with the following structure:
{
  "code": "the Playwright teardown code",
  "explanation": "explanation of what the teardown does"
}

IMPORTANT: Return ONLY the JSON object, no other text.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result.code || "";
    } catch (error) {
      console.error("Error generating Playwright test teardown:", error);
      throw error;
    }
  }

  async generatePlaywrightTestStepWithHTML(
    request: any,
    provider?: AIServiceType
  ): Promise<any> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }

    const { action, data, selector, htmlContext } = request;
    const prompt = `Generate a Playwright test step for the following action in the given HTML context:

Action: ${action}
${selector ? `Current Selector: ${selector}` : ""}
${data ? `Data: ${data}` : ""}

HTML Context:
\`\`\`html
${htmlContext}
\`\`\`

Based on the HTML context, determine the best selector to use for this action.
Prefer data-testid, id, or unique attributes when available.
Only fall back to CSS selectors like classes as a last resort.

Return the step information in JSON format with the following structure:
{
  "action": "The action to perform (e.g., click, fill, etc.)",
  "selector": "The best selector for the element based on the HTML context",
  "data": "Any data needed for the step",
  "command": "The complete Playwright command for this action",
  "expected": "The expected outcome after this step is performed"
}`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result;
    } catch (error) {
      console.error("Error generating Playwright test step with HTML:", error);
      throw error;
    }
  }

  async analyzeAndGenerateTestStep(
    description: string,
    provider?: AIServiceType
  ): Promise<any> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    const prompt = `Given the following test step description: "${description}", analyze it and convert it into one or more structured Playwright test steps.

The description may contain a single action or multiple actions. If multiple actions are detected, break them down into separate steps.

For each step, return the appropriate Playwright action, selector, data, and code to implement this test step.

IMPORTANT: The 'action', 'data', and 'expected' fields should only contain human-readable descriptions without any HTML code, locators or selectors. All technical details like selectors should only be in the 'selector' and 'playwrightCode' fields.

Your response should be in JSON format. If there's only one step:
{
  "action": "The action to perform in plain language (e.g., 'Click the Submit button', 'Fill the Email field', 'Select Option B from dropdown') - no selectors or HTML",
  "selector": "The CSS selector or other locator for the element",
  "data": "Any data to input (for fill actions) - plain text only, no code or selectors",
  "expected": "Expected result as a human-readable description (e.g., 'Form is submitted', 'User is logged in') - no code or selectors",
  "playwrightCode": "The actual Playwright code that implements this step"
}

Always ensure that:
1. Action text is grammatically correct with proper capitalization and clear wording, focused on describing the user action without technical details
2. Expected results are well-formed, grammatically correct sentences describing visible outcomes
3. The playwrightCode is valid, executable Playwright command(s)
4. Keep technical details ONLY in the selector and playwrightCode fields`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return {
        action: result.action || "N/A",
        selector: result.selector || "",
        data: result.data || "",
        expected: result.expected || "",
        playwrightCode: result.playwrightCode || "",
      };
    } catch (error) {
      console.error("Error generating test step:", error);
      return {
        action: "N/A",
        selector: "",
        data: "",
        expected: "",
        playwrightCode: "",
      };
    }
  }

  async generatePlaywrightCodeFromStep(
    stepAction: string,
    stepData?: string | null,
    stepExpected?: string | null,
    provider?: AIServiceType
  ): Promise<string> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    const prompt = `Convert the following test step into Playwright code:

Action: ${stepAction}
${stepData ? `Data: ${stepData}` : ""}
${stepExpected ? `Expected: ${stepExpected}` : ""}

IMPORTANT: Generate Playwright code for this step. If the action seems to require multiple operations, 
you can include multiple commands in the playwrightCode field.

Examples of correctly formatted responses:
- For navigation: await page.goto('https://example.com');
- For clicking: await page.locator('.button').click();
- For filling: await page.locator('#email').fill('user@example.com');
- For multiple operations: 
  await page.locator('#dropdown').click();
  await page.locator('.option').click();

Analyze the action and generate appropriate Playwright code to implement it.
If the action is a navigation, use page.goto().
If the action is a click, use page.click() or page.locator().click().
If the action is filling a form field, use page.fill() or page.locator().fill().
If the action is selecting from a dropdown, use page.selectOption().
If the action is checking/unchecking a checkbox, use page.check() or page.uncheck().
If the action involves waiting, use page.waitForSelector() or other appropriate wait methods.
For assertions, use expect() with appropriate matchers.

Return in this JSON format:
{
  "action": "The refined action description",
  "selector": "The best CSS selector or locator for this action",
  "data": "The data to be used (if applicable)",
  "expected": "The expected result (if applicable)",
  "playwrightCode": "The executable Playwright code for this step, can include multiple lines if needed"
}

Do NOT include imports or test() function in the playwrightCode.`;

    try {
      let text: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in Playwright test automation.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          text = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const response = result.response;
          text = response.text();
          break;

        case "claude":
          text = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          text = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      const result = this.extractJSONFromText(text);
      return result.playwrightCode || `// TODO: Implement "${stepAction}" step`;
    } catch (error) {
      console.error("Error generating Playwright code from step:", error);
      return `// TODO: Implement "${stepAction}" step`;
    }
  }

  async fixStepText(
    text: string,
    provider?: AIServiceType
  ): Promise<string> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    const prompt = `Fix any spelling and vocabulary errors in the following test step text. 
Return only the corrected text without any explanations or additional context.

Text to fix:
${text}

Rules:
1. Fix any spelling errors
2. Improve vocabulary if needed
3. Maintain the original meaning
4. Keep technical terms unchanged
5. Use common test automation terminology
6. Ensure proper capitalization for test actions
7. Return only the corrected text

Common test automation terms to preserve:
- click, type, enter, fill, select, check, uncheck
- navigate, go to, open, close
- verify, assert, expect, should
- visible, hidden, enabled, disabled
- contains, matches, equals`;

    try {
      let response: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in fixing test automation terminology and step descriptions.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          response = completion.choices[0]?.message?.content || text;
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const geminiResponse = result.response;
          response = geminiResponse.text();
          break;

        case "claude":
          response = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          response = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return response.trim();
    } catch (error) {
      console.error("Error fixing step text:", error);
      return text; // Return original text if there's an error
    }
  }

  async fixSpellingAndVocabulary(
    text: string,
    provider?: AIServiceType
  ): Promise<string> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    const prompt = `Fix any spelling and vocabulary errors in the following text, which may be a test case name or a test step description. 
Return only the corrected text without any explanations or additional context.

Text to fix:
${text}

Rules:
1. Fix any spelling errors
2. Improve vocabulary if needed
3. Maintain the original meaning
4. Keep technical terms unchanged
5. For test case names, ensure proper capitalization and clear description
6. For test steps, preserve action verbs like "click", "navigate", "fill", "verify", etc.
7. Return only the corrected text`;

    try {
      let response: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in fixing spelling and vocabulary errors.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          response = completion.choices[0]?.message?.content || text;
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const geminiResponse = result.response;
          response = geminiResponse.text();
          break;

        case "claude":
          response = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          response = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return response.trim();
    } catch (error) {
      console.error("Error fixing spelling and vocabulary:", error);
      return text; // Return original text if there's an error
    }
  }

  async fixTestCaseName(
    testCaseName: string,
    provider?: AIServiceType
  ): Promise<string> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }

    const prompt = `Improve the following test case name based on test automation best practices:

Current name: "${testCaseName}"

Rules for test case naming:
1. ALWAYS start with "Verify" (capitalized) to indicate the test's purpose
2. Use clear, descriptive names that explain what is being verified
3. Follow the pattern: "Verify [what] when [condition]" (only capitalize Verify)
4. Use sentence case (only capitalize first letter of sentence and "Verify")
5. Avoid abbreviations unless they are widely known
6. Include the feature or component being tested
7. Make it easy to understand what is being verified
8. Keep it concise but informative
9. Use present tense
10. Avoid special characters
11. Include relevant business context

Examples of good test case names:
- "Verify error message displays when invalid credentials are entered"
- "Verify new project is created when all required fields are filled"
- "Verify user is redirected to dashboard after successful login"
- "Verify user profile is updated when valid data is provided"
- "Verify item is deleted when confirmation dialog is accepted"

Return only the improved test case name without any explanations or additional context.`;

    try {
      let response: string;
      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant specializing in test case naming conventions and best practices.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
          });
          response = completion.choices[0]?.message?.content || testCaseName;
          break;

        case "gemini":
          const model = this.getGeminiModel();
          const result = await model.generateContent(prompt);
          const geminiResponse = result.response;
          response = geminiResponse.text();
          break;

        case "claude":
          response = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          response = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      return response.trim();
    } catch (error) {
      console.error("Error fixing test case name:", error);
      return testCaseName; // Return original name if there's an error
    }
  }

  async updatePlaywrightWithModifiedSteps(
    playwrightCode: string,
    originalSteps: Array<{
      id: string;
      order: number;
      action: string;
      data?: string | null;
      expected?: string | null;
    }>,
    modifiedSteps: Array<{
      id: string;
      order: number;
      action: string;
      data?: string | null;
      expected?: string | null;
    }>,
    provider: AIServiceType = "openai"
  ): Promise<string> {
    try {
      const prompt = `
You are an expert Playwright test automation engineer. I need you to update the following Playwright test code to reflect the modified test steps.

Original Playwright code:
\`\`\`typescript
${playwrightCode}
\`\`\`

Original test steps:
${JSON.stringify(originalSteps, null, 2)}

Modified test steps:
${JSON.stringify(modifiedSteps, null, 2)}

Update the Playwright code to implement the modified steps while preserving as much of the existing code structure and patterns as possible.
Ensure all imports, fixtures, and test structure remain intact.
Only update the implementation of the test steps that were modified.

IMPORTANT: Return ONLY the raw Playwright code without code block markers (do not include \`\`\`typescript or \`\`\` around the code) and with no additional explanation.
`;

      let response: string;

      switch (provider) {
        case "openai":
          const openai = this.getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: this.model_names.openai,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });
          response = completion.choices[0]?.message?.content || "";
          break;

        case "gemini":
          const gemini = this.getGeminiModel();
          const result = await gemini.generateContent(prompt);
          response = result.response.text();
          break;

        case "claude":
          response = await this.callClaudeAPI(prompt);
          break;

        case "grok":
          response = await this.callGrokAPI(prompt);
          break;

        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }

      // Đảm bảo kết quả không có dấu hiệu định dạng code bằng cách loại bỏ chúng nếu có
      let cleanedResponse = response.trim();
      cleanedResponse = cleanedResponse.replace(/^```(\w+)?/, '');
      cleanedResponse = cleanedResponse.replace(/```$/, '');
      
      return cleanedResponse.trim();
    } catch (error) {
      console.error("Error updating Playwright code with modified steps:", error);
      return playwrightCode; // Return original code if there's an error
    }
  }
}