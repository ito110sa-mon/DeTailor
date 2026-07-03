import { GoogleGenerativeAI } from "@google/generative-ai";

export type DiaryStyle = "essay" | "novel" | "bullet" | "blog" | "viral";

const STYLE_LABELS: Record<DiaryStyle, string> = {
  essay: "エッセイ風",
  novel: "小説風",
  bullet: "箇条書き風",
  blog: "ブログ風",
  viral: "万バズ投稿風",
};

const STYLE_PROMPTS: Record<DiaryStyle, string> = {
  essay: `日常の気づきや感情を綴った、親しみやすく自然なエッセイ風の日記を仕立ててください。
- 語り口は温かみがあり、知的なトーン。一人称は「私」または「ぼく」。
- 出来事の奥にある感情や、ささやかな気づきを丁寧に表現してください。
- 誇張しすぎず、読んだ後に心がじんわり温まるような自然な文章にしてください。`,

  novel: `出来事をまるで美しい短編小説のワンシーンのように仕立ててください。
- 情景描写（天気、光、音、匂いなど）や五感を刺激する表現を取り入れてください。
- 登場人物の心理描写や、その瞬間の空気感をドラマチックかつ情緒的に表現してください。
- 読み手を引き込むような物語調の文体にしてください。`,

  bullet: `出来事をシンプルに整理した、見やすく知的な箇条書き風の日記を仕立ててください。
- 以下の構成を参考に、箇条書き（「・」）でわかりやすくまとめてください。
  - 【今日の出来事】: 事実を端的に
  - 【感じたこと・気づき】: 内面の変化や学び
  - 【明日に向けて】: ポジティブな一言や次のアクション
- 冗長な表現を避け、すっきりと整理されたレイアウトにしてください。`,

  blog: `他者に伝えることを意識した、構成の整った「ブログ風」の記事として仕立ててください。
- キャッチーな見出し（Markdownの「##」など）を2〜3個使用して、論理的に構成してください。
- 「導入（フックとなるエピソード）」「本編（体験したことや感じたことの詳細）」「まとめ・読者へのメッセージや問いかけ」という流れを意識してください。
- 親しみやすくも丁寧な（〜です、〜ます）敬体で書いてください。`,

  viral: `SNS（特にX）で多くの共感を呼び、拡散されるようなインパクトのある「万バズ投稿風」に仕立ててください。
- 思わず目を引くキャッチーな1行目（フック）から始めてください。
- 共感、ユーモア、あるいは深い洞察を含め、スマホでスクロール中に目が留まるテンポの良い改行を意識してください。
- 最後に、内容にマッチした絵文字やハッシュタグを2〜3個添えてください（文字数は140〜280文字程度に収めてください）。`,
};

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel(
      { model: "gemini-3.5-flash" },
      { apiVersion: "v1" }
    );

    const stylePrompt = STYLE_PROMPTS[activeStyle] || STYLE_PROMPTS["essay"];
    const styleLabel = STYLE_LABELS[activeStyle] || STYLE_LABELS["essay"];
    
    // プロンプトの組み立て
    let prompt = `あなたは熟練の文章仕立て屋「DeTailor」です。
ユーザーから提供された日記のタネ（タイトルやメモ）をもとに、以下の指示に従って、仕立ての良い「タイトル」と「日記本文」の両方を作成してください。

---
【仕立てるスタイル】: ${styleLabel}
【スタイルの詳細指示】:
${stylePrompt}
---
`;

    if (activeTitle.trim() && !activeContent.trim()) {
      prompt += `
【ユーザーが入力したタイトル】: 「${activeTitle}」
【特別な指示】:
ユーザーはタイトルのみを入力しました。このタイトルに相応しい洗練された「日記のタイトル」を仕立て、さらにそのタイトルから「何が起きたのか」「どのような感情だったのか」を自由に想像・推測して、日記の「本文」を丸ごと生成してください。
`;
    } else if (!activeTitle.trim() && activeContent.trim()) {
      prompt += `
【ユーザーが入力した本文メモ】: 
"""
${activeContent}
"""
【特別な指示】:
ユーザーは本文のメモのみを入力しました。この内容にふさわしい魅力的で洗練された「日記のタイトル」を新しく仕立ててください。さらに、メモをもとにして日記の「本文」を豊かに肉付け・生成してください。
`;
    } else {
      prompt += `
【ユーザーが入力したタイトル】: 「${activeTitle}」
【ユーザーが入力した本文メモ】: 
"""
${activeContent}
"""
【特別な指示】:
提供されたタイトルと本文メモを組み合わせて、より魅力的で洗練された「日記のタイトル」へ仕立て直し（元のタイトルをブラッシュアップする、もしくはそのままでも可）、さらに本文メモを詳細で完成度の高い「日記本文」へ肉付け・仕立て上げてください。
`;
    }

    if (instruction && instruction.trim()) {
      prompt += `
---
【ユーザーからの詳細な仕立てオーダー（追加指示）】:
"""
${instruction.trim()}
"""
【優先ルール】:
上記の「ユーザーからの詳細な仕立てオーダー」に記載された指示は、選択されたスタイルの基本ルールよりも優先して適用してください。例えば、感情表現の方向性、特定の言葉遣い、文字数の制限、特定のトーンや構成指定などがある場合、必ずそれに従って仕立ててください。
`;
    }

    prompt += `
---
【出力フォーマット】:
必ず以下のフォーマットで出力してください。これ以外の挨拶や前置き、解説などは一切含めないでください。

[TITLE]
ここに仕立てたタイトルを記述

[BODY]
ここに仕立てた日記本文を記述
---
【生成時の制約ルール】:
1. Markdownのタイトル用のハッシュマーク（「# 」や「## 」）は「[TITLE]」の下の行には使用しないでください。「[BODY]」の中の見出しとしては必要に応じて「##」などのMarkdownを使用しても構いません。
2. 自然で美しい日本語で出力してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error("AIからの応答が空でした。");
    }

    const trimmedText = text.trim();
    
    // 出力をパースする
    let parsedTitle = "";
    let parsedContent = "";

    const titleMatch = trimmedText.match(/\[TITLE\]\n([\s\S]*?)\n\[BODY\]/i);
    const bodyMatch = trimmedText.match(/\[BODY\]\n([\s\S]*)$/i);

    if (titleMatch && bodyMatch) {
      parsedTitle = titleMatch[1].trim();
      parsedContent = bodyMatch[1].trim();
    } else {
      const lines = trimmedText.split("\n");
      const bodyStartIndex = lines.findIndex(line => line.toUpperCase().includes("[BODY]"));
      
      if (bodyStartIndex !== -1) {
        parsedTitle = lines
          .slice(0, bodyStartIndex)
          .filter(l => !l.toUpperCase().includes("[TITLE]"))
          .join("\n")
          .trim();
        parsedContent = lines.slice(bodyStartIndex + 1).join("\n").trim();
      } else {
        parsedTitle = activeTitle.trim() || "無題の日記";
        parsedContent = trimmedText.replace(/\[TITLE\]/gi, "").trim();
      }
    }

    return res.status(200).json({
      title: parsedTitle || activeTitle.trim() || "無題の日記",
      content: parsedContent
    });

  } catch (error: any) {
    console.error("Gemini API Error in Server:", error);
    return res.status(500).json({ error: error.message || "日記の仕立て中にエラーが発生しました。" });
  }
}
