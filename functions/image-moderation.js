const unsafeCategories = new Set(["nudity", "sexual_content", "pornography", "graphic_violence"]);

const mediaType = (bytes) => {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return "";
};

function base64(bytes) {
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.slice(start, start + 8192));
  return btoa(binary);
}

function parseAssessment(response) {
  const raw = String(response?.response || response?.result || response || "").replace(/```json|```/gi, "");
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    const categories = Array.isArray(parsed.categories) ? parsed.categories.filter(item => typeof item === "string").slice(0, 4) : [];
    return {
      decision: ["allow", "block", "review"].includes(parsed.decision) ? parsed.decision : "review",
      categories,
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 240) : ""
    };
  } catch {
    return null;
  }
}

export async function assessUploadedImage(ai, buffer, declaredType) {
  const bytes = new Uint8Array(buffer);
  const detectedType = mediaType(bytes);
  if (!detectedType || detectedType !== declaredType) return { status: "rejected", reason: "O ficheiro não corresponde a uma imagem JPG, PNG ou WebP válida." };
  if (!ai) return { status: "review", reason: "A verificação automática de imagem está temporariamente indisponível." };

  try {
    const response = await ai.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      messages: [{ role: "user", content: "Classifica a imagem submetida para uma agenda pública de música. Responde APENAS com JSON: {\"decision\":\"allow|block|review\",\"categories\":[\"nudity|sexual_content|pornography|graphic_violence|hate_or_extremism|not_a_poster|unknown\"],\"confidence\":\"high|medium|low\",\"reason\":\"texto curto em português\"}. Usa block apenas para nudez, conteúdo sexual/pornográfico, violência gráfica ou ódio/extremismo claramente visível. Usa review se houver dúvida. Uma fotografia normal de concerto, ou um cartaz musical, é allow." }],
      image: `data:${detectedType};base64,${base64(bytes)}`,
      max_tokens: 120
    });
    const assessment = parseAssessment(response);
    if (!assessment) return { status: "review", reason: "Não foi possível interpretar a verificação automática da imagem." };
    const hasUnsafeContent = assessment.categories.some(category => unsafeCategories.has(category));
    if (assessment.decision === "block" && hasUnsafeContent && assessment.confidence === "high") {
      return { status: "rejected", reason: assessment.reason || "Imagem rejeitada automaticamente por conteúdo impróprio." };
    }
    if (assessment.decision === "allow" && !hasUnsafeContent) return { status: "approved", reason: assessment.reason || "Imagem aprovada pela verificação automática." };
    return { status: "review", reason: assessment.reason || "Imagem retida para revisão humana." };
  } catch {
    return { status: "review", reason: "Não foi possível concluir a verificação automática da imagem." };
  }
}
