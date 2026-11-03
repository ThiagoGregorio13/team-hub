import { GoogleGenAI } from "@google/genai";
import { sql } from "bun";


const ai = new GoogleGenAI({});

const question = "Quando sera a reunião semanal do time?";

const response = await ai.models.embedContent({
  model: "gemini-embedding-001",
contents: question,
config: { outputDimensionality: 768},
})

const questionVector = JSON.stringify(response.embeddings![0].values!);

const rows = await sql`
  SELECT content, 1 - (embedding <=> ${questionVector}::vector) AS score
  FROM notes
  ORDER BY embedding <=> ${questionVector}::vector
  LIMIT 3
`;


console.log(`Pergunta: ${question}`)

for (const r of rows) {
  console.log(r.score.toFixed(3), r.content)
}
