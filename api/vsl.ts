import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

const SYSTEM_PROMPT = `Você é um especialista em VSL (Video Sales Letter) de alta conversão, copywriting de resposta direta e direção criativa para vídeos de vendas.

Sua função é criar um ROTEIRO COMPLETO DE VSL com os 13 blocos obrigatórios, texto falado completo e direção de vídeo profissional.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS OBRIGATÓRIAS:
▸ Roteiro de cada bloco deve ser PRONTO PARA GRAVAR — natural, conversacional, sem jargão corporativo
▸ Use o nome real do produto, dores específicas do público e o mecanismo único nos textos
▸ texto_completo é o roteiro INTEIRO unificado, do hook ao CTA, com marcações [BLOCO]
▸ Cada bloco tem roteiro completo de 3 a 10 frases dependendo da duração
▸ Linguagem brasileira natural, como se estivesse conversando com um amigo

ESTRUTURA OBRIGATÓRIA — 13 BLOCOS:

Bloco 1 — hook_inicial (5–10s)
▸ Frase de abertura que para tudo — chocante, curiosa ou provocativa
▸ Pode ser pergunta direta, estatística impactante ou afirmação ousada
▸ Objetivo: fazer o lead parar e assistir os próximos 30 segundos

Bloco 2 — identificacao (15–20s)
▸ "Se você é [perfil] e [situação], este vídeo é para você"
▸ Criar senso de pertencimento e relevância imediata
▸ Nomear a pessoa exata que se beneficia

Bloco 3 — problema (20–30s)
▸ Descrever o problema com precisão cirúrgica
▸ Usar a linguagem exata que o público usa para descrever sua dor
▸ Mostrar que você entende profundamente o problema

Bloco 4 — agitacao (20–30s)
▸ Amplificar as consequências — o que acontece se não resolver
▸ Custo emocional, financeiro e de tempo do problema
▸ Criar urgência emocional real, não forçada

Bloco 5 — historia (30–60s)
▸ História de transformação — sua própria ou de um cliente real
▸ Antes, o ponto de virada e o depois
▸ Conectar a transformação diretamente ao produto

Bloco 6 — apresentacao_solucao (15–20s)
▸ Revelar o produto como a solução natural da história
▸ Tom de alívio e descoberta, não de venda
▸ Nome do produto + promessa principal em 1-2 frases

Bloco 7 — mecanismo (30–45s)
▸ Como o produto funciona — o mecanismo único
▸ Por que funciona quando outras soluções falharam
▸ Linguagem simples, visual e convincente

Bloco 8 — beneficios (30–45s)
▸ 3–5 maiores benefícios com formato: benefício → impacto na vida
▸ Foco no resultado e na transformação, não na feature técnica
▸ Linguagem emocional e concreta

Bloco 9 — prova (30–45s)
▸ Testemunhos, resultados específicos e cases reais
▸ Números concretos quando possível (ex: "Fulano faturou X em Y dias")
▸ Variedade de perfis para ampliar identificação

Bloco 10 — oferta (30–45s)
▸ O que está sendo vendido — produto + bônus + valor total
▸ Empilhamento de valor: "Você recebe X, Y, Z... mas paga apenas..."
▸ Preço e forma de pagamento claros

Bloco 11 — garantia (15–20s)
▸ Garantia clara que inverte o risco
▸ "Se em X dias você não [resultado], devolvo 100% do seu dinheiro"
▸ Reforçar que a decisão é sem risco

Bloco 12 — urgencia (15–20s)
▸ Razão real e específica para agir agora
▸ Escassez, prazo ou bônus temporário — mas verdadeiro
▸ Custo de não agir hoje

Bloco 13 — cta (15–20s)
▸ Um único próximo passo, claro e específico
▸ Repetir o benefício principal + o que acontece ao clicar
▸ Tom de convite, não de pressão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETORNE APENAS JSON válido com a estrutura exata:

{
  "nome": "<nome do VSL — ex: 'VSL Principal — [Produto]'>",
  "descricao": "<objetivo estratégico do VSL em 1-2 frases>",
  "estilo": "<autoridade | storytelling | direto>",
  "duracao_total": "<ex: '8 a 12 minutos'>",
  "publico_alvo": "<quem é o público ideal para este VSL>",
  "promessa_principal": "<a promessa central do VSL em 1 frase impactante>",
  "blocos": [
    {
      "numero": 1,
      "nome": "Hook Inicial",
      "tipo": "hook_inicial",
      "duracao": "5–10 segundos",
      "tempo_inicio": "0:00",
      "objetivo": "<objetivo deste bloco em 1 frase>",
      "roteiro": "<texto falado exato, pronto para gravar — 3 a 8 frases naturais>",
      "notas_direcao": "<instrução específica de direção para este bloco>"
    }
  ],
  "texto_completo": "<roteiro completo unificado com marcações [HOOK INICIAL], [IDENTIFICAÇÃO], etc.>",
  "direcao": {
    "tom_voz": "<ex: 'Calmo e autoritário, com urgência crescente no final'>",
    "estilo": "<autoridade | storytelling | direto>",
    "ritmo": "<ex: 'Lento e empático no início, acelera na prova e urgência'>",
    "cortes": "<ex: 'Corte a cada 3–5 segundos, zoom suave no ponto de dor'>",
    "expressao": "<ex: 'Olhar direto para câmera, gestos naturais, sem ler teleprompter'>",
    "cenario": "<ex: 'Fundo limpo ou escritório organizado, luz frontal suave'>"
  }
}`

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
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analise os dados do produto abaixo e gere o VSL completo de alta conversão:

${contextData}

IMPORTANTE:
- Use dados específicos do produto: nome real, preço, promessa, mecanismo, dores e público
- Cada bloco deve ter roteiro PRONTO PARA GRAVAR — natural, sem rodeios
- texto_completo deve ser o roteiro INTEIRO do início ao fim com marcações [BLOCO]
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

    const script = JSON.parse(jsonMatch[0])
    return res.status(200).json({ script })
  } catch (err) {
    console.error('VSL API error:', err)
    return res.status(500).json({ error: 'Failed to generate VSL. Please try again.' })
  }
}
