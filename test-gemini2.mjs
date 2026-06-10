import { GoogleGenerativeAI } from "@google/generative-ai";

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
  });

  const prompt = `Hello`;

  try {
    const result = await model.generateContent([prompt]);
    console.log(result.response.text());
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
