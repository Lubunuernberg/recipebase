export default function RecipeDetail({ recipe, onBack, userRole }) {
  return (
    <div className="recipe-detail">
      <header className="page-header">
        <button className="btn-secondary" onClick={onBack}>← Zurück</button>
        <h1>{recipe?.name || 'Rezept'}</h1>
      </header>

      <div className="card">
        <p>Hier werden die Rezeptdetails angezeigt...</p>
      </div>
    </div>
  )
}
