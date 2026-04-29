import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista sênior em copywriting conversacional, vendas via WhatsApp e automação de mensagens para alta conversão.

Sua função é criar um FLUXO COMPLETO DE 7 MENSAGENS de conversão via WhatsApp/Telegram, com linguagem natural, curta e focada em gerar resposta e converter leads.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS OBRIGATÓRIAS DE MENSAGENS PARA WHATSAPP:
▸ CURTAS: 2-5 linhas por mensagem. Sem parágrafos longos.
▸ NATURAIS: Escreva como uma pessoa real, não como robô ou vendedor agressivo
▸ QUEBRA DE LINHA: Use \\n para separar ideias — uma por linha
▸ EMOJIS: 1-2 por mensagem, usados com propósito
▸ PERGUNTAS: Termine com pergunta quando quiser puxar resposta
▸ PERSONALIZAÇÃO: Use [NOME] onde o nome do lead seria inserido
▸ CTA CLARO: Cada mensagem deve ter um próximo passo óbvio

ESTRUTURA OBRIGATÓRIA — 7 MENSAGENS:

Mensagem 1 — inicial
▸ Apresentação direta e humana
▸ Menção ao motivo do contato (interesse no produto)
▸ Gatilho de curiosidade ou resposta
▸ Máximo 3 linhas

Mensagem 2 — follow_up
▸ Para enviar após 24h sem resposta
▸ Tom levemente mais direto
▸ Reforça a dor ou o problema que o produto resolve
▸ Pergunta simples para reengajar

Mensagem 3 — diagnostico
▸ Pergunta diagnóstica que revela a situação do lead
▸ Mostra interesse genuíno no problema dele
▸ Posiciona você como quem quer ajudar, não vender
▸ 1-2 perguntas no máximo

Mensagem 4 — valor
▸ Compartilhar um insight ou informação valiosa
▸ Mostrar autoridade de forma natural
▸ Conectar o valor ao produto sem empurrar venda
▸ Tom educativo e generoso

Mensagem 5 — oferta
▸ Apresentar o produto/solução de forma direta
▸ Benefício principal + preço ou CTA
▸ Link de compra ou próximo passo claro
▸ Tom de oportunidade, não de pressão

Mensagem 6 — quebra_objecao
▸ Antecipar e quebrar a objeção mais comum do nicho
▸ Pode ser sobre preço, resultado, tempo ou confiança
▸ Prova social rápida (resultado de 1 cliente)
▸ CTA de novo ao final

Mensagem 7 — final
▸ Urgência ou escassez real
▸ Tom de última oportunidade
▸ CTA direto e definitivo
▸ PS opcional com reforço

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETORNE APENAS JSON válido com a estrutura exata:

{
  "nome": "<nome do fluxo — ex: 'Fluxo WhatsApp — [Produto]'>",
  "descricao": "<objetivo estratégico do fluxo em 1-2 frases>",
  "canal": "whatsapp",
  "mensagens": [
    {
      "numero": 1,
      "tipo": "inicial",
      "titulo": "Mensagem Inicial",
      "objetivo": "<objetivo desta mensagem em 1 frase>",
      "texto": "<mensagem pronta para enviar — curta, natural, com \\n para quebras de linha>",
      "variacao": "<versão alternativa da mesma mensagem com tom ligeiramente diferente>",
      "gatilho_envio": "<quando enviar esta mensagem — ex: 'Imediatamente após o opt-in'>",
      "dica": "<dica prática de como usar ou personalizar esta mensagem>"
    }
  ]
}

EXEMPLO de formato correto de mensagem (texto curto, com quebras):
"Oi [NOME]! 👋\\n\\nVi que você se interessou em [benefício do produto].\\n\\nPosso te fazer uma pergunta rápida?"

ALERTAS:
- Use o nome real do produto, dores e público nos textos
- Cada mensagem deve ser diferente em tom e abordagem
- Mensagem 5 deve incluir nome do produto + benefício principal
- Mensagem 7 deve ter clareza total sobre o que o lead perde se não agir`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { contextData } = req.body as { contextData: string }

  if (!contextData) {
    return res.status(400).json({ error: 'Context data is required' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise os dados do produto abaixo e gere o fluxo completo de 7 mensagens de conversão para WhatsApp:

${contextData}

IMPORTANTE:
- Mensagens CURTAS (2-5 linhas max) — estilo WhatsApp real
- Use dados específicos do produto nos textos
- Retorne APENAS o JSON válido (objeto) sem markdown ou texto extra`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return res.status(500).json({ error: 'Unexpected response type from AI' })
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(422).json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) })
    }

    const flow = JSON.parse(jsonMatch[0])
    return res.status(200).json({ flow })
  } catch (err) {
    console.error('WhatsApp API error:', err)
    return res.status(500).json({ error: 'Failed to generate WhatsApp flow. Please try again.' })
  }
}
