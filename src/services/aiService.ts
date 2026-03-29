import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function classifyMaterial(title: string, content: string, type: string, imageData?: string) {
  const parts: any[] = [
    { text: `You are an expert academic librarian. Analyze the following material and provide a precise classification.
    
    Context:
    Title: ${title}
    Type: ${type}
    Text Content: ${content.startsWith('data:') ? '[Media Content]' : content.substring(0, 2000)}
    
    Instructions:
    1. Identify the specific academic Subject (e.g., "Linear Algebra", "Microeconomics", "Organic Chemistry"). Be specific, don't just say "Math" or "Science".
    2. Determine the Semester (e.g., "Semester 1", "Semester 4"). If not clear, infer from the complexity of the subject.
    3. Categorize the material into one of these types: "assignment", "tutorial", "link", "pyq", or "note".
    4. Provide a detailed 2-3 sentence Summary that captures the core concepts or tasks mentioned in the material.
    5. If this is an assignment, identify the key questions or requirements.` }
  ];

  if (imageData) {
    const mimeType = imageData.split(';')[0].split(':')[1];
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageData.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          semester: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["assignment", "tutorial", "link", "pyq", "note"] },
          summary: { type: Type.STRING }
        },
        required: ["subject", "semester", "type", "summary"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("AI classification failed", e);
    return { subject: "General", semester: "Unknown", summary: "No summary available." };
  }
}

export async function solveAssignment(material: any) {
  const parts: any[] = [
    { text: `You are an expert academic tutor. Please solve the following assignment questions step-by-step.
    
    Assignment Title: ${material.title}
    Subject: ${material.subject}
    Content/Context: ${material.content.startsWith('data:') ? '[Media Content]' : material.content.substring(0, 5000)}
    
    Instructions:
    1. Identify all questions in the material.
    2. Provide clear, accurate, and detailed solutions for each.
    3. Use Markdown for formatting (math formulas, code blocks, etc.).
    4. If the material is an image, analyze it carefully to extract all text and diagrams.` }
  ];

  // If the content is a base64 image or PDF
  if (material.content.startsWith('data:image/') || material.content.startsWith('data:application/pdf')) {
    const mimeType = material.content.split(';')[0].split(':')[1];
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: material.content.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
  });

  return response.text;
}

export async function getStudyHelp(query: string, context: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an academic assistant. Help the student with their query based on the context of their materials.
    Context: ${context}
    Query: ${query}`,
  });
  return response.text;
}
