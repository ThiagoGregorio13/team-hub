import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

function similarity(a: number[], b:number[]){
  let dot = 0, normA = 0, normB = 0;
  for(let i = 0; i < a.length; i++){
    dot += a[i] * b[i];
    normA += a[i] * a[i]
    normB += b[i] * b[i];
  }
  return dot/(Math.sqrt(normA) * Math.sqrt(normB));
}

const notes = [
    "Deploy: o Render publica sozinho quando damos merge no master",
  "Reunião semanal do time às segundas, 10h",
  "Dúvidas de pagamento e reembolso: falar com a Ana do financeiro",
  "O banco de dados de produção fica no Neon",
]

const question = "Bom dia, tudo bem?";

const response = await ai.models.embedContent({
  model: "gemini-embedding-001",
contents: [...notes, question],
config: { outputDimensionality: 768},
})

const vectors = response.embeddings!.map((e) => e.values!)

const questionVector = vectors[vectors.length - 1];

const noteVectors = vectors.slice(0, vectors.length - 1);

const ranking = notes.map((note, i) => ({
  note,
  score: similarity(noteVectors[i], questionVector)
}))

ranking.sort((a,b) => b.score - a.score);

console.log(`Pergunta: ${question}`)

for(const r of ranking){
  console.log(r.score.toFixed(3), r.note)
}