import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, content, mimeType } = req.body as {
    type: 'pdf' | 'image' | 'text';
    content: string;
    mimeType?: string;
  };

  if (!content) {
    return res.status(400).json({ error: 'Missing content' });
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
    let messageContent: Anthropic.MessageParam['content'];

    if (type === 'image' && mimeType) {
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: content,
          },
        },
        { type: 'text', text: 'Extraia as informações de transferência de futebol desta imagem.' },
      ];
    } else if (type === 'pdf') {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: content,
          },
        } as Anthropic.DocumentBlockParam,
        { type: 'text', text: 'Extraia as informações de transferência de futebol deste documento.' },
      ];
    } else {
      messageContent = content;
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageContent }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response', raw: text });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Import API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
