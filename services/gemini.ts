import { GoogleGenAI, Type } from "@google/genai";
import { Book } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBookMetadata = async (contentSnippet: string): Promise<{
  title: string;
  author: string;
  tags: string[];
  description: string;
}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `分析以下书籍片段（前几千个字符）。
      提取可能的标题和作者。
      生成 3-5 个相关的中文流派标签。
      写一段简短的中文简介（一句话）。
      
      书籍片段:
      ${contentSnippet.substring(0, 2000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            description: { type: Type.STRING }
          },
          required: ["title", "author", "tags", "description"]
        }
      }
    });
    
    const text = response.text;
    if (!text) return { title: "未知标题", author: "未知作者", tags: [], description: "" };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Metadata generation failed:", error);
    return {
      title: "未命名书籍",
      author: "未知作者",
      tags: ["导入"],
      description: "暂无描述。"
    };
  }
};

export const generateCoverImage = async (title: string, author: string, description: string): Promise<string | null> => {
  try {
    const prompt = `为一本书设计一个极简主义的艺术封面，书名是 "${title}"，作者是 ${author}。描述：${description}。高质量，优雅的排版，矢量艺术风格。`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
             aspectRatio: "3:4"
          }
        }
    });

    // Extract image
    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData) {
         return `data:image/png;base64,${part.inlineData.data}`;
       }
    }
    
    return null;
  } catch (error) {
    console.error("Cover generation failed:", error);
    // Fallback to a generated placeholder URL if API fails
    return `https://placehold.co/400x600/e2e8f0/1e293b?text=${encodeURIComponent(title.substring(0, 10))}`;
  }
};

export const processBookContent = async (
  content: string, 
  taskType: 'summarize' | 'translate' | 'modernize' | 'screenplay',
  targetLanguage?: string
) => {
  const model = "gemini-2.5-flash"; // Efficient for text processing
  
  let prompt = "";
  switch (taskType) {
    case 'summarize':
      prompt = "请将以下文本总结为一个全面的概述，包括主要情节点、人物和主题。使用中文 Markdown 格式输出。";
      break;
    case 'translate':
      prompt = `将以下文本翻译成${targetLanguage || '中文'}。保持原文的语气和风格。`;
      break;
    case 'modernize':
      prompt = "用现代、通俗易懂的中文重写以下文本，同时保留其原始含义和细微差别。";
      break;
    case 'screenplay':
      prompt = "将以下叙事文本转换为中文剧本格式，包括场景标题、对话和动作描述。";
      break;
  }

  // We process a chunk if it's too large, for this demo we'll take the first 15k characters to ensure speed and demo viability.
  const contentChunk = content.substring(0, 15000); 
  const fullPrompt = `${prompt}\n\n---\n\n${contentChunk}${content.length > 15000 ? '\n\n...(文本已截断)...' : ''}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt
    });
    return response.text;
  } catch (error) {
    console.error("Processing failed:", error);
    throw new Error("Gemini 处理失败。");
  }
};
