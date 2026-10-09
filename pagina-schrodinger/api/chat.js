// Archivo: pagina-schrodinger/api/chat.js

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // Configuración de CORS
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

  // Nombres exactos compatibles con la API v1beta
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  let lastErrorDetail = "";

  for (const model of modelsToTry) {
    // 3 reintentos con pausa para absorber los pico de saturación (503)
    for (let attempt = 1; attempt <= 3; attempt++) {
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

        lastErrorDetail = `[${model}] HTTP ${response.status}: ${data.error?.message || 'Error desconocido'}`;

        // Si es saturación (503) o cuota temporal (429), pausar antes de reintentar
        if (response.status === 503 || response.status === 429) {
          console.warn(`[${model}] Servidor ocupado (${response.status}). Reintento ${attempt} de 3...`);
          if (attempt < 3) await wait(1200);
        } else {
          // Si es un error de formato u otro código, pasar al siguiente modelo de inmediato
          break;
        }

      } catch (err) {
        lastErrorDetail = `Excepción en ${model}: ${err.message}`;
        break;
      }
    }
  }

  // Si tras 6 intentos totales (3 por modelo) persiste el fallo
  return res.status(503).json({
    error: `No se pudo conectar con la API de Google. Detalle del último intento: ${lastErrorDetail}`
  });
}
