import { generateTailoredDiaryCore, type DiaryStyle } from "../src/services/gemini";

export default async function handler(req: any, res: any) {
  // CORSヘッダーの設定 (ローカル開発環境等の異なるポートからのアクセスを許可)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { title, content, style, instruction } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "サーバー側で Gemini APIキーが設定されていません。" });
  }

  const activeTitle = title || "";
  const activeContent = content || "";
  const activeStyle = style as DiaryStyle;

  if (!activeTitle.trim() && !activeContent.trim()) {
    return res.status(400).json({ error: "タイトルと本文が両方とも未入力です。" });
  }

  try {
    // 共通化されたコアロジックを呼び出す
    const result = await generateTailoredDiaryCore({
      title: activeTitle,
      content: activeContent,
      style: activeStyle,
      apiKey,
      instruction,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Gemini API Error in Server:", error);
    return res.status(500).json({ error: error.message || "日記の仕立て中にエラーが発生しました。" });
  }
}
