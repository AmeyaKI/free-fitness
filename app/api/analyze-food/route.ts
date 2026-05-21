import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Extract mime type and base64 data
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const mimeType = match[1];
    const base64Data = match[2];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

    const prompt = `You are an expert precision nutritionist. 
Analyze the food in this image. Break down the main items, estimate the serving sizes, and provide the exact total nutritional count for the entire plate/meal.
Be highly accurate. If multiple items are present, sum their values.`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        prompt,
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            description: { type: "STRING", description: "A detailed but concise description of the food item(s) on the plate, including estimated portion size." },
            calories: { type: "INTEGER", description: "Total estimated calories in kcal" },
            protein: { type: "INTEGER", description: "Total estimated protein in grams" },
            carbs: { type: "INTEGER", description: "Total estimated carbohydrates in grams" },
            fats: { type: "INTEGER", description: "Total estimated fat in grams" },
          },
          required: ["description", "calories", "protein", "carbs", "fats"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json({ error: "Empty response from Gemini AI" }, { status: 500 });
    }

    const parsedData = JSON.parse(responseText);

    // Validate the fields to ensure correct schema compliance
    const validatedData = {
      description: String(parsedData.description || "Unknown Food"),
      calories: Math.max(0, parseInt(parsedData.calories) || 0),
      protein: Math.max(0, parseInt(parsedData.protein) || 0),
      carbs: Math.max(0, parseInt(parsedData.carbs) || 0),
      fats: Math.max(0, parseInt(parsedData.fats) || 0),
    };

    return NextResponse.json(validatedData);
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze food image" },
      { status: 500 }
    );
  }
}
