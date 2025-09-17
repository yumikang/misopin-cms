import { useState } from "react";

export default function Index() {
  const [lyrics, setLyrics] = useState("");
  const [translated, setTranslated] = useState("");

  const handleTranslate = async () => {
    const formData = new FormData();
    formData.append("text", lyrics);

    const res = await fetch("/api/translate", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    setTranslated(result.translated);
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🎼 AI 작곡 프롬프트 생성기</h1>

      <textarea
        className="w-full h-40 border rounded p-3"
        placeholder="여기에 한국어 가사를 입력하세요..."
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
      />

      <button
        onClick={handleTranslate}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        🈂️ 영어 번역 요청 (DeepL API)
      </button>

      {translated && (
        <div className="bg-gray-100 border rounded p-4 mt-4">
          <h2 className="font-semibold mb-2">🎤 번역된 가사</h2>
          <pre className="whitespace-pre-wrap">{translated}</pre>
        </div>
      )}
    </main>
  );
}