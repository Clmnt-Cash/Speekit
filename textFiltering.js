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
// function splitIntoSections(text) {
//   // Découper par paragraphes (double saut de ligne)
//   let sections = text.split(/\n\n+/);
  
//   // Si pas assez de sections, découper par phrases longues
//   if (sections.length < 5) {
//     sections = text.match(/[^.!?]+[.!?]+(\s+[^.!?]+[.!?]+){0,2}/g) || [text];
//   }
  
//   // Nettoyer et filtrer les sections trop courtes
//   return sections
//     .map(s => s.trim())
//     .filter(s => s.length > 50); // Ignorer sections < 50 chars
// }
function splitIntoSections(text) {
  let sections = text.split(/\n\n+/);
  
  if (sections.length < 5) {
    sections = text.match(/[^.!?]+[.!?]+(\s+[^.!?]+[.!?]+){0,2}/g) || [text];
  }
  
  return sections
    .map(s => s.trim())
    .filter(s => {
      if (s.length < 50) return false;
      
      // ✅ NOUVEAU : Ignorer les références Wikipedia
      if (/^\^/.test(s)) return false;  // Commence par ^
      if (/Retrieved|Archived|Cite web|doi:|ISBN/i.test(s)) return false;
      
      // ✅ NOUVEAU : Ignorer les citations nécessaires
      if (/\[citation needed\]/i.test(s)) return false;
      
      // ✅ NOUVEAU : Ignorer les lignes avec beaucoup de dates/URLs
      if (/\d{4}/.test(s) && /http|www\./i.test(s)) return false;
      
      // Ignorer sections de navigation
      const navKeywords = ['main menu', 'navigation', 'toggle', 'see also', 'references', 'external links', 'contents hide'];
      const lowerSection = s.toLowerCase();
      for (const keyword of navKeywords) {
        if (lowerSection.includes(keyword)) return false;
      }
      
      // Ignorer sections avec trop de chiffres
      const digitRatio = (s.match(/\d/g) || []).length / s.length;
      if (digitRatio > 0.2) return false;
      
      // ✅ NOUVEAU : Bonus pour sections qui commencent par une phrase normale
      const startsWithArticle = /^(The|A|An|In|On|At|Of|For|With|By)\s+[a-z]/i.test(s);
      if (!startsWithArticle && s.length > 100) {
        // Vérifier que ce n'est pas juste une liste de mots
        const wordCount = s.split(/\s+/).length;
        const avgWordLength = s.length / wordCount;
        if (avgWordLength < 4) return false; // Mots trop courts = liste
      }
      
      return true;
    });
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

// FONCTION PRINCIPALE : Choix automatique de la meilleure méthode
// ------------------------------
// export function findRelevantContent(fullText, userQuestion, maxChars = 1500) {
//   console.log("\n🎯 RECHERCHE DE CONTENU PERTINENT");
//   console.log("─".repeat(60));
//   console.log(`   Question: "${userQuestion}"`);
//   console.log(`   Texte complet: ${fullText.length} chars`);
//   console.log(`   Limite cible: ${maxChars} chars`);
  
//   // Si le texte est déjà court, pas besoin de filtrer
//   if (fullText.length <= maxChars) {
//     console.log("   ℹ️ Texte déjà court, pas de filtrage nécessaire");
//     return fullText;
//   }
  
//   // Utiliser la méthode de scoring
//   try {
//     const filtered = filterRelevantText(fullText, userQuestion, maxChars);
    
//     // Vérifier que le résultat est de qualité
//     if (filtered.length > 200 && filtered.length <= maxChars) {
//       console.log("   ✅ Filtrage réussi");
//       return filtered;
//     }
    
//     // Si le résultat est trop court, prendre le début du texte
//     if (filtered.length < 200) {
//       console.warn("   ⚠️ Résultat trop court, fallback");
//       return fullText.substring(0, maxChars);
//     }
    
//     return filtered;
    
//   } catch (err) {
//     console.error("   ❌ Erreur filtrage:", err);
//     console.warn("   ⚠️ Fallback: début du texte");
//     return fullText.substring(0, maxChars);
//   }
// }

// ------------------------------
// MÉTHODE : TF-IDF
// ------------------------------
function scoreByTFIDF(section, keywords, allSections) {
  const words = section.toLowerCase().match(/\b\w+\b/g) || [];
  const totalWords = words.length;
  const totalDocs = allSections.length;
  
  let score = 0;
  
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    
    // TF : fréquence du terme dans cette section
    const termFrequency = words.filter(w => w === keywordLower).length / totalWords;
    
    // IDF : combien de sections contiennent ce terme
    const docsWithTerm = allSections.filter(s => 
      s.toLowerCase().includes(keywordLower)
    ).length;
    
    // IDF = log(total docs / docs contenant le terme)
    const inverseDocFrequency = Math.log(totalDocs / (docsWithTerm + 1));
    
    // TF-IDF
    const tfidf = termFrequency * inverseDocFrequency;
    
    score += tfidf * 100; // Multiplier par 100 pour avoir des scores comparables
  });
  
  return score;
}
// ------------------------------
// FONCTION PRINCIPALE : Tester les 3 méthodes
// ------------------------------
export function findRelevantContentComparison(fullText, userQuestion, maxChars = 1500) {
  console.log("\n🔬 COMPARAISON DES 3 MÉTHODES");
  console.log("=".repeat(60));
  
  const keywords = extractKeywords(userQuestion);
  const sections = splitIntoSections(fullText);
  
  console.log(`📊 Configuration:`);
  console.log(`   Mots-clés: ${keywords.join(', ')}`);
  console.log(`   Sections: ${sections.length}`);
  
  // Scorer avec les 3 méthodes
  const results = {
    keywords: [],
    tfidf: [],
    cosine: []
  };
  
  sections.forEach((section, index) => {
    const keywordsScore = scoreByKeywords(section, keywords, userQuestion);
    const tfidfScore = scoreByTFIDF(section, keywords, sections);
    const cosineScore = scoreByCosineSimilarity(section, keywords, userQuestion);
    
    results.keywords.push({ index, section, score: keywordsScore });
    results.tfidf.push({ index, section, score: tfidfScore });
    results.cosine.push({ index, section, score: cosineScore });
  });
  
  // Trier chaque méthode
  results.keywords.sort((a, b) => b.score - a.score);
  results.tfidf.sort((a, b) => b.score - a.score);
  results.cosine.sort((a, b) => b.score - a.score);
  
  // Afficher les top 3 de chaque méthode
  console.log("\n📊 TOP 3 - MOTS-CLÉS:");
  results.keywords.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. Score: ${r.score.toFixed(2)} - "${r.section.substring(0, 60)}..."`);
  });
  
  console.log("\n📊 TOP 3 - TF-IDF:");
  results.tfidf.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. Score: ${r.score.toFixed(2)} - "${r.section.substring(0, 60)}..."`);
  });
  
  console.log("\n📊 TOP 3 - COSINE SIMILARITY:");
  results.cosine.slice(0, 3).forEach((r, i) => {
    console.log(`   ${i + 1}. Score: ${r.score.toFixed(2)} - "${r.section.substring(0, 60)}..."`);
  });
  
  // Comparer les résultats
  console.log("\n🔍 ANALYSE:");
  console.log(`   Accord Mots-Clés vs TF-IDF: ${compareTop3(results.keywords, results.tfidf)}%`);
  console.log(`   Accord Mots-Clés vs Cosine: ${compareTop3(results.keywords, results.cosine)}%`);
  console.log(`   Accord TF-IDF vs Cosine: ${compareTop3(results.tfidf, results.cosine)}%`);
  
  // Utiliser la méthode des mots-clés par défaut
  return buildFilteredText(results.keywords, maxChars);
}
// ------------------------------
// FONCTION PRINCIPALE : Choisir une méthode
// ------------------------------
export function findRelevantContent(fullText, userQuestion, maxChars = 1500) {
  console.log(`\n🎯 FILTRAGE (méthode: tf-idf)`);
  console.log("─".repeat(60));
  
  if (fullText.length <= maxChars) {
    return fullText;
  }
  
  // const cleanedText = preCleanText(fullText);
  const keywords = extractKeywords(userQuestion);
  const sections = splitIntoSections(fullText);
  
  let scoredSections = [];
  scoredSections = sections.map(section => ({
        section,
        score: scoreByTFIDF(section, keywords, sections)
      }));
  
  scoredSections.sort((a, b) => b.score - a.score);
  
  console.log("   📊 Top 3:");
  scoredSections.slice(0, 3).forEach((s, i) => {
    console.log(`      ${i + 1}. Score: ${s.score.toFixed(2)} - "${s.section.substring(0, 60)}..."`);
  });
  
  return buildFilteredText(scoredSections, maxChars);
}
// ------------------------------
// Construire le texte filtré
// ------------------------------
function buildFilteredText(scoredSections, maxChars) {
  let result = '';
  let currentLength = 0;
  
  for (const item of scoredSections) {
    if (item.score < 0.1) continue;
    
    if (currentLength + item.section.length > maxChars) {
      if (result.length > 200) break;
      
      const remaining = maxChars - currentLength;
      result += item.section.substring(0, remaining) + '...';
      break;
    }
    
    result += item.section + '\n\n';
    currentLength += item.section.length + 2;
  }
  
  return result.trim();
}
// ------------------------------
// Comparer le top 3 de deux méthodes
// ------------------------------
function compareTop3(results1, results2) {
  const top3_1 = new Set(results1.slice(0, 3).map(r => r.index));
  const top3_2 = new Set(results2.slice(0, 3).map(r => r.index));
  
  let commonCount = 0;
  top3_1.forEach(index => {
    if (top3_2.has(index)) commonCount++;
  });
  
  return Math.round((commonCount / 3) * 100);
}