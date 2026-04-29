import OpenAI from 'openai'

export const config = { runtime: 'edge' };

const client = new OpenAI();


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const { type, content, mimeType } = (await req.json()) as {
    type: 'pdf' | 'image' | 'text';
    content: string;
    mimeType?: string;
  };

  if (!content) {
    return json({ error: 'Missing content' }, 400);
  }

  const systemPrompt = `Você é um assistente especializado em transferências de futebol. Analise o conteúdo fornecido e extraia informações estruturadas sobre pedidos de clubes e/ou jogadores.

Retorne APENAS um JSON válido no seguinte formato:
{
  "detected_type": "requests" | "players" | "both",
  "confidence": "high" | "medium" | "low",
  "requests": [
    {
      "club_name": "string",
      "club_country": "string",
      "club_league": "string",
      "position_main": "string (use: Goleiro, Zagueiro, Lateral Direito, Lateral Esquerdo, Volante, Meio-campo, Meia Atacante, Ponta Direita, Ponta Esquerda, Centroavante, Segundo Atacante)",
      "position_secondary": "string",
      "preferred_foot": "direito" | "esquerdo" | "ambidestro" | "indiferente",
      "age_min": number | null,
      "age_max": number | null,
      "height_min": number | null,
      "transfer_budget": number | null,
      "transfer_budget_currency": "EUR" | "USD" | "GBP" | "BRL",
      "deal_type": "compra" | "emprestimo" | "free_agent" | "emprestimo_com_opcao" | "emprestimo_com_obrigacao",
      "player_style": "string",
      "notes": "string",
      "priority": "baixa" | "media" | "alta"
    }
  ],
  "players": [
    {
      "full_name": "string",
      "short_name": "string",
      "age": number | null,
      "nationality": "string",
      "preferred_foot": "direito" | "esquerdo" | "ambidestro" | "indiferente",
      "height": number | null,
      "primary_position": "string",
      "current_club": "string",
      "current_league": "string",
      "market_value": number | null,
      "market_value_currency": "EUR",
      "contract_until": "string (YYYY-MM-DD ou vazio)",
      "partner_name": "string",
      "notes": "string"
    }
  ]
}

Regras:
- Se não houver dados para requests ou players, retorne array vazio
- Valores monetários sempre em número (ex: 5000000 para 5M)
- Se a informação não estiver clara, use null ou string vazia
- detected_type: "requests" se só há pedidos, "players" se só há jogadores, "both" se há ambos`;

  try {
    type OAIContent = string | { type: 'text'; text: string }[] | { type: 'image_url'; image_url: { url: string } }[]
    let userContent: OAIContent

    if (type === 'image' && mimeType) {
      userContent = [
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${content}` } } as never,
        { type: 'text', text: 'Extraia as informações desta imagem.' },
      ]
    } else {
      // text or pdf — for PDF, treat as base64-encoded text extracted client-side
      userContent = type === 'pdf'
        ? `[PDF content — base64 encoded]\n${content.slice(0, 8000)}`
        : content
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user', content: userContent as string },
      ],
    });

    const text = response.choices[0].message.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response', raw: text }, 422);
    }

    const result = JSON.parse(jsonMatch[0]);
    return json(result);
  } catch (err) {
    console.error('Import API error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
