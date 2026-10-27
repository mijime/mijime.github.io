import { Button } from "@mijime/theme/ui";

export function Onboarding({
  onSample,
  onBlank,
  onAdv,
}: {
  onSample: () => void;
  onBlank: () => void;
  onAdv: () => void;
}) {
  return (
    <div className="h-full overflow-auto flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-5">
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase opacity-30">saiflow</p>
          <h1 className="text-2xl font-semibold mt-1 leading-tight">
            人生のお金の流れを、年ごとに。
          </h1>
          <p className="text-sm opacity-50 mt-2 leading-relaxed">
            年収・生活費・住宅・教育・投資を「イベント」として並べ、将来の資産を試算します。
            金額の単位はすべて<strong className="font-medium opacity-80">万円</strong>です。
          </p>
        </div>

        <Button
          variant="primary"
          className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-4 text-left"
          onClick={onAdv}
        >
          <span className="text-sm font-medium">1年ずつ選んで作る（ADV）</span>
          <span className="block text-[11px] opacity-80 leading-relaxed">
            年ごとの選択肢を選ぶだけで、住宅・子ども・退職・投資のイベントを自動で入力します。
          </span>
        </Button>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-4 text-left"
            onClick={onSample}
          >
            <span className="text-sm font-medium">サンプルで始める</span>
            <span className="block text-[11px] opacity-40 leading-relaxed">
              夫婦＋子ども2人（3歳差）の35歳からの家計。住宅ローンや教育費の入った例をそのまま編集できます。
            </span>
          </Button>
          <Button
            variant="secondary"
            className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-4 text-left"
            onClick={onBlank}
          >
            <span className="text-sm font-medium">空のシナリオで始める</span>
            <span className="block text-[11px] opacity-40 leading-relaxed">
              イベントを1つずつ追加して、自分の家計をゼロから組み立てます。
            </span>
          </Button>
        </div>

        <div className="text-[11px] opacity-40 border-t border-(--border) pt-3 space-y-1 leading-relaxed">
          <p>・イベントは「開始年齢〜終了年齢」と「どの資産をいくら増減するか」で定義します。</p>
          <p>・入力内容はこのブラウザに自動保存されます。保存一覧からいつでも開けます。</p>
          <p>・計算結果は概算です。投資判断の根拠にはしないでください。</p>
          <p>・サンプルは架空の家計例です。</p>
        </div>
      </div>
    </div>
  );
}
