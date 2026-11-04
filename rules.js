// ポイントの条件をまとめたファイル
// 条件はセンターの部屋で相談して決める（DECISIONS.md D-14）。変えるときはここだけを直す。

var RULES = {
  // 初めて開いたときにもらえるポイント（DECISIONS.md D-15）
  initialPoints: 500,

  // もらう条件：URLの「?get=○○」の ○○ と、もらえるポイント
  // 【仮】150ポイントはヒアリング③の「150ポイントぐらい」をもとにした仮の値。正式な点数は部屋で相談して決める。
  earn: {
    visit: { label: "来所", points: 150 }
  },

  // 使う条件：食品のランクと、交換に必要なポイント（DECISIONS.md D-15）
  spend: [
    { label: "ランク0", points: 0 },
    { label: "ランク1", points: 50 },
    { label: "ランク2", points: 100 },
    { label: "ランク3", points: 200 }
  ]
};
