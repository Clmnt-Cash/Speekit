// APPROCHE 1 : Research by keywords + scoring
// ------------------------------
export function filterRelevantText(fullText, userQuestion, maxChars = 1500) {
  console.log("   🔍 Filtering relevant text...");
  console.log(`   📊 Input: ${fullText.length} chars, Question: "${userQuestion}"`);

  // Extract keywords from the question
  const keywords = extractKeywords(userQuestion);
  console.log(`   🔑 Extracted keywords: ${keywords.join(', ')}`);

  // Split the text into paragraphs/sections
  const sections = splitIntoSections(fullText);
  console.log(`   📄 Sections found: ${sections.length}`);

  // Score each section
  const scoredSections = sections.map(section => ({
    text: section,
    score: calculateRelevanceScore(section, keywords, userQuestion)
  }));
  // Log top scores
  console.log("   📊 Top 3 sections:");
  scoredSections.slice(0, 3).forEach((s, i) => {
    console.log(`      ${i + 1}. Score: ${s.score.toFixed(2)} - "${s.text.substring(0, 60)}..."`);
  });
  // Build the filtered text
  let filteredText = '';
  let currentLength = 0;
  
  for (const section of scoredSections) {
    // Ignore sections with low score
    if (section.score < 0.1) continue;

    // Check if we exceed the limit
    if (currentLength + section.text.length > maxChars) {
      // If we already have content, stop
      if (filteredText.length > 200) break;

      // Otherwise, truncate this section to reach maxChars
      const remaining = maxChars - currentLength;
      filteredText += section.text.substring(0, remaining) + '...';
      break;
    }
    
    filteredText += section.text + '\n\n';
    currentLength += section.text.length + 2;
  }
  
  // Fallback : if too short, take the beginning of the text
  if (filteredText.length < 200) {
    console.warn("   ⚠️ Not enough relevant content found, using beginning of text");
    filteredText = fullText.substring(0, maxChars);
  }

  console.log(`   ✅ Filtered text: ${filteredText.length} chars (reduction: ${((1 - filteredText.length / fullText.length) * 100).toFixed(1)}%)`);

  return filteredText.trim();
}
// Extract keywords from the question
// ------------------------------
function extractKeywords(question) {
  // Stop words to ignore
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
  
  // Clean and split the question into words
  const words = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Return unique words
  return [...new Set(words)];
}

function splitIntoSections(text) {
  let sections = text.split(/\n\n+/);
  
  if (sections.length < 5) {
    sections = text.match(/[^.!?]+[.!?]+(\s+[^.!?]+[.!?]+){0,2}/g) || [text];
  }
  
  return sections
    .map(s => s.trim())
    .filter(s => {
      if (s.length < 50) return false;
      
      // ✅ NEW : Ignoring certain patterns
      if (/^\^/.test(s)) return false;  // Starts with ^
      if (/Retrieved|Archived|Cite web|doi:|ISBN/i.test(s)) return false;

      // ✅ NEW : Ignoring necessary citations
      if (/\[citation needed\]/i.test(s)) return false;

      // ✅ NEW : Ignoring lines with many dates/URLs
      if (/\d{4}/.test(s) && /http|www\./i.test(s)) return false;
      
      // Ignore sections navigation
      const navKeywords = ['main menu', 'navigation', 'toggle', 'see also', 'references', 'external links', 'contents hide'];
      const lowerSection = s.toLowerCase();
      for (const keyword of navKeywords) {
        if (lowerSection.includes(keyword)) return false;
      }
      
      // Ignorer sections avec trop de chiffres
      const digitRatio = (s.match(/\d/g) || []).length / s.length;
      if (digitRatio > 0.2) return false;

      // ✅ NEW : Bonus for sections starting with article
      const startsWithArticle = /^(The|A|An|In|On|At|Of|For|With|By)\s+[a-z]/i.test(s);
      if (!startsWithArticle && s.length > 100) {
        // Verifying average word length to avoid lists
        const wordCount = s.split(/\s+/).length;
        const avgWordLength = s.length / wordCount;
        if (avgWordLength < 4) return false; // TOO short average word length
      }
      
      return true;
    });
}

// Calcul of relevance score for a section
// ------------------------------
function calculateRelevanceScore(section, keywords, fullQuestion) {
  const sectionLower = section.toLowerCase();
  const questionLower = fullQuestion.toLowerCase();
  let score = 0;
  
  // 1. Bonus if the full question appears
  if (sectionLower.includes(questionLower)) {
    score += 5.0;
  }

  // 2. Score based on keywords
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();

    // Count occurrences
    const occurrences = (sectionLower.match(new RegExp(keywordLower, 'g')) || []).length;
    
    if (occurrences > 0) {
      // Logarithmic scoring to avoid overvaluing repetitions
      score += Math.log(occurrences + 1) * 1.5;

      // Bonus if the keyword appears at the beginning of the section (often more relevant)
      if (sectionLower.indexOf(keywordLower) < 100) {
        score += 0.5;
      }
    }
  });
  // 3. Bonus for sections of optimal length (not too short, not too long)
  const optimalLength = 200;
  const lengthRatio = Math.min(section.length, optimalLength) / optimalLength;
  score *= lengthRatio;

  // 4. PPenalty for sections with many numbers (often metadata)
  const digitRatio = (section.match(/\d/g) || []).length / section.length;
  if (digitRatio > 0.1) {
    score *= 0.5;
  }
  
  return score;
}

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
// MAIN FUNCTION
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
  
  return buildFilteredText(scoredSections, maxChars);
}
// ------------------------------
// Build the filtered text
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