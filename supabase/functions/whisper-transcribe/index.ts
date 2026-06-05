import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

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
    const { audio, language } = await req.json()

    if (!audio) {
      return new Response(
        JSON.stringify({ error: 'Missing audio data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert base64 to blob
    const audioBlob = base64ToBlob(audio, 'audio/webm')
    
    // Create form data
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    
    // Optional: specify language
    if (language) {
      formData.append('language', language === 'zh' ? 'zh' : language)
    }

    // Call Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Whisper API error: ${error}`)
    }

    const result = await response.json()

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays = []
  
  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512)
    const byteNumbers = new Array(slice.length)
    
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j)
    }
    
    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }
  
  return new Blob(byteArrays, { type: mimeType })
}
