import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY')

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, language } = await req.json()

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Missing text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Claude API to structure the recipe
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Extrahiere Rezept-Informationen aus diesem ${language} Text. Antworte NUR mit einem JSON-Objekt:

{
  "name": "Deutscher Name des Gerichts",
  "original_name": "Originalname falls asiatisch",
  "category": "Vorspeise|Hauptgericht|Nachspeise|Beilage",
  "portions": 4,
  "description": "Kurze Beschreibung",
  "ingredients": [
    {
      "name": "Zutat auf Deutsch",
      "original_name": "Originalname falls vorhanden",
      "amount": 500,
      "unit": "g"
    }
  ],
  "steps": ["Schritt 1", "Schritt 2"]
}

WICHTIG:
- Erkenne asiatische Zutaten (bánh phở, nước mắm, 寿司米, etc.)
- Bewahre Originalnamen bei
- Mengen immer als Zahl, Einheit separat
- Keine Markdown-Formatierung, reines JSON

Text: ${text}`
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${error}`)
    }

    const result = await response.json()
    const content = result.content?.[0]?.text || ''

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const recipeData = JSON.parse(jsonMatch[0])

    // Validate and set defaults
    const validatedRecipe = {
      name: recipeData.name || 'Unbenanntes Rezept',
      original_name: recipeData.original_name || null,
      category: ['Vorspeise', 'Hauptgericht', 'Nachspeise', 'Beilage'].includes(recipeData.category) 
        ? recipeData.category 
        : 'Hauptgericht',
      portions: parseInt(recipeData.portions) || 4,
      description: recipeData.description || '',
      ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients.map(ing => ({
        name: ing.name || 'Unbekannte Zutat',
        original_name: ing.original_name || null,
        amount: parseFloat(ing.amount) || 0,
        unit: ing.unit || 'g'
      })) : [],
      steps: Array.isArray(recipeData.steps) ? recipeData.steps : []
    }

    return new Response(
      JSON.stringify(validatedRecipe),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        name: 'Fehler beim Parsen',
        original_name: null,
        category: 'Hauptgericht',
        portions: 4,
        description: '',
        ingredients: [],
        steps: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
