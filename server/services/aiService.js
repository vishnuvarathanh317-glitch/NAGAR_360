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

    const prompt = `You are an expert civic infrastructure analyst. Analyze this image of a civic/urban issue.

Return a JSON object with these exact fields:
{
  "category": one of: ${Object.keys(CIVIC_CATEGORIES).join(', ')},
  "categoryLabel": human-readable label,
  "confidence": number between 0.0 and 1.0,
  "severity": one of: "critical", "high", "medium", "low",
  "severityScore": number 0-100,
  "description": 1-2 sentence description of what you see,
  "possibleRisk": potential public safety risk,
  "suggestedTitle": short title for the complaint
}

If the image does not show a civic issue, use category "road_obstruction" with low confidence.
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
      severityScore: analysis.severityScore || 50
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
    isMock: true
  };
}

module.exports = { analyzeImage, CIVIC_CATEGORIES };
