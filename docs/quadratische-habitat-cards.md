# Quadratische Habitat-Cards

## Übersicht

Die Habitat-Cards wurden von einem 16:9-Format auf ein quadratisches Format (1:1) umgestellt, um eine einheitlichere Darstellung aller Bilder zu gewährleisten, unabhängig davon, ob sie im Portrait- oder Landscape-Format aufgenommen wurden.

## Problem

Vorher wurden die Habitat-Cards im 16:9-Format angezeigt, was zu folgenden Problemen führte:
- **Inkonsistente Darstellung**: Portrait- und Landscape-Bilder wurden unterschiedlich dargestellt
- **Unausgewogene Layouts**: Einige Cards wirkten gestreckt oder gequetscht
- **Schlechte Bildnutzung**: Bei Portrait-Bildern wurde viel Platz verschwendet

## Lösung

### 1. Grid-Layout Anpassung

#### LandingPage (`src/components/landing/LandingPage.tsx`)
```typescript
// Vorher
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="aspect-w-16 aspect-h-9 w-full">

// Nachher  
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  <div className="aspect-square w-full">
```

#### Unsere-Habitate Seite (`src/app/unsere-habitate/page.tsx`)
```typescript
// Vorher
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <div className="aspect-[16/9] w-full">

// Nachher
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div className="aspect-square w-full">
```

### 2. HabitatCard Komponente Optimierung

#### Bild-Rendering (`src/components/landing/HabitatCard.tsx`)
```typescript
// Vorher
<Image 
  src={imageSrc} 
  alt={title}
  width={340}
  height={240}
  className="habitat-image"
  priority={false}
/>

// Nachher
<Image 
  src={imageSrc} 
  alt={title}
  fill
  className="habitat-image object-cover"
  priority={false}
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
/>
```

## Vorteile

### 1. Einheitliche Darstellung
- **Konsistente Größe**: Alle Cards haben die gleiche quadratische Form
- **Bessere Proportionen**: Keine gestreckten oder gequetschten Darstellungen
- **Professionelles Aussehen**: Sauberes, geordnetes Grid-Layout

### 2. Optimale Bildnutzung
- **Object-cover**: Bilder werden optimal beschnitten und gefüllt
- **Keine Verzerrung**: Bilder behalten ihre Proportionen bei
- **Bessere Fokus**: Wichtige Bildinhalte werden hervorgehoben

### 3. Responsive Design
- **Mobile**: 1 Spalte (100% Breite)
- **Tablet**: 2 Spalten (50% Breite)
- **Desktop**: 3-4 Spalten (33-25% Breite)
- **Optimierte Sizes**: Next.js Image-Komponente lädt optimale Bildgrößen

## Technische Details

### CSS-Klassen
- **`aspect-square`**: Erzwingt 1:1 Seitenverhältnis
- **`object-cover`**: Füllt Container optimal ohne Verzerrung
- **`habitat-image`**: Anwendet EXIF-Orientierungskorrektur

### Performance-Optimierung
- **`sizes` Attribut**: Optimiert Bildgrößen für verschiedene Viewports
- **`fill` Prop**: Nutzt Container-Größe für optimale Darstellung
- **Lazy Loading**: Bilder werden bei Bedarf geladen

### Grid-System
```css
/* Mobile First Approach */
grid-cols-1          /* 1 Spalte auf Mobile */
md:grid-cols-2       /* 2 Spalten auf Tablet */
lg:grid-cols-3       /* 3 Spalten auf Desktop */
xl:grid-cols-4       /* 4 Spalten auf großen Bildschirmen */
```

## Betroffene Seiten

### 1. Landing Page (`/`)
- **Komponente**: `src/components/landing/LandingPage.tsx`
- **Sektion**: "Zuletzt verifizierte Habitate"
- **Layout**: 4-spaltiges Grid auf großen Bildschirmen

### 2. Unsere Habitate (`/unsere-habitate`)
- **Komponente**: `src/app/unsere-habitate/page.tsx`
- **Layout**: Responsive Grid mit Paginierung
- **Filterung**: Behält alle Filterfunktionen bei

### 3. HabitatCard Komponente
- **Datei**: `src/components/landing/HabitatCard.tsx`
- **Verwendung**: Wird von beiden Seiten verwendet
- **Optimierung**: Quadratisches Layout mit optimaler Bilddarstellung

## Wartung

### Zukünftige Anpassungen
1. **Bildqualität**: Bei Bedarf können die `sizes`-Attribute angepasst werden
2. **Grid-Layout**: Spaltenanzahl kann je nach Design-Anforderungen geändert werden
3. **Aspect Ratio**: Bei Bedarf kann das Seitenverhältnis angepasst werden

### Monitoring
- **Performance**: Überwachung der Bildladezeiten
- **User Experience**: Feedback zur Darstellungsqualität
- **Responsive Design**: Testen auf verschiedenen Bildschirmgrößen

## Fazit

Die Umstellung auf quadratische Cards verbessert die Benutzererfahrung erheblich durch:
- **Konsistente Darstellung** aller Habitat-Bilder
- **Bessere Bildnutzung** ohne Verzerrungen
- **Professionelleres Layout** mit einheitlichen Proportionen
- **Optimierte Performance** durch responsive Bildgrößen 