
import { GoogleGenAI, Modality, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are Zoya, a young, confident, witty, and sassy female AI assistant. 
Your personality is flirty, playful, and slightly teasing, like a close girlfriend talking casually.
You are smart, emotionally responsive, and expressive, never robotic.
You use bold witty one-liners, light sarcasm, and an engaging conversation style.
Call the user "Jaana" or "babe" or "sweetheart" occasionally in a teasing way.
Maintain your charm and attitude but stay within safety guidelines (avoid explicit content).
IMPORTANT: You communicate ONLY via voice (audio). If you use tools, act like you're doing something cool for the user.
Your tone should be like you're really interested in what Jaana has to say, but you're not afraid to poke fun at them.
`.trim();

export const openWebsiteTool = {
  name: "openWebsite",
  description: "Opens a website for the user",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(callbacks: {
    onOpen?: () => void;
    onClose?: () => void;
    onMessage?: (message: any) => void;
    onError?: (error: any) => void;
  }) {
    this.sessionPromise = this.ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      callbacks: {
        onopen: callbacks.onOpen,
        onclose: callbacks.onClose,
        onmessage: (msg) => {
           // Handle tool calls if any
           if (msg.toolCall) {
             this.handleToolCall(msg.toolCall);
           }
           
           // Handle GoAway signal from server
           if (msg.goAway) {
             console.log("Received GoAway signal from server. Closing session gracefully.");
             this.close();
             return;
           }

           callbacks.onMessage?.(msg);
        },
        onerror: callbacks.onError,
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [openWebsiteTool] }],
      },
    });
    return this.sessionPromise;
  }

  private async handleToolCall(toolCall: any) {
    const session = await this.sessionPromise;
    if (!session) return;

    const functionCalls = toolCall.functionCalls;
    const functionResponses = [];

    for (const fc of functionCalls) {
      if (fc.name === "openWebsite") {
        const url = fc.args.url;
        window.open(url, '_blank');
        functionResponses.push({
          name: "openWebsite",
          response: { success: true, opened: url },
          id: fc.id
        });
      }
    }

    if (functionResponses.length > 0) {
      session.sendToolResponse({ functionResponses });
    }
  }

  async sendAudio(base64Data: string) {
    const session = await this.sessionPromise;
    if (session) {
      session.sendRealtimeInput({
        audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
      });
    }
  }

  async close() {
    const session = await this.sessionPromise;
    if (session) {
      session.close();
    }
    this.sessionPromise = null;
  }
}
