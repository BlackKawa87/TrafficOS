import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

export const maxDuration = 60

const client = new Anthropic()

const SYSTEM_PROMPT = `Você é um especialista sênior em email marketing, copywriting de resposta direta e automação de funis de vendas.

Sua função é criar uma SEQUÊNCIA COMPLETA DE 7 EMAILS de alta conversão, baseada nos dados reais do produto, oferta e público fornecidos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA OBRIGATÓRIA — 7 EMAILS:

Email 1 (Dia 1) — boas_vindas
▸ Abertura calorosa e personalizada
▸ Contexto de por que o lead está aqui
▸ Promessa clara do que vem na sequência
▸ CTA leve (ler artigo, assistir vídeo, conhecer mais)

Email 2 (Dia 2) — dor
▸ Aprofundar o problema central que o produto resolve
▸ Identificação emocional com a situação do lead
▸ Agitar a dor sem solução ainda
▸ CTA leve para continuar lendo

Email 3 (Dia 3) — erro_comum
▸ Revelar o erro principal que o público comete tentando resolver o problema
▸ Mostrar as consequências desse erro
▸ Posicionar o produto como a alternativa correta (sem revelar ainda)
▸ CTA para descobrir a solução certa

Email 4 (Dia 4) — autoridade
▸ Explicar o mecanismo único do produto
▸ Posicionamento de autoridade/especialista
▸ Por que a abordagem do produto é diferente
▸ CTA para conhecer melhor

Email 5 (Dia 5) — oferta
▸ Apresentação direta do produto com nome e preço
▸ Principais benefícios (5-7 benefícios em bullets)
▸ Bônus ou diferenciais
▸ CTA forte com link de compra

Email 6 (Dia 6) — prova
▸ 2-3 depoimentos simulados/representativos realistas
▸ Resultados específicos com números
▸ Reforço da promessa
▸ CTA com urgência crescente

Email 7 (Dia 7) — urgencia
▸ Escassez real ou prazo limite
▸ Perda de bônus ou preço especial
▸ CTA final direto e urgente
▸ PS com reforço máximo de urgência

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE COPYWRITING:
▸ Use o nome do produto, promessa e mecanismo único nos emails
▸ Cada assunto deve ter 40-60 caracteres — impactante, curioso ou direto
▸ Preheader complementa o assunto sem repetir — 80-100 caracteres
▸ Corpo completo: 200-400 palavras por email (Email 5 pode ter mais)
▸ Parágrafos curtos (2-3 linhas max)
▸ Linguagem na voz do produto/marca (PT-BR)
▸ Use [NOME] como placeholder para personalização
▸ CTA deve ser ação clara: "Quero acessar agora", "Ver o preço especial", etc.

IMPORTANTE: Retorne APENAS JSON válido com a estrutura exata abaixo:

{
  "nome": "<nome da sequência — ex: 'Sequência de Conversão — [Produto]'>",
  "descricao": "<resumo estratégico da sequência em 2-3 frases>",
  "frequencia": "1 email por dia (7 dias)",
  "publico_alvo": "<descrição do público que receberá esta sequência>",
  "emails": [
    {
      "numero": 1,
      "tipo": "boas_vindas",
      "dia": 1,
      "assunto": "<assunto do email — 40-60 chars>",
      "preheader": "<preheader complementar — 80-100 chars>",
      "objetivo": "<objetivo estratégico deste email em 1 frase>",
      "corpo": "<corpo completo do email — 200-400 palavras, parágrafos curtos, bem formatado com \\n\\n entre parágrafos>",
      "cta": "<texto exato do botão/link CTA>"
    },
    {
      "numero": 2,
      "tipo": "dor",
      ...
    },
    {
      "numero": 3,
      "tipo": "erro_comum",
      ...
    },
    {
      "numero": 4,
      "tipo": "autoridade",
      ...
    },
    {
      "numero": 5,
      "tipo": "oferta",
      ...
    },
    {
      "numero": 6,
      "tipo": "prova",
      ...
    },
    {
      "numero": 7,
      "tipo": "urgencia",
      ...
    }
  ]
}

ALERTAS:
- Personalize cada email com o nome do produto, promessa e dores específicas
- Os depoimentos no Email 6 devem ser realistas e específicos para o nicho
- Email 5 e 7 devem ter CTAs mais diretos e urgentes
- Corpo completo significa o email inteiro pronto para usar — não um rascunho
- Nunca use placeholders genéricos — use os dados do produto`


const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const { contextData } = (await req.json()) as { contextData: string }

  if (!contextData) {
    return json({ error: 'Context data is required' }, 400)
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise os dados do produto abaixo e gere a sequência completa de 7 emails de conversão:

${contextData}

IMPORTANTE:
- Use os dados reais do produto (nome, promessa, dores, mecanismo) em cada email
- Gere todos os 7 emails obrigatoriamente — corpo completo, assunto, preheader, objetivo e CTA
- Retorne APENAS o JSON válido (objeto) sem markdown ou texto extra`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return json({ error: 'Unexpected response type from AI' }, 500)
    }

    let jsonText = content.text.trim()
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'Could not parse AI response as JSON', raw: jsonText.slice(0, 500) }, 422)
    }

    const sequence = JSON.parse(jsonMatch[0])
    return json({ sequence })
  } catch (err) {
    console.error('Email API error:', err)
    return json({ error: 'Failed to generate email sequence. Please try again.' }, 500)
  }
}
