import { GoogleGenAI } from "@google/genai";
import { sql } from "bun";


const ai = new GoogleGenAI({});


const notes = [
    "Deploy: o Render publica sozinho quando damos merge no master",
  "Reunião semanal do time às segundas, 10h",
  "Dúvidas de pagamento e reembolso: falar com a Ana do financeiro",
  "O banco de dados de produção fica no Neon",
]

const response = await ai.models.embedContent({
  model: "gemini-embedding-001",
contents: notes,
config: { outputDimensionality: 768},
})

const notesWithVectors  = notes.map((content, i) => ({
 content,
 embedding: response.embeddings![i].values!
}))


for(const r of notesWithVectors ){
  await sql`INSERT INTO notes (content, embedding) VALUES (${r.content}, ${JSON.stringify(r.embedding)})`
}

