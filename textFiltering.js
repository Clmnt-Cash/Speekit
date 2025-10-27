// APPROCHE 1 : Recherche par mots-clés + scoring
// ------------------------------
export function filterRelevantText(fullText, userQuestion, maxChars = 1500) {
  console.log("   🔍 Filtrage du texte pertinent...");
  console.log(`   📊 Input: ${fullText.length} chars, Question: "${userQuestion}"`);
  
  // Extraire les mots-clés de la question
  const keywords = extractKeywords(userQuestion);
  console.log(`   🔑 Mots-clés extraits: ${keywords.join(', ')}`);
  
  // Découper le texte en paragraphes/sections
  const sections = splitIntoSections(fullText);
  console.log(`   📄 Sections trouvées: ${sections.length}`);
  
  // Scorer chaque section
  const scoredSections = sections.map(section => ({
    text: section,
    score: calculateRelevanceScore(section, keywords, userQuestion)
  }));
  // Log des meilleurs scores
  console.log("   📊 Top 3 sections:");
  scoredSections.slice(0, 3).forEach((s, i) => {
    console.log(`      ${i + 1}. Score: ${s.score.toFixed(2)} - "${s.text.substring(0, 60)}..."`);
  });
  // Construire le texte filtré en prenant les sections les plus pertinentes
  let filteredText = '';
  let currentLength = 0;
  
  for (const section of scoredSections) {
    // Ignorer les sections avec score trop faible
    if (section.score < 0.1) continue;
    
    // Vérifier qu'on ne dépasse pas la limite
    if (currentLength + section.text.length > maxChars) {
      // Si on a déjà du contenu, on s'arrête
      if (filteredText.length > 200) break;
      
      // Sinon, tronquer cette section pour atteindre maxChars
      const remaining = maxChars - currentLength;
      filteredText += section.text.substring(0, remaining) + '...';
      break;
    }
    
    filteredText += section.text + '\n\n';
    currentLength += section.text.length + 2;
  }
  
  // Fallback : si pas assez de contenu pertinent, prendre le début
  if (filteredText.length < 200) {
    console.warn("   ⚠️ Pas assez de contenu pertinent trouvé, utilisation du début du texte");
    filteredText = fullText.substring(0, maxChars);
  }
  
  console.log(`   ✅ Texte filtré: ${filteredText.length} chars (réduction: ${((1 - filteredText.length / fullText.length) * 100).toFixed(1)}%)`);
  
  return filteredText.trim();
}

// Extraction des mots-clés de la question
// ------------------------------
function extractKeywords(question) {
  // Mots vides à ignorer (stop words)
  const stopWords = new Set([
    'what', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'about', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'can', 'will', 'just', 'should', 'now', 'tell', 'me',
    'explain', 'describe', 'this', 'that', 'these', 'those', 'it', 'its'
  ]);
  
  // Nettoyer et tokeniser la question
  const words = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Supprimer ponctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Retourner les mots uniques
  return [...new Set(words)];
}

// Découper le texte en sections
// ------------------------------
function splitIntoSections(text) {
  // Découper par paragraphes (double saut de ligne)
  let sections = text.split(/\n\n+/);
  
  // Si pas assez de sections, découper par phrases longues
  if (sections.length < 5) {
    sections = text.match(/[^.!?]+[.!?]+(\s+[^.!?]+[.!?]+){0,2}/g) || [text];
  }
  
  // Nettoyer et filtrer les sections trop courtes
  return sections
    .map(s => s.trim())
    .filter(s => s.length > 50); // Ignorer sections < 50 chars
}

// Calculer le score de pertinence d'une section
// ------------------------------
function calculateRelevanceScore(section, keywords, fullQuestion) {
  const sectionLower = section.toLowerCase();
  const questionLower = fullQuestion.toLowerCase();
  let score = 0;
  
  // 1. Bonus si la question complète apparaît
  if (sectionLower.includes(questionLower)) {
    score += 5.0;
  }
  
  // 2. Score basé sur les mots-clés
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    
    // Compter les occurrences
    const occurrences = (sectionLower.match(new RegExp(keywordLower, 'g')) || []).length;
    
    if (occurrences > 0) {
      // Score logarithmique pour éviter de sur-valoriser les répétitions
      score += Math.log(occurrences + 1) * 1.5;
      
      // Bonus si le mot-clé apparaît au début de la section (souvent plus pertinent)
      if (sectionLower.indexOf(keywordLower) < 100) {
        score += 0.5;
      }
    }
  });
  // 3. Bonus pour les sections de longueur optimale (ni trop courtes, ni trop longues)
  const optimalLength = 200;
  const lengthRatio = Math.min(section.length, optimalLength) / optimalLength;
  score *= lengthRatio;
  
  // 4. Pénalité pour sections avec beaucoup de chiffres (souvent des métadonnées)
  const digitRatio = (section.match(/\d/g) || []).length / section.length;
  if (digitRatio > 0.1) {
    score *= 0.5;
  }
  
  return score;
}

// APPROCHE 2 : Recherche de proximité (sliding window)
// ------------------------------
// export function filterByProximity(fullText, userQuestion, windowSize = 1000) {
//   console.log("   🎯 Recherche par proximité...");
  
//   const keywords = extractKeywords(userQuestion);
//   if (keywords.length === 0) {
//     console.warn("   ⚠️ Aucun mot-clé, retour texte complet");
//     return fullText.substring(0, 1500);
//   }
  
//   const textLower = fullText.toLowerCase();
//   const bestWindows = [];
  
//   // Trouver toutes les positions des mots-clés
//   const keywordPositions = [];
//   keywords.forEach(keyword => {
//     let pos = 0;
//     while ((pos = textLower.indexOf(keyword.toLowerCase(), pos)) !== -1) {
//       keywordPositions.push({ keyword, position: pos });
//       pos += keyword.length;
//     }
//   });
  
//   if (keywordPositions.length === 0) {
//     console.warn("   ⚠️ Aucun mot-clé trouvé dans le texte");
//     return fullText.substring(0, 1500);
//   }
//   // Trier par position
//   keywordPositions.sort((a, b) => a.position - b.position);
  
//   console.log(`   📍 ${keywordPositions.length} occurrences de mots-clés trouvées`);
  
//   // Extraire les fenêtres autour des mots-clés
//   keywordPositions.forEach(kp => {
//     const start = Math.max(0, kp.position - windowSize / 2);
//     const end = Math.min(fullText.length, kp.position + windowSize / 2);
//     const window = fullText.substring(start, end);
    
//     // Calculer le score de cette fenêtre
//     const score = keywords.reduce((sum, kw) => {
//       const count = (window.toLowerCase().match(new RegExp(kw, 'gi')) || []).length;
//       return sum + count;
//     }, 0);
    
//     bestWindows.push({ window, score, position: kp.position });
//   });
//   // Trier par score et prendre la meilleure fenêtre
//   bestWindows.sort((a, b) => b.score - a.score);
  
//   if (bestWindows.length > 0) {
//     console.log(`   ✅ Meilleure fenêtre trouvée (score: ${bestWindows[0].score})`);
//     return bestWindows[0].window.trim();
//   }
  
//   return fullText.substring(0, 1500);
// }

// APPROCHE 3 : Extraction des phrases contenant les mots-clés
// ------------------------------
// export function extractRelevantSentences(fullText, userQuestion, maxSentences = 10) {
//   console.log("   📝 Extraction des phrases pertinentes...");
  
//   const keywords = extractKeywords(userQuestion);
//   const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
  
//   console.log(`   📄 ${sentences.length} phrases trouvées`);
  
//   // Scorer chaque phrase
//   const scoredSentences = sentences.map(sentence => ({
//     text: sentence.trim(),
//     score: keywords.reduce((sum, keyword) => {
//       const regex = new RegExp(keyword, 'gi');
//       const matches = (sentence.match(regex) || []).length;
//       return sum + matches;
//     }, 0)
//   }));
  
//   // Trier par score et prendre les meilleures
//   scoredSentences.sort((a, b) => b.score - a.score);
  
//   const relevantSentences = scoredSentences
//     .filter(s => s.score > 0)
//     .slice(0, maxSentences)
//     .map(s => s.text);
  
//   console.log(`   ✅ ${relevantSentences.length} phrases pertinentes extraites`);
  
//   if (relevantSentences.length === 0) {
//     console.warn("   ⚠️ Aucune phrase pertinente, utilisation du début");
//     return fullText.substring(0, 1500);
//   }
  
//   return relevantSentences.join(' ');
// }

// FONCTION PRINCIPALE : Choix automatique de la meilleure méthode
// ------------------------------
export function findRelevantContent(fullText, userQuestion, maxChars = 1500) {
  console.log("\n🎯 RECHERCHE DE CONTENU PERTINENT");
  console.log("─".repeat(60));
  console.log(`   Question: "${userQuestion}"`);
  console.log(`   Texte complet: ${fullText.length} chars`);
  console.log(`   Limite cible: ${maxChars} chars`);
  
  // Si le texte est déjà court, pas besoin de filtrer
  if (fullText.length <= maxChars) {
    console.log("   ℹ️ Texte déjà court, pas de filtrage nécessaire");
    return fullText;
  }
  
  // Utiliser la méthode de scoring
  try {
    const filtered = filterRelevantText(fullText, userQuestion, maxChars);
    
    // Vérifier que le résultat est de qualité
    if (filtered.length > 200 && filtered.length <= maxChars) {
      console.log("   ✅ Filtrage réussi");
      return filtered;
    }
    
    // Si le résultat est trop court, prendre le début du texte
    if (filtered.length < 200) {
      console.warn("   ⚠️ Résultat trop court, fallback");
      return fullText.substring(0, maxChars);
    }
    
    return filtered;
    
  } catch (err) {
    console.error("   ❌ Erreur filtrage:", err);
    console.warn("   ⚠️ Fallback: début du texte");
    return fullText.substring(0, maxChars);
  }
}