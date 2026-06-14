import jsPDF from 'jspdf'

export function exportRecipeToPDF(recipe, ingredients) {
  const doc = new jsPDF()
  
  // Header
  doc.setFillColor(139, 90, 43) // Cognac color
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(recipe.name, 20, 25)
  
  if (recipe.original_name) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'italic')
    doc.text(recipe.original_name, 20, 35)
  }
  
  // Reset text color
  doc.setTextColor(42, 38, 34)
  
  let yPos = 55
  
  // Info section
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Kategorie:', 20, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(recipe.category || '-', 50, yPos)
  
  yPos += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Portionen:', 20, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(String(recipe.portions), 50, yPos)
  
  // Kalkulation (right side)
  const cost = ingredients.reduce((total, item) => {
    const price = item.ingredients?.current_price || 0
    return total + (item.amount * price)
  }, 0)
  const costPerPortion = recipe.portions > 0 ? cost / recipe.portions : 0
  const margin = recipe.selling_price > 0 
    ? ((recipe.selling_price - costPerPortion) / recipe.selling_price * 100).toFixed(1)
    : 0
  
  doc.setFont('helvetica', 'bold')
  doc.text('Kalkulation:', 120, 55)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gesamt: ${cost.toFixed(2)} EUR`, 120, 63)
  doc.text(`/Portion: ${costPerPortion.toFixed(2)} EUR`, 120, 71)
  if (recipe.selling_price > 0) {
    doc.text(`VK: ${recipe.selling_price.toFixed(2)} EUR | Marge: ${margin}%`, 120, 79)
  }
  
  yPos = 95
  
  // Description
  if (recipe.description) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Beschreibung', 20, yPos)
    
    yPos += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    const splitDesc = doc.splitTextToSize(recipe.description, 170)
    doc.text(splitDesc, 20, yPos)
    yPos += splitDesc.length * 6 + 10
  }
  
  // Ingredients table - manual drawing
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Zutaten', 20, yPos)
  yPos += 10
  
  // Table header
  doc.setFillColor(245, 241, 235)
  doc.rect(20, yPos - 5, 170, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Zutat', 22, yPos)
  doc.text('Menge', 120, yPos)
  doc.text('Kosten', 160, yPos)
  yPos += 8
  
  // Table rows
  doc.setFont('helvetica', 'normal')
  ingredients.forEach((item, idx) => {
    const name = item.ingredients?.name || ''
    const amount = `${item.amount} ${item.ingredients?.unit || ''}`
    const cost = `${(item.amount * (item.ingredients?.current_price || 0)).toFixed(2)} EUR`
    
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
    
    doc.text(name, 22, yPos)
    doc.text(amount, 120, yPos)
    doc.text(cost, 160, yPos)
    
    // Draw line
    doc.setDrawColor(200, 200, 200)
    doc.line(20, yPos + 2, 190, yPos + 2)
    
    yPos += 7
  })
  
  yPos += 10
  
  // Steps
  if (recipe.steps && recipe.steps.length > 0) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Zubereitung', 20, yPos)
    yPos += 12
    
    recipe.steps.forEach((step, idx) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      
      // Step number
      doc.setFillColor(139, 90, 43)
      doc.circle(25, yPos + 2, 4, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(String(idx + 1), 23, yPos + 4)
      
      // Step text
      doc.setTextColor(42, 38, 34)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      const splitStep = doc.splitTextToSize(step, 160)
      doc.text(splitStep, 35, yPos)
      
      yPos += Math.max(splitStep.length * 6, 12) + 5
    })
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(139, 90, 43)
    doc.text(`RecipeBase - Seite ${i} von ${pageCount}`, 20, 287)
    doc.text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 140, 287)
  }
  
  doc.save(`${recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_rezept.pdf`)
}
