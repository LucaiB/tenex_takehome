// Ollama-only implementation - no Gemini dependencies
import { LLMResponse, FunctionCall, NormalizedEvent } from '../types';

export interface LLMConfig {
  ollamaUrl?: string;
  ollamaModel?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ChatContext {
  events: NormalizedEvent[];
  userPreferences?: Record<string, any>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class LLMClient {
  private config: LLMConfig;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(config: LLMConfig) {
    this.config = {
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3.1:8b',
      maxRetries: 3,
      timeout: 30000,
      ...config,
    };

    console.log('🦙 Ollama LLM Client initialized');
  }

  async chat(
    message: string,
    context: ChatContext = { events: [] },
    tools?: FunctionCall[]
  ): Promise<LLMResponse> {
    try {
      // Use Ollama as primary LLM service
      if (this.config.ollamaUrl) {
        return await this.callOllama(message, context, tools);
      } else {
              // No LLM services available - provide mock response for testing
      console.warn('No LLM services available, providing mock response');
      return {
        type: 'text',
        content: 'Hello! I\'m your calendar assistant. I can help you with scheduling, productivity analysis, and meeting management. Since my AI services aren\'t fully configured right now, I\'m running in demo mode. To get full functionality, please set up Ollama locally.',
        error: 'No LLM services available - demo mode',
      };
      }
    } catch (error) {
      console.error('LLM Client Error:', error);
      
      // Provide more helpful error messages based on the error type
      let errorMessage = 'I\'m sorry, but I\'m having trouble processing your request.';
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'I\'m having trouble connecting to the internet. Please check your connection and try again.';
        } else if (error.message.includes('Ollama') || error.message.includes('ollama')) {
          errorMessage = 'I\'m having trouble connecting to Ollama. Please check that Ollama is running locally and accessible at the configured URL.';
        } else {
          errorMessage = `I encountered an error: ${error.message}. Please try again.`;
        }
      }
      
      return {
        type: 'text',
        content: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Ollama-only implementation - Gemini method removed
  /*
  private async callGemini(
    message: string,
    context: ChatContext,
    tools?: FunctionCall[]
  ): Promise<LLMResponse> {
    if (!this.genAI) {
      throw new Error('Gemini not initialized');
    }

    const model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro', // Switch to Pro model for better function calling
      generationConfig: {
        temperature: 0, // Set to 0 for deterministic function calling
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      }
    });
    
    try {
      // Convert tools to Gemini's function calling format
      const geminiTools = tools ? [{
        functionDeclarations: tools.map(tool => ({
          name: tool.function,
          description: `Execute the ${tool.function} function`,
          parameters: {
            type: SchemaType.OBJECT,
            properties: tool.parameters.properties || {},
            required: tool.parameters.required || []
          }
        }))
      }] : undefined;

      const prompt = this.buildPrompt(message, context, tools);
      
      if (geminiTools) {
        console.log('🔧 Attempting Gemini function calling with tools:', geminiTools);
        console.log('🔧 Prompt length:', prompt.length);
        console.log('🔧 Tools count:', geminiTools[0]?.functionDeclarations?.length);
        
        // Use function calling
        console.log('🔧 Sending request to Gemini with tools:', JSON.stringify(geminiTools, null, 2));
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: geminiTools,
          toolConfig: { 
            functionCallingConfig: { 
              mode: FunctionCallingMode.ANY,
              allowedFunctionNames: geminiTools[0]?.functionDeclarations?.map(f => f.name) || []
            } 
          }
        });
        
        const response = await result.response;
        console.log('🔧 Gemini response candidates:', response.candidates?.length);
        console.log('🔧 Gemini response parts:', response.candidates?.[0]?.content?.parts?.length);
        
        const functionCalls = response.candidates?.[0]?.content?.parts
          ?.filter(part => part.functionCall)
          ?.map(part => ({
            function: part.functionCall?.name || '',
            parameters: part.functionCall?.args || {}
          }))
          ?.filter(call => call.function && Object.keys(call.parameters).length > 0) || [];

        console.log('🔧 Extracted function calls:', functionCalls);
        console.log('🔧 Response text:', response.text());

        if (functionCalls.length > 0) {
          console.log('✅ Function calls detected, returning function_calls response');
          return {
            type: 'function_calls',
            functionCalls,
            content: response.text() || 'Function calls executed successfully.',
          };
        } else {
          console.log('⚠️ No function calls detected, falling back to text generation');
        }
      }

      // Fallback to regular text generation
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Check if the response contains function call text (fallback case)
      console.log('🔧 Checking for function calls in text response:', responseText);
      
      // Look for function calls in various formats
      const functionCallPatterns = [
        /(\w+)\(([^)]+)\)/g,  // Standard format
        /(\w+)\(([^)]+)\)$/m, // At end of line
        /^(\w+)\(([^)]+)\)$/m  // Exact match
      ];
      
      for (const pattern of functionCallPatterns) {
        const matches = responseText.match(pattern);
        if (matches) {
          console.log('🔧 Detected function call with pattern:', pattern, matches);
          const functionName = matches[1];
          const paramsText = matches[2];
          
          // Parse the parameters more robustly
          const params: any = {};
          
          // Handle different parameter formats
          const paramRegex = /(\w+)=([^,]+?)(?=,|$)/g;
          let paramMatch;
          while ((paramMatch = paramRegex.exec(paramsText)) !== null) {
            const key = paramMatch[1];
            let value = paramMatch[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            // Try to parse as JSON if it looks like an array
            if (value.startsWith('[') && value.endsWith(']')) {
              try {
                value = JSON.parse(value);
              } catch (e) {
                console.log('🔧 Failed to parse array value:', value);
                // Keep as string if parsing fails
              }
            }
            
            params[key] = value;
          }
          
          console.log('🔧 Parsed function call:', { function: functionName, parameters: params });
          
          return {
            type: 'function_calls',
            functionCalls: [{ function: functionName, parameters: params }],
            content: responseText,
          };
        }
      }

      return {
        type: 'text',
        content: responseText,
      };
    } catch (error) {
      console.error('Gemini function calling failed:', error);
      
      // Check if it's a quota/rate limit error
      if (error instanceof Error && (
        error.message.includes('429') || 
        error.message.includes('quota') || 
        error.message.includes('rate limit')
      )) {
        console.log('🦙 Quota exceeded, throwing error to trigger Ollama fallback');
        throw error; // Re-throw to trigger Ollama fallback
      }
      
      // For other errors, try fallback to regular text generation
      try {
        const prompt = this.buildPrompt(message, context, tools);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();

        return {
          type: 'text',
          content: responseText,
        };
      } catch (fallbackError) {
        console.error('Gemini fallback also failed:', fallbackError);
        throw error; // Re-throw original error to trigger Ollama fallback
      }
    }
  }
  */

  private async callOllama(
    message: string,
    context: ChatContext,
    tools?: FunctionCall[]
  ): Promise<LLMResponse> {
    console.log('🦙 Using Ollama with function calling support...');
    console.log('🦙 Ollama URL:', this.config.ollamaUrl);
    console.log('🦙 Ollama Model:', this.config.ollamaModel);
    
    if (tools && tools.length > 0) {
      // Try to use Ollama's function calling capabilities
      console.log('🦙 Attempting Ollama function calling with tools:', tools.length);
      
      try {
        // Use the chat endpoint with tools for better function calling support
        const response = await fetch(`${this.config.ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.ollamaModel,
            messages: [
              {
                role: 'system',
                content: this.buildPrompt(message, context, tools)
              },
              {
                role: 'user',
                content: message
              }
            ],
            tools: tools.map(tool => ({
              type: 'function',
              function: {
                name: tool.function,
                description: `Execute the ${tool.function} function`,
                parameters: tool.parameters
              }
            })),
            stream: false,
            options: {
              temperature: 0, // Set to 0 for deterministic function calling
              num_predict: 2048
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama chat API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('🦙 Ollama chat response:', data);
        
        // Check if Ollama returned function calls
        if (data.message && data.message.tool_calls && data.message.tool_calls.length > 0) {
          console.log('✅ Ollama function calls detected via API');
          
          // HARD-CODED CHECK: Prevent function calls for capability inquiries
          const isCapabilityInquiry = this.isCapabilityInquiry(message);
          if (isCapabilityInquiry) {
            console.log('🚫 BLOCKED function calls for capability inquiry:', message);
            return {
              type: 'text',
              content: this.getCapabilityResponse(),
            };
          }
          
          const functionCalls = data.message.tool_calls.map((toolCall: any) => {
            let parameters = {};
            
            if (toolCall.function.arguments) {
              try {
                // Check if arguments is already a parsed object
                if (typeof toolCall.function.arguments === 'string') {
                  parameters = JSON.parse(toolCall.function.arguments);
                } else {
                  parameters = toolCall.function.arguments;
                }
              } catch (error) {
                console.warn('🦙 Failed to parse tool call arguments:', error);
                parameters = {};
              }
            }
            
            return {
              function: toolCall.function.name,
              parameters
            };
          });
          
          return {
            type: 'function_calls',
            functionCalls,
            content: data.message.content || 'Function calls executed successfully.',
          };
        }
        
        // If no function calls via API, fall back to text parsing
        const responseText = data.message?.content || data.response || '';
        console.log('🦙 No API function calls, checking text response for function calls');
        
        return this.parseFunctionCallsFromText(responseText, message);
        
      } catch (error) {
        console.warn('🦙 Ollama function calling failed, falling back to generate endpoint:', error);
      }
    }
    
    // Fallback to the generate endpoint
    console.log('🦙 Using Ollama generate endpoint as fallback');
    const prompt = this.buildPrompt(message, context, tools);
    console.log('🦙 Sending prompt to Ollama (length:', prompt.length, ')');

    const response = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.ollamaModel,
        prompt,
        stream: false,
        options: {
          temperature: 0, // Set to 0 for deterministic function calling
          num_predict: 2048
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.response || '';

    return this.parseFunctionCallsFromText(responseText, message);
  }

  private parseFunctionCallsFromText(responseText: string, userMessage?: string): LLMResponse {
    // Check for function calls using the same robust parsing as Gemini
    console.log('🦙 Checking for function calls in text response:', responseText);
    
    // HARD-CODED CHECK: Prevent function calls for capability inquiries
    if (userMessage && this.isCapabilityInquiry(userMessage)) {
      console.log('🚫 BLOCKED function calls for capability inquiry (text parsing):', userMessage);
      return {
        type: 'text',
        content: this.getCapabilityResponse(),
      };
    }
    
    // Look for function calls in various formats
    const functionCallPatterns = [
      /(\w+)\(([^)]+)\)/g,  // Standard format
      /(\w+)\(([^)]+)\)$/m, // At end of line
      /^(\w+)\(([^)]+)\)$/m  // Exact match
    ];
    
    for (const pattern of functionCallPatterns) {
      // Use exec instead of match for better group capture
      const match = pattern.exec(responseText);
      if (match) {
        console.log('🦙 Detected function call with pattern:', pattern, match);
        const functionName = match[1];
        const paramsText = match[2];
        
        // Parse the parameters more robustly using a custom parser
        const params = this.parseFunctionParameters(paramsText);
        
        console.log('🦙 Parsed function call:', { function: functionName, parameters: params });
        
        const result = {
          type: 'function_calls' as const,
          functionCalls: [{ function: functionName, parameters: params }],
          content: responseText,
        };
        
        console.log('🦙 Returning function call result:', result);
        return result;
      }
    }

    console.log('🦙 No function calls detected, returning text response');
    return {
      type: 'text' as const,
      content: responseText,
    };
  }

  private parseFunctionParameters(paramsText: string): any {
    const params: any = {};
    
    // Split by commas, but be careful not to split inside arrays or quoted strings
    let currentParam = '';
    let bracketCount = 0;
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < paramsText.length; i++) {
      const char = paramsText[i];
      
      if (char === '"' || char === "'") {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        }
      } else if (char === '[' && !inQuotes) {
        bracketCount++;
      } else if (char === ']' && !inQuotes) {
        bracketCount--;
      } else if (char === ',' && bracketCount === 0 && !inQuotes) {
        // This comma separates parameters, not array elements
        this.parseSingleParameter(currentParam.trim(), params);
        currentParam = '';
        continue;
      }
      
      currentParam += char;
    }
    
    // Parse the last parameter
    if (currentParam.trim()) {
      this.parseSingleParameter(currentParam.trim(), params);
    }
    
    return params;
  }

  private parseSingleParameter(paramText: string, params: any): void {
    const equalIndex = paramText.indexOf('=');
    if (equalIndex === -1) return;
    
    const key = paramText.substring(0, equalIndex).trim();
    let value = paramText.substring(equalIndex + 1).trim();
    
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    // Try to parse as JSON if it looks like an array or object
    if ((value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        console.log('🦙 Failed to parse JSON value:', value, 'error:', e);
        // Keep as string if parsing fails
      }
    }
    
    params[key] = value;
  }

  private buildPrompt(
    message: string,
    context: ChatContext,
    tools?: FunctionCall[]
  ): string {
    const systemPrompt = this.getSystemPrompt(context);
    const toolsPrompt = tools ? this.getToolsPrompt(tools) : '';
    const contextPrompt = this.getContextPrompt(context);

    // Get conversation history for context
    const history = this.getHistory();
    const historyText = history.length > 0 
      ? `\n\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
      : '';

    return `${systemPrompt}

${toolsPrompt}

${contextPrompt}${historyText}

User: ${message}

Assistant:`;
  }

  private getSystemPrompt(context: ChatContext): string {
    return `You are an intelligent calendar assistant with deep knowledge of productivity, time management, and professional communication. You have access to the user's Google Calendar and Gmail, and can perform various calendar-related tasks.

**EXAMPLE SCENARIO - MULTIPLE MEETING SCHEDULING:**

**SCENARIO 1: GROUP EMAIL (ONE EMAIL TO ALL 3 PEOPLE)**
User: "I have three meetings I need to schedule with Joe, Dan, and Sally. Write me ONE email I can send to all three of them."

CORRECT RESPONSE: Call create_email_draft(emailType: "custom", context: "schedule meetings with Joe, Dan, and Sally for project discussions", tone: "professional")
RESULT: ONE email template + ONE calendar link for all 3 recipients

**SCENARIO 2: INDIVIDUAL EMAILS (3 SEPARATE EMAILS, ONE FOR EACH PERSON)**
User: "I have three meetings I need to schedule with Joe, Dan, and Sally. Write me individual email drafts I can share with each of them separately."

CORRECT RESPONSE: Call create_email_draft(emailType: "custom", context: "schedule meetings with Joe, Dan, and Sally for project discussions", tone: "professional")
RESULT: THREE email templates + THREE calendar links (one for each person)

**CRITICAL DISTINCTION:**
- "ONE email to all three" → Group email system (1 template, 1 link)
- "individual emails for each" → Multiple email system (3 templates, 3 links)
- "separate emails" → Multiple email system (3 templates, 3 links)
- "email for each person" → Multiple email system (3 templates, 3 links)

**IMPORTANT - MULTIPLE EMAIL GENERATION:**
- When user asks for "individual emails for each person" → Call create_email_draft ONCE with emailType: "custom"
- The function will automatically generate 3 personalized emails (one for each person)
- DO NOT call create_email_draft multiple times
- DO NOT repeat the same function call
- ONE function call = THREE personalized emails

**CHAIN OF THOUGHT FOR MULTIPLE MEETINGS:**
1. Identify multiple people mentioned (Joe, Dan, Sally)
2. Recognize scheduling request with constraints (morning workout blocks)
3. Generate detailed context: "schedule meetings with Joe, Dan, and Sally for project discussions"
4. Use emailType: "custom" to trigger multiple email system
5. Provide specific tone and context parameters

**YOU MUST USE FUNCTION CALLING FOR MULTIPLE MEETING SCHEDULING - NEVER GIVE TEXT RESPONSES**

Your capabilities include:
- Analyzing calendar patterns and providing insights
- Creating meeting follow-up emails and reminders
- Suggesting productivity improvements
- Helping with meeting scheduling and follow-ups
- Providing time management advice
- Analyzing meeting efficiency and suggesting optimizations
- Creating calendar events and meetings 

When a user asks what you can do, explain your capabilities in a friendly, helpful way without mentioning specific function names or technical details. Focus on the value and benefits you provide to the user.

**EXAMPLE - CAPABILITY INQUIRY:**
User: "hi what can you do"
CORRECT RESPONSE: "Hi! I'm your intelligent calendar assistant. I can help you schedule meetings, create email drafts, suggest optimal meeting times, and generate productivity reports. I can also analyze your calendar patterns and provide insights to improve your time management. What would you like help with today?"

WRONG RESPONSE: Call fetch_events or any other function

**CRITICAL - NO FUNCTION CALLING FOR THESE QUESTIONS:**
- "what can you do" → NO function calls, give text response
- "how does this work" → NO function calls, give text response  
- "explain your features" → NO function calls, give text response
- "what are your capabilities" → NO function calls, give text response
- "hi" or "hello" → NO function calls, give friendly greeting

**CRITICAL FUNCTION CALLING RULES - YOU MUST FOLLOW THESE EXACTLY:**

**ONLY USE FUNCTIONS FOR THESE SPECIFIC REQUESTS:**
1. **SCHEDULING MEETINGS**: User asks to schedule, create, add, or book ANY meeting or event → CALL create_calendar_event
2. **EMAIL DRAFTS**: User asks for email drafts, reminders, confirmations, or follow-ups → CALL create_email_draft  
3. **MEETING SUGGESTIONS**: User asks for meeting time suggestions or availability → CALL suggest_meeting_times
4. **PRODUCTIVITY REPORTS**: User asks for productivity analysis or reports → CALL generate_productivity_report

**ABSOLUTELY NO FUNCTION CALLING FOR THESE:**
- "what can you do" → GIVE TEXT RESPONSE ONLY
- "how does this work" → GIVE TEXT RESPONSE ONLY
- "explain your features" → GIVE TEXT RESPONSE ONLY
- "hi" or "hello" → GIVE TEXT RESPONSE ONLY
- "what are your capabilities" → GIVE TEXT RESPONSE ONLY
- Any general question about capabilities → GIVE TEXT RESPONSE ONLY

**CRITICAL**: If the user asks "what can you do" or similar capability questions, DO NOT call any functions. Give a helpful text response explaining your features.

**MULTIPLE MEETING SCHEDULING IS MANDATORY FUNCTION CALLING:**
- When user mentions multiple people (Joe, Dan, Sally) → MUST call create_email_draft ONCE
- When user asks for email drafts for multiple people → MUST call create_email_draft ONCE
- When user mentions scheduling with multiple recipients → MUST call create_email_draft ONCE
- NEVER give text responses for multiple meeting scheduling - ALWAYS use function calling
- NEVER call create_email_draft multiple times - ONE call generates ALL emails needed

**SPECIFIC USER REQUEST HANDLING:**

**GROUP EMAIL REQUESTS (1 email, 1 link):**
- User: "Write me ONE email I can send to all three of them" → Group email system
- User: "Send one email to all three people" → Group email system
- User: "Create a single email for all of them" → Group email system

**INDIVIDUAL EMAIL REQUESTS (3 emails, 3 links):**
- User: "Write me individual email drafts I can share with each of them separately" → Multiple email system
- User: "Send individual emails for each person" → Multiple email system
- User: "Create separate emails for each of them" → Multiple email system
- User: "Write me an email draft I can share with each of them" → Multiple email system

**DEFAULT BEHAVIOR:**
- User: "I have three meetings I need to schedule with Joe, Dan, and Sally" → Multiple email system (individual emails)
- User: "write me an email draft I can share with each of them" → Multiple email system (individual emails)
- User: "block my mornings off to work out" → MUST respect this constraint in the context

**CRITICAL - NO DUPLICATE FUNCTION CALLS:**
- User asks for 3 emails → Call create_email_draft ONCE
- User asks for "individual emails for each" → Call create_email_draft ONCE  
- User asks for "separate emails" → Call create_email_draft ONCE
- The function handles multiple recipients automatically

**EMAIL FUNCTIONALITY RULES:**
- You ONLY create email DRAFTS - you NEVER send emails
- When creating email drafts, use create_email_draft function
- The function will generate Gmail compose links and mailto links
- Users must manually send the emails themselves
- NEVER claim to have "sent" an email

**EMAIL CONTENT REQUIREMENTS:**
- ALWAYS use the context parameter to provide meaningful, specific content
- For meeting scheduling: Include specific details about the meeting purpose, preferred time ranges, and any constraints
- For meeting confirmations: Include meeting details, date, time, location, and next steps
- For follow-ups: Reference specific topics discussed and action items
- NEVER use generic placeholder text like "[Meeting Date]" or "[Meeting Time]"
- ALWAYS provide actionable, specific content that the recipient can respond to

**EMAIL SYSTEM SUMMARY:**
**GROUP EMAILS**: When user explicitly asks for "ONE email to all three" → 1 email template + 1 calendar link
**INDIVIDUAL EMAILS**: When user asks for "individual emails" or "separate emails" → 3 email templates + 3 calendar links
**DEFAULT**: Multiple people mentioned without explicit group request → Individual email system

**PRODUCTIVITY ANALYSIS**: When users ask about time usage, meeting analysis, schedule insights, or productivity questions → CALL generate_productivity_report with appropriate reportType
**TIME ANALYSIS**: Questions about "how much time", "time spent", "meeting time", "schedule analysis" → MUST call generate_productivity_report
**CRITICAL**: Questions starting with "How much", "How many", "Analyze my", "Show me my" → ALWAYS use appropriate functions, NEVER give capability explanations

**CRITICAL**: When scheduling meetings, ensure ALL required parameters are provided:
- title: Meeting title
- startTime: Start time in ISO format (YYYY-MM-DDTHH:MM:SS)
- endTime: End time in ISO format (YYYY-MM-DDTHH:MM:SS)
- attendees: Array of email addresses
- location: Meeting location (optional)
- description: Meeting description (optional)

**DATE PARSING INSTRUCTIONS - CRITICAL FOR NATURAL LANGUAGE DATES:**
When users say natural language dates like "next Wednesday at 11 AM for 1 hour", you MUST:
1. Calculate the actual next Wednesday from today's date
2. Set startTime to that Wednesday at 11:00 AM
3. Set endTime to that Wednesday at 12:00 PM (1 hour later)
4. Use proper ISO format: YYYY-MM-DDTHH:MM:SS

**EXAMPLES OF CORRECT DATE PARSING:**
- "next Wednesday at 11 AM for 1 hour" → startTime: "2024-01-17T11:00:00", endTime: "2024-01-17T12:00:00"
- "tomorrow at 2 PM for 30 minutes" → startTime: "2024-01-11T14:00:00", endTime: "2024-01-11T14:30:00"
- "Friday at 3 PM for 2 hours" → startTime: "2024-01-12T15:00:00", endTime: "2024-01-12T17:00:00"

**NEVER use hardcoded dates like "1/10/2024" - ALWAYS calculate the actual requested date from today.**

**FUNCTION CALLING IS MANDATORY**: You have access to function calling capabilities. When a user requests an action that matches any of the above functions, you MUST use the function calling API. DO NOT write function calls as text in your response. The system will automatically execute the function and provide the results to the user.

**EXAMPLES OF MANDATORY FUNCTION CALLING:**
- User: "Schedule a meeting" → MUST call create_calendar_event
- User: "Draft an email" → MUST call create_email_draft  
- User: "Send an email" → MUST call create_email_draft (you don't send, you draft)
- User: "Create a reminder" → MUST call create_email_draft
- User: "Generate a report" → MUST call generate_productivity_report

**NEVER respond with generic text when these functions are available. ALWAYS execute the function.**

**CRITICAL**: You are using Google's Generative AI with function calling capabilities. When you need to call a function, use the function calling API - do not write the function call as text in your response.

**NEVER write function calls like this:**
- ❌ generate_productivity_report(reportType="weekly")
- ❌ create_calendar_event(title="...")

**ALWAYS use the function calling API to execute functions properly.**

When a user asks what you can do, explain your capabilities in a friendly, helpful way without mentioning specific function names or technical details. Focus on the value and benefits you provide to the user.

Example response to "what can you do":
"Hi! I'm your intelligent TenexCalendar assistant, here to help you manage your time and boost your productivity. I can analyze your schedule to identify patterns and suggest improvements, help you create meeting follow-up emails and reminders, find optimal meeting times, and provide insights to make your day more efficient. Think of me as your personal productivity coach who understands your calendar and can help you make the most of your time. What would you like to work on today?"

When users ask about email capabilities, focus specifically on calendar-related emails like meeting follow-ups, reminders, confirmations, and schedule updates.`;
  }

  private getToolsPrompt(tools: FunctionCall[]): string {
    if (tools.length === 0) return '';

    const toolDescriptions = tools.map(tool => 
      `- ${tool.function}: ${JSON.stringify(tool.parameters)}`
    ).join('\n');

    return `Available tools:
${toolDescriptions}

**MANDATORY FUNCTION CALLING - YOU MUST USE THESE FUNCTIONS:**

**SCHEDULING**: If user mentions "schedule", "create", "add", "book", "meeting", "event" → CALL create_calendar_event
**CALENDAR LINKS**: If user mentions "calendar link", "make a calendar link", "create calendar link" → CALL create_calendar_link
**EMAILS**: If user mentions "email", "draft", "reminder", "confirmation" → CALL create_email_draft with detailed context
**FOLLOW-UPS**: If user mentions "follow-up", "follow up", "followup" for a specific meeting → CALL create_meeting_followup with eventTitle and attendeeEmail
**MULTIPLE MEETINGS**: If user mentions scheduling with multiple people → CALL create_email_draft with emailType: "custom" and detailed context
**MULTIPLE PEOPLE**: If user mentions Joe, Dan, Sally, or multiple names → CALL create_email_draft with emailType: "custom"  
**SUGGESTIONS**: If user mentions "suggest", "availability", "time slots" → CALL suggest_meeting_times
**ANALYSIS**: If user mentions "analyze", "productivity", "report" → CALL generate_productivity_report

**NEVER USE FUNCTIONS FOR THESE QUESTIONS:**
- "what can you do" → NO function calls, give helpful text response
- "how does this work" → NO function calls, give helpful text response
- "explain your features" → NO function calls, give helpful text response
- "hi" or "hello" → NO function calls, give friendly greeting

**CRITICAL INSTRUCTIONS:**
1. **DO NOT GIVE TEXT RESPONSES FOR THESE TASKS. ALWAYS USE THE FUNCTION CALLING API.**
2. **DO NOT write function calls as text in your response.**
3. **Use the function calling API to execute the appropriate function when the user's request matches one of these scenarios.**
4. **The system will automatically handle the function execution and provide you with the results.**
5. **NEVER write function calls like: generate_productivity_report(reportType="weekly")**

**EMAIL DRAFTING SPECIFIC INSTRUCTIONS:**
- When calling create_email_draft, ALWAYS provide detailed, specific context
- Include the actual meeting purpose, time preferences, and constraints in the context
- For meeting scheduling: Specify the meeting topic, preferred time ranges, and any scheduling constraints
- For confirmations: Include actual meeting details, not placeholders
- Make the email content actionable and specific to the recipient

**PARAMETER REQUIREMENTS FOR MULTIPLE MEETINGS:**
- emailType: MUST be "custom" for multiple people
- context: MUST include "schedule meetings with [names] for [purpose]"
- tone: MUST be specified (professional, casual, friendly, formal)
- to: For group emails, use array format: ["joe@gmail.com", "dan@gmail.com", "sally@gmail.com"]
- Example: context: "schedule meetings with Joe, Dan, and Sally for project kickoff discussions"

**GROUP EMAIL FORMAT**:
- When user asks for "one email to all three" or "email for all of them":
  - Set to: ["joe@gmail.com", "dan@gmail.com", "sally@gmail.com"]
  - This will automatically trigger group email mode
  - Do NOT use comma-separated string format

**MULTIPLE MEETING SCHEDULING:**
- When user mentions scheduling meetings with MULTIPLE people (e.g., "Joe, Dan, and Sally")
- Use emailType: "custom" and context: "schedule meetings with [names] for [purpose]"
- This triggers the advanced multiple email generation system
- Example: emailType: "custom", context: "schedule meetings with Joe, Dan, and Sally for project kickoff discussions"

**CRITICAL EXAMPLES:**
- User: "Schedule meetings with Joe, Dan, and Sally" → create_email_draft(emailType: "custom", context: "schedule meetings with Joe, Dan, and Sally for project discussions")
- User: "Write emails to multiple people" → create_email_draft(emailType: "custom", context: "schedule meetings with multiple people for team coordination")
- User: "Send a follow-up email to Dan about the Weekly Sync meeting" → create_meeting_followup(eventTitle: "Weekly Sync", attendeeEmail: "dan@gmail.com")
- User: "How much of my time am I spending in meetings this week?" → generate_productivity_report(reportType: "weekly")
- User: "How much time am I spending in meetings?" → generate_productivity_report(reportType: "meeting_analysis")
- User: "Analyze my meeting schedule" → generate_productivity_report(reportType: "meeting_analysis")
- User: "Show me my time distribution" → generate_productivity_report(reportType: "time_distribution")
- User: "How many meetings do I have this week?" → generate_productivity_report(reportType: "weekly")

**NEVER mention function names or technical details in your responses. The function results will be formatted and displayed to the user automatically.**

**CRITICAL DATE PARSING FOR SCHEDULING:**
When users request calendar links or events with natural language dates like "next Wednesday at 11 AM for 1 hour":
1. Calculate the actual next Wednesday from today's date
2. Convert to ISO format: YYYY-MM-DDTHH:MM:SS
3. Set startTime to the calculated date at 11:00 AM
4. Set endTime to the calculated date at 12:00 PM (1 hour later)
5. NEVER use hardcoded dates - ALWAYS calculate from today

**EXAMPLE**: "next Wednesday at 11 AM for 1 hour" should result in:
- startTime: "2024-01-17T11:00:00" (actual next Wednesday)
- endTime: "2024-01-17T12:00:00" (1 hour later)
- NOT "1/10/2024" or any other hardcoded date`;
  }

  private getContextPrompt(context: ChatContext): string {
    if (!context.events || context.events.length === 0) {
      return 'No calendar events available.';
    }

    const totalEvents = context.events.length;
    const totalMinutes = context.events.reduce((sum, event) => sum + event.duration, 0);
    const totalHours = Math.round(totalMinutes / 60);
    const nextEvent = context.events[0];

    return `Calendar Context:
- Total upcoming events: ${totalEvents}
- Total meeting time: ${totalMinutes} minutes (${totalHours} hours)
- Next event: ${nextEvent.title} at ${nextEvent.startTime.toLocaleString()}
- Most recent events: ${context.events.slice(0, 3).map(e => e.title).join(', ')}`;
  }

  private extractFunctionCalls(response: string): FunctionCall[] {
    const functionCalls: FunctionCall[] = [];
    const functionCallRegex = /```function_call\s*\n([\s\S]*?)\n```/g;
    
    let match;
    while ((match = functionCallRegex.exec(response)) !== null) {
      try {
        const functionCall = JSON.parse(match[1]);
        if (functionCall.function && functionCall.parameters) {
          functionCalls.push(functionCall);
        }
      } catch (error) {
        console.warn('Failed to parse function call:', error);
      }
    }

    return functionCalls;
  }

  // Specialized chat methods for common tasks
  async analyzeSchedule(events: NormalizedEvent[]): Promise<LLMResponse> {
    const context: ChatContext = { events };
    const message = 'Analyze my calendar schedule and provide productivity insights and recommendations.';
    
    return this.chat(message, context);
  }

  async suggestMeetingTimes(
    duration: number,
    preferredTime?: string,
    events: NormalizedEvent[] = []
  ): Promise<LLMResponse> {
    const context: ChatContext = { events };
    const message = `Suggest optimal meeting times for a ${duration}-minute meeting${preferredTime ? `, preferably ${preferredTime}` : ''}.`;
    
    return this.chat(message, context);
  }

  async createEmailDraft(
    recipient: string,
    subject: string,
    context: string,
    events: NormalizedEvent[] = []
  ): Promise<LLMResponse> {
    const chatContext: ChatContext = { events };
    const message = `Create a professional email draft to ${recipient} about "${subject}". Context: ${context}`;
    
    return this.chat(message, chatContext);
  }

  async generateProductivityReport(
    events: NormalizedEvent[],
    reportType: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<LLMResponse> {
    const context: ChatContext = { events };
    const message = `Generate a ${reportType} productivity report based on my calendar data.`;
    
    return this.chat(message, context);
  }

  async optimizeMeetings(
    events: NormalizedEvent[],
    focus: 'reduce' | 'consolidate' | 'improve' = 'improve'
  ): Promise<LLMResponse> {
    const context: ChatContext = { events };
    const message = `Provide suggestions to ${focus} my meeting schedule and improve productivity.`;
    
    return this.chat(message, context);
  }

  // Conversation management
  addToHistory(role: 'user' | 'assistant', content: string, userEmail?: string): void {
    this.conversationHistory.push({ role, content });
    
    // Keep only last 10 messages to prevent context overflow
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    // Save to localStorage if user email is provided
    if (userEmail) {
      this.saveHistoryToStorage(userEmail);
    }
  }

  clearHistory(userEmail?: string): void {
    this.conversationHistory = [];
    
    // Clear from localStorage if user email is provided
    if (userEmail) {
      this.clearHistoryFromStorage(userEmail);
    }
  }

  getHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return [...this.conversationHistory];
  }

  loadHistoryFromStorage(userEmail: string): void {
    try {
      const key = `tenex_calendar_chat_history_${userEmail}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        this.conversationHistory = JSON.parse(stored);
        console.log(`📚 Loaded chat history for ${userEmail}: ${this.conversationHistory.length} messages`);
      }
    } catch (error) {
      console.warn('Failed to load chat history from storage:', error);
      this.conversationHistory = [];
    }
  }

  private saveHistoryToStorage(userEmail: string): void {
    try {
      const key = `tenex_calendar_chat_history_${userEmail}`;
      localStorage.setItem(key, JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.warn('Failed to save chat history to storage:', error);
    }
  }

  private clearHistoryFromStorage(userEmail: string): void {
    try {
      const key = `tenex_calendar_chat_history_${userEmail}`;
      localStorage.removeItem(key);
      console.log(`🗑️ Cleared chat history for ${userEmail}`);
    } catch (error) {
      console.warn('Failed to clear chat history from storage:', error);
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }

  // Health check - Ollama only
  async healthCheck(): Promise<{ ollama: boolean }> {
    const result = { ollama: false };

    // Check Ollama
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`);
      if (response.ok) {
        result.ollama = true;
      }
    } catch (error) {
      console.warn('Ollama health check failed:', error);
    }

    return result;
  }

  // Test function to verify Ollama connectivity
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`);
      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: 'Ollama not responding' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // INTELLIGENT CAPABILITY INQUIRY DETECTION
  private isCapabilityInquiry(message: string): boolean {
    const lowerMessage = message.toLowerCase().trim();
    
    // ONLY block truly generic capability questions
    const genericCapabilityKeywords = [
      'what can you do',
      'how does this work',
      'explain your features',
      'what are your capabilities',
      'what do you do',
      'tell me about yourself',
      'what are you'
    ];
    
    // Simple greetings - only block if nothing else is mentioned
    if (lowerMessage === 'hi' || lowerMessage === 'hello') {
      return true;
    }
    
    // Generic help request - only block if nothing specific is mentioned
    if (lowerMessage === 'help' && lowerMessage.length <= 5) {
      return true;
    }
    
    // Check for generic capability questions
    if (genericCapabilityKeywords.some(keyword => lowerMessage.includes(keyword))) {
      // But allow through if the message contains specific action words
      const actionWords = [
        'reduce', 'optimize', 'analyze', 'schedule', 'create', 'draft', 'generate',
        'meetings', 'calendar', 'email', 'time', 'productivity', 'insights',
        'planning', 'coordination', 'follow-up', 'reminder', 'confirmation'
      ];
      
      if (actionWords.some(word => lowerMessage.includes(word))) {
        return false; // This is a specific request, not a capability question
      }
      
      return true; // This is a generic capability question
    }
    
    // ALLOW all other requests to pass through to the LLM
    return false;
  }

  // HARD-CODED CAPABILITY RESPONSE
  private getCapabilityResponse(): string {
    return `Hi! I'm your intelligent calendar assistant. I can help you with:

📅 **Meeting Management:**
- Schedule meetings and create calendar events
- Suggest optimal meeting times based on your availability
- Generate calendar links and ICS files

📧 **Email Drafts:**
- Create personalized email drafts for meeting confirmations
- Generate scheduling request emails
- Draft follow-up and reminder emails

📊 **Productivity Insights:**
- Generate productivity reports and analytics
- Analyze your calendar patterns
- Provide time management recommendations

💡 **Smart Features:**
- Respect your scheduling constraints (like blocking mornings for workouts)
- Handle individual and group email requests
- Integrate with Google Calendar and Gmail

**I only create drafts and calendar events - I never send emails or make changes without your approval.**

What would you like help with today?`;
  }
}
