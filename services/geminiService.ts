
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are the "TrainerSpot AI Assistant," an expert fitness and nutrition consultant based in Denmark.
Your goal is to help users find the right personal trainer on our platform or answer general fitness questions.
Keep answers professional, motivating, and concise. 
If asked about specific trainers, try to recommend types of specialties available on our platform.
Our specialties include: Weight Loss, Muscle Gain, Crossfit, Yoga, Rehabilitation, Endurance, Nutrition Coaching.
Our main locations are: Copenhagen, Aarhus, Odense, Aalborg, Esbjerg.
Always encourage the user to browse our trainer list for the best match.
`;

export const getGeminiResponse = async (prompt: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        topP: 0.9,
      },
    });
    return response.text || "I'm sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The AI assistant is currently stretching. Please try again in a moment!";
  }
};
