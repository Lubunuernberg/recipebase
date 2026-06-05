import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analysiere diese Rechnung und extrahiere folgende Informationen im JSON-Format:
                {
                  "supplier": "Lieferantenname",
                  "date": "YYYY-MM-DD",
                  "total": 0.00,
                  "items": [
                    {
                      "name": "Produktname",
                      "quantity": 0.00,
                      "unit": "kg/L/Stk/etc",
                      "price": 0.00,
                      "matched": true/false (ob bekannte Zutat)
                    }
                  ]
                }
                
                Extrahiere alle Produkte mit genauen Mengen und Preisen. Erkenne asiatische Zutaten und deren Originalnamen.`
              },
              {
                type: 'image',
                source: {
                  type: 'url',
                  url: imageUrl
                }
              }
            ]
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }

    const result = await response.json()
    
    // Extract JSON from Claude's response
    const content = result.content?.[0]?.text || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const invoiceData = JSON.parse(jsonMatch[0])

    return new Response(
      JSON.stringify(invoiceData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        supplier: 'Unbekannt',
        date: new Date().toISOString().split('T')[0],
        total: 0,
        items: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
