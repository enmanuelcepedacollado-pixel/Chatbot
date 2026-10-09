// Archivo: pagina-schrodinger/api/chat.js

// Función auxiliar para pausar la ejecución unos milisegundos
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const { message } = req.body || {};

  if (!message) {
    return res.status(400).json({ error: 'El mensaje está vacío.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("ERROR: No se encontró la variable GEMINI_API_KEY en Vercel.");
    return res.status(500).json({ 
      error: 'La API Key (GEMINI_API_KEY) no está configurada en las Variables de Entorno de Vercel.' 
    });
  }

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

  // Lista de modelos variando entre líneas Flash y Pro para máxima disponibilidad
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-2.5-flash'
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    // Intentaremos hasta 2 veces por cada modelo en caso de un 503 puntual
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [
              {
                parts: [{ text: message }]
              }
            ]
          }),
        });

        const data = await response.json();

        if (response.ok) {
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar una respuesta válida.";
          return res.status(200).json({ reply });
        }

        lastError = `[${model}] Error ${response.status}: ${data.error?.message || 'Error de servicio'}`;

        // Si es 503 o 429 (saturación o límite de peticiones), esperamos 800ms e intentamos de nuevo
        if (response.status === 503 || response.status === 429) {
          console.warn(`Modelo ${model} ocupado (${response.status}). Intento ${attempt} de 2...`);
          if (attempt < 2) await wait(800);
        } else {
          // Si es un error distinto (como 400 Bad Request), saltamos al siguiente modelo inmediatamente
          break;
        }

      } catch (err) {
        lastError = err.message;
        console.error(`Excepción conectando a ${model}:`, err);
        break;
      }
    }
  }

  // Si tras recorrer todos los modelos de respaldo sigue fallando
  return res.status(503).json({
    error: `Los servidores de Google se encuentran con alta demanda en este momento. Por favor, reintenta enviar tu mensaje en unos segundos.`
  });
}
