const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let genAI = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('🤖 Gemini AI initialized');
} else {
  console.log('⚠️ No GEMINI_API_KEY — using mock AI analysis');
}

const CIVIC_CATEGORIES = {
  pothole: { label: 'Pothole / Road Damage', dept: 'ROAD' },
  garbage_accumulation: { label: 'Garbage Accumulation', dept: 'WASTE' },
  overflowing_bin: { label: 'Overflowing Bin', dept: 'WASTE' },
  broken_streetlight: { label: 'Broken Streetlight', dept: 'ELECTRICAL' },
  damaged_traffic_sign: { label: 'Damaged Traffic Sign', dept: 'ELECTRICAL' },
  water_leakage: { label: 'Water Leakage', dept: 'WATER' },
  open_drainage: { label: 'Open Drainage / Sewage', dept: 'WATER' },
  damaged_footpath: { label: 'Damaged Footpath', dept: 'ROAD' },
  fallen_tree: { label: 'Fallen Tree / Branch', dept: 'PARKS' },
  road_obstruction: { label: 'Road Obstruction', dept: 'ROAD' },
};

async function analyzeImage(imageBuffer, mimeType = 'image/jpeg') {
  if (!genAI) return mockAnalysis();

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are an expert civic infrastructure analyst and verification officer. Analyze this image of a civic/urban issue.
First, perform an authenticity and verification check to determine if the submission is a genuine, real-world civic issue or if it is fake, stock, edited, or irrelevant.

Return a JSON object with these exact fields:
{
  "category": one of: ${Object.keys(CIVIC_CATEGORIES).join(', ')},
  "categoryLabel": human-readable label,
  "confidence": number between 0.0 and 1.0,
  "severity": one of: "critical", "high", "medium", "low",
  "severityScore": number 0-100,
  "description": 1-2 sentence description of what you see,
  "possibleRisk": potential public safety risk,
  "suggestedTitle": short title for the complaint,
  "isReal": true if this is a genuine, local, real-world civic issue in a public area; false if it is a stock photo from the web, a computer-generated image, an unrelated photo (like an indoor pet, food, meme, or document), or clearly edited/photoshopped,
  "validityReason": a concise explanation of your authenticity analysis (e.g. why you think it is genuine or suspicious),
  "imageDetails": {
    "detectedObjects": array of strings of main objects detected (e.g. ["pothole", "asphalt", "car"]),
    "isStockImage": true if the photo shows pristine stock qualities, standard online watermarks, or professional studio lighting; false otherwise,
    "isEdited": true if there are signs of image tampering, digital manipulation, overlays, or photoshop edits; false otherwise
  }
}

If the image does not show a civic issue, set "isReal" to false.
Return ONLY valid JSON, no markdown.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64')
        }
      }
    ]);

    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

    return {
      ...analysis,
      isMock: false,
      category: analysis.category || 'pothole',
      confidence: Math.min(1, Math.max(0, analysis.confidence || 0.7)),
      severity: analysis.severity || 'medium',
      severityScore: analysis.severityScore || 50,
      isReal: analysis.isReal !== undefined ? analysis.isReal : true,
      validityReason: analysis.validityReason || 'Verified real issue from photo evidence.',
      imageDetails: analysis.imageDetails || {
        detectedObjects: [],
        isStockImage: false,
        isEdited: false
      }
    };
  } catch (err) {
    console.error('Gemini analysis error:', err.message);
    return mockAnalysis();
  }
}

function mockAnalysis() {
  const cats = Object.keys(CIVIC_CATEGORIES);
  const cat = cats[Math.floor(Math.random() * cats.length)];
  const severities = ['critical', 'high', 'medium', 'low'];
  const severity = severities[Math.floor(Math.random() * 3)]; // weighted toward higher

  const isReal = Math.random() > 0.15; // 85% chance of being real in mock
  const validityReason = isReal 
    ? `Verified. High-fidelity visual evidence of ${CIVIC_CATEGORIES[cat].label.toLowerCase()} in a public environment.`
    : "Flagged. This photo appears to be a stock image retrieved from the internet rather than a local report.";

  return {
    category: cat,
    categoryLabel: CIVIC_CATEGORIES[cat].label,
    confidence: 0.75 + Math.random() * 0.2,
    severity,
    severityScore: severity === 'critical' ? 90 + Math.floor(Math.random() * 10) :
                   severity === 'high' ? 70 + Math.floor(Math.random() * 20) :
                   severity === 'medium' ? 40 + Math.floor(Math.random() * 30) :
                   20 + Math.floor(Math.random() * 20),
    description: `Detected ${CIVIC_CATEGORIES[cat].label.toLowerCase()} requiring attention.`,
    possibleRisk: 'Potential public safety concern identified.',
    suggestedTitle: `${CIVIC_CATEGORIES[cat].label} Report`,
    isMock: true,
    isReal,
    validityReason,
    imageDetails: {
      detectedObjects: [cat.replace(/_/g, ' '), 'road', 'outdoor'],
      isStockImage: !isReal,
      isEdited: false
    }
  };
}

module.exports = { analyzeImage, CIVIC_CATEGORIES };
