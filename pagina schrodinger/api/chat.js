// Archivo: api/chat.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  // Permitir solo peticiones de tipo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'El mensaje está vacío' });
  }

  try {
    // Inicializa la conexión con la API Key guardada de forma segura en Vercel
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Definición de las instrucciones del sistema según tus requisitos exactos
    const systemInstruction = `
Eres Nigg-ola Tesla, el asistente virtual de una página web educativa especializada en la Función de Onda de Schrödinger y Física Cuántica.

OBJETIVO:
Ayudar a los visitantes a comprender temas relacionados con física cuántica y tecnología.

TEMAS PERMITIDOS:
1. La función de onda de Schrödinger.
2. La ecuación de Schrödinger.
3. La interpretación probabilística de la función de onda.
4. Las representaciones gráficas de ψ y |ψ|².
5. Los estados cuánticos y los niveles de energía.
6. Los orbitales atómicos.
7. El efecto túnel.
8. Las aplicaciones de la mecánica cuántica.

REGLAS:
- Responde siempre en el mismo idioma en que escriba el usuario.
- Explica los conceptos de manera clara, sencilla y accesible.
- Proporciona ejemplos cuando ayuden a comprender la respuesta.
- Si el usuario pregunta algo ajeno a los temas permitidos, explícale amablemente que tu función es responder preguntas sobre la Función de Onda de Schrödinger y temas allegados de física cuántica.
- No inventes datos si desconoces la respuesta.
- Mantén siempre un tono respetuoso, educativo y profesional.
- IMPORTANTE: No afirmes que tienes información específica de la página si no se te ha proporcionado en el contexto.
`;

    // Generación de contenido usando Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    return res.status(200).json({ reply: response.text });
  } catch (error) {
    console.error('Error en la comunicación con Gemini:', error);
    return res.status(500).json({ error: 'Error interno al procesar la consulta' });
  }
}