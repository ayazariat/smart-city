/**
 * AnimatedBackground Component
 * Crée un arrière-plan animé moderne avec des orbes flottants et un effet glassmorphism
 * Utilise la palette Tunis Vert Civique
 */
export const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient de base */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary-50 via-primary-50/30 to-secondary-100" />
      
      {/* Orbes flottants avec la palette Tunis */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float opacity-70" />
      <div 
        className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-success/10 rounded-full blur-3xl animate-float opacity-60" 
        style={{ animationDelay: '1s' }} 
      />
      <div 
        className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float opacity-50" 
        style={{ animationDelay: '2s' }} 
      />
      
      {/* Motif de grille subtil */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(46, 125, 50) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(46, 125, 50) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};
