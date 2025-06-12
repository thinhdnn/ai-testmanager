import axios from "axios";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { getAISettings, AISettings, AIServiceType } from "./ai-settings";
// @ts-ignore
import OpenAI from "openai";
import { prisma } from "../db/prisma";

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

// Reset the AI service instance, forcing it to be recreated on next use
export function resetAIService() {
  aiServiceInstance = null;
  console.log("[AIService] Reset AI service instance");
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
  private activeProvider: AIServiceType;

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
    this.activeProvider = settings.ai_provider as AIServiceType;
  }

  // Helper method to get minimal settings for a provider
  private static async getProviderSettings(provider: AIServiceType): Promise<AISettings> {
    try {
      // Only fetch the specific settings we need
      const settingsFromDB = await prisma.setting.findMany({
        where: {
          key: {
            in: [
              `${provider}_api_key`,
              `${provider}_model`,
              `${provider}_api_endpoint`,
            ],
          },
        },
      });

      // Create minimal settings object with index signature
      const settings: Partial<AISettings> & { [key: string]: string } = {
        ai_provider: provider
      };

      // Apply settings from DB
      settingsFromDB.forEach((setting) => {
        if (setting.value) {
          settings[setting.key] = setting.value;
        }
      });

      // Apply environment variables as fallback
      const apiKey = `${provider}_api_key`;
      const model = `${provider}_model`;
      const endpoint = `${provider}_api_endpoint`;

      if (!settings[apiKey]) {
        settings[apiKey] = process.env[`${provider.toUpperCase()}_API_KEY`] || '';
      }
      if (!settings[model]) {
        settings[model] = process.env[`${provider.toUpperCase()}_MODEL`] || '';
      }
      if (provider === 'claude' || provider === 'grok') {
        if (!settings[endpoint]) {
          settings[endpoint] = process.env[`${provider.toUpperCase()}_API_ENDPOINT`] || '';
        }
      }

      return settings as AISettings;
    } catch (error) {
      console.error('Error fetching provider settings:', error);
      throw error;
    }
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

  async analyzeAndGenerateMultipleTestSteps(
    descriptions: string[],
    provider?: AIServiceType
  ): Promise<any[]> {
    if (!provider) {
      const settings = await getAISettings();
      provider = settings.ai_provider as AIServiceType;
    }
    const prompt = `Given the following list of test step descriptions, analyze each one and convert them into structured Playwright test steps.

Test step descriptions:
${descriptions.map((desc, index) => `${index + 1}. "${desc}"`).join('\n')}

For each step, return the appropriate Playwright action, selector, data, and code to implement this test step.

IMPORTANT: The 'action', 'data', and 'expected' fields should only contain human-readable descriptions without any HTML code, locators or selectors. All technical details like selectors should only be in the 'selector' and 'playwrightCode' fields.

Your response should be a JSON array where each item has this format:
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
4. Keep technical details ONLY in the selector and playwrightCode fields
5. Return the steps in the same order as the input descriptions`;

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
      
      // Ensure result is an array
      const steps = Array.isArray(result) ? result : [result];
      
      // Map each step to ensure consistent format
      return steps.map(step => ({
        action: step.action || "N/A",
        selector: step.selector || "",
        data: step.data || "",
        expected: step.expected || "",
        playwrightCode: step.playwrightCode || "",
      }));
    } catch (error) {
      console.error("Error generating multiple test steps:", error);
      // Return array of default steps matching the number of input descriptions
      return descriptions.map(() => ({
        action: "N/A",
        selector: "",
        data: "",
        expected: "",
        playwrightCode: "",
      }));
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
      provider = this.activeProvider;
    }

    // If we don't have settings for this provider, fetch minimal settings
    if (!this.api_keys[provider]) {
      const settings = await AIService.getProviderSettings(provider);
      this.api_keys[provider] = settings[`${provider}_api_key`];
      this.model_names[provider] = settings[`${provider}_model`];
      if (provider === 'claude' || provider === 'grok') {
        this.api_endpoints[provider] = settings[`${provider}_api_endpoint`];
      }
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

  async analyzePlaywrightCode(
    playwrightCode: string,
    provider?: AIServiceType
  ): Promise<any> {
    // Convert the code into an array of lines and use analyzeAndGenerateMultipleTestSteps
    const codeLines = playwrightCode
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const steps = await this.analyzeAndGenerateMultipleTestSteps(codeLines, provider);
    return steps;
  }
}