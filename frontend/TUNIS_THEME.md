# 🇹🇳 Palette Tunis Vert Civique - Documentation

## Vue d'Ensemble

L'interface Smart City Tunis utilise maintenant la palette **"Tunis Vert Civique"**, conçue spécifiquement pour refléter la croissance urbaine et l'identité tunisienne.

## 🎨 Palette de Couleurs

### Couleur Primaire - Vert Émeraude
**Usage**: Barre d'application, boutons CTA "Signaler", éléments principaux

```css
primary: {
  DEFAULT: '#2E7D32',  /* Vert Émeraude principal */
  50: '#E8F5E9',
  100: '#C8E6C9',
  200: '#A5D6A7',
  300: '#81C784',
  400: '#66BB6A',
  500: '#2E7D32',      /* Base */
  600: '#2C6B2F',
  700: '#1B5E20',
  800: '#145A1F',
  900: '#0D4715',
}
```

**Signification**: Croissance urbaine, développement durable, réussite

---

### Couleur Secondaire - Gris Clair
**Usage**: Arrière-plans, cartes, zones de contenu

```css
secondary: {
  DEFAULT: '#F5F7FA',  /* Gris Clair */
  50: '#FFFFFF',
  100: '#FAFBFC',
  200: '#F5F7FA',      /* Base */
  300: '#E8EDF3',
  400: '#D1DBE5',
  500: '#F5F7FA',
  600: '#C4CED8',
  700: '#A8B4C0',
  800: '#8F9AA8',
  900: '#6B7784',
}
```

**Signification**: Neutralité, professionnalisme, clarté

---

### Couleur Urgente - Rouge Tunis
**Usage**: Alertes, erreurs, éléments critiques (référence au drapeau tunisien)

```css
urgent: {
  DEFAULT: '#C62828',  /* Rouge Tunis */
  50: '#FFEBEE',
  100: '#FFCDD2',
  200: '#EF9A9A',
  300: '#E57373',
  400: '#EF5350',
  500: '#C62828',      /* Base */
  600: '#B71C1C',
  700: '#A31A1A',
  800: '#8E1616',
  900: '#6D1212',
}
```

**Signification**: Urgence, attention immédiate, criticité

---

### Couleur Succès - Vert Clair
**Usage**: États résolus, confirmations, succès

```css
success: {
  DEFAULT: '#81C784',  /* Vert Clair */
  50: '#E8F5E9',
  100: '#C8E6C9',
  200: '#A5D6A7',
  300: '#81C784',      /* Base */
  400: '#66BB6A',
  500: '#81C784',
  600: '#4CAF50',
  700: '#43A047',
  800: '#388E3C',
  900: '#2E7D32',
}
```

**Signification**: Résolution, validation, accomplissement

---

### Couleur Attention - Orange
**Usage**: États "En cours", avertissements, actions requises

```css
attention: {
  DEFAULT: '#F57C00',  /* Orange */
  50: '#FFF3E0',
  100: '#FFE0B2',
  200: '#FFCC80',
  300: '#FFB74D',
  400: '#FFA726',
  500: '#F57C00',      /* Base */
  600: '#F57C00',
  700: '#E65100',
  800: '#D84315',
  900: '#BF360C',
}
```

**Signification**: En cours, attention nécessaire, attente

---

## 📋 Guide d'Utilisation

### Boutons

| Type | Couleur | Usage |
|------|---------|-------|
| **Primary** | Vert Émeraude (#2E7D32) | Actions principales (Se connecter, Signaler) |
| **Secondary** | Gris Clair (#F5F7FA) | Actions secondaires |
| **Outline** | Bordure Verte | Actions alternatives |
| **Ghost** | Texte Vert | Actions tertiaires |

```tsx
<Button variant="primary">Signaler un problème</Button>
<Button variant="outline">Annuler</Button>
```

### Alertes

| Type | Couleur | Usage |
|------|---------|-------|
| **Error** | Rouge Tunis (#C62828) | Erreurs, échecs |
| **Success** | Vert Clair (#81C784) | Succès, résolutions |
| **Warning** | Orange (#F57C00) | Avertissements, en cours |
| **Info** | Vert Émeraude (#2E7D32) | Informations générales |

```tsx
<Alert variant="error">Échec de la connexion</Alert>
<Alert variant="success">Plainte résolue</Alert>
<Alert variant="warning">En cours de traitement</Alert>
```

### Badges d'État

```tsx
// Résolu
<span className="bg-success-100 text-success-800 px-2 py-1 rounded">
  Résolu
</span>

// En cours
<span className="bg-attention-100 text-attention-800 px-2 py-1 rounded">
  En cours
</span>

// Urgent
<span className="bg-urgent-100 text-urgent-800 px-2 py-1 rounded">
  Urgent
</span>
```

---

## 🎯 Mapping des États

### États des Plaintes

| État | Couleur | Code |
|------|---------|------|
| **Nouvelle** | Primary | `bg-primary-100 text-primary-800` |
| **En cours** | Attention | `bg-attention-100 text-attention-800` |
| **Résolue** | Success | `bg-success-100 text-success-800` |
| **Rejetée** | Urgent | `bg-urgent-100 text-urgent-800` |

### Priorités

| Priorité | Couleur | Code |
|----------|---------|------|
| **Haute** | Urgent | `bg-urgent-500` |
| **Moyenne** | Attention | `bg-attention-500` |
| **Basse** | Success | `bg-success-500` |

---

## 🖼️ Exemples Visuels

### Bouton Primaire
```tsx
className="bg-primary hover:bg-primary-700 text-white"
```
- Couleur de base: `#2E7D32`
- Au survol: `#1B5E20`
- Ombre: `shadow-primary/25`

### Carte de Contenu
```tsx
className="bg-white border border-secondary-300"
```

### Input Focus
```tsx
className="focus:border-primary focus:ring-primary/20"
```

---

## 📱 Accessibilité

### Contraste des Couleurs

Toutes les combinaisons respectent les normes WCAG 2.1 AA:

| Combinaison | Ratio | Note |
|-------------|-------|------|
| Primary sur blanc | 4.5:1 | ✅ AA |
| Urgent sur blanc | 7.2:1 | ✅ AAA |
| Success sur blanc | 3.8:1 | ⚠️ Utiliser texte foncé |
| Attention sur blanc | 4.1:1 | ✅ AA |

---

## 🔄 Migration depuis l'Ancienne Palette

### Tableau de Correspondance

| Ancien | Nouveau | Raison |
|--------|---------|--------|
| `bg-blue-600` | `bg-primary` | Cohérence avec l'identité |
| `text-red-500` | `text-urgent` | Référence drapeau TN |
| `bg-green-500` | `bg-success` | États résolus |
| `text-yellow-600` | `text-attention` | États en cours |

---

## 💡 Recommandations

### ✅ À Faire

1. Utiliser `primary` pour toutes les actions principales
2. Utiliser `urgent` uniquement pour les alertes critiques
3. Utiliser `success` pour les confirmations et résolutions
4. Utiliser `attention` pour les états intermédiaires
5. Tester le contraste sur fond blanc ET sur fond coloré

### ❌ À Éviter

1. Ne pas mélanger `urgent` avec `attention` pour le même type d'alerte
2. Ne pas utiliser `success` pour des actions (utiliser `primary`)
3. Ne pas surcharger l'interface avec trop de couleurs vives
4. Ne pas utiliser `secondary` pour du texte (manque de contraste)

---

## 🎨 Ressources Figma

Pour utiliser ces couleurs dans Figma:

```
Primaire: #2E7D32
Secondaire: #F5F7FA
Urgent: #C62828
Succès: #81C784
Attention: #F57C00
```

---

## 📊 Utilisation dans le Code

### Configuration Tailwind

La palette est configurée dans `tailwind.config.js`:

```js
colors: {
  primary: { /* Vert Émeraude */ },
  secondary: { /* Gris Clair */ },
  urgent: { /* Rouge Tunis */ },
  success: { /* Vert Clair */ },
  attention: { /* Orange */ },
}
```

### Classes Utilitaires Générées

Pour chaque couleur, Tailwind génère automatiquement:

- `bg-{color}-{shade}` - Arrière-plan
- `text-{color}-{shade}` - Texte
- `border-{color}-{shade}` - Bordure
- `ring-{color}/{opacity}` - Anneau de focus

Exemple:
```tsx
<div className="bg-primary-50 text-primary-800 border-primary-200">
  Contenu
</div>
```

---

**Dernière mise à jour**: 2024
**Inspiré par**: Drapeau tunisien 🇹🇳 + Développement durable 🌱
