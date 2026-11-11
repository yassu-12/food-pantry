// ポイントを増やす・減らす処理と、画面の表示
// タスク1：開くと初回の500ポイントが加わり、残りと履歴を表示する。
// タスク2：URLに「?get=○○」が付いていたら、その条件のポイントを加える。
// タスク3：ランクのボタンを押すと、そのポイントを使って交換する。足りないときは交換しない。
// タスク4：残りと履歴をこのブラウザの中（ローカルストレージ）に保存する。外部には送らない。
// タスク7：画面に「ランク」という言葉を出さず、点数だけで表示する。
// （コードの中の rank や ranks という名前は、画面には出ない。変更を小さくするため、そのままにしている）

var STORAGE_KEY = "foodPantryPoints.v1";  // ブラウザの中の保存場所の名前
var canSave = true;                        // 保存できない環境では false になる

var state = {
  balance: 0,   // 残りポイント
  history: [],  // もらった・使った履歴（新しいものが先頭）
  message: ""   // 画面に出すお知らせ（保存しない）
};

// 保存してある残りと履歴を読み込む。保存がない・読めないときは false を返す。
function loadState() {
  var raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    canSave = false;
    return false;
  }
  if (!raw) return false;

  try {
    var data = JSON.parse(raw);
    if (typeof data.balance !== "number" || !Array.isArray(data.history)) return false;
    state.balance = data.balance;
    state.history = data.history.map(function (item) {
      return { label: item.label, amount: item.amount, time: new Date(item.time) };
    });
    return true;
  } catch (e) {
    return false;  // 中身が壊れていたら、最初から始める
  }
}

// 残りと履歴を保存する。失敗してもアプリは止めない。
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance: state.balance, history: state.history }));
  } catch (e) {
    canSave = false;
  }
}

// ポイントを加えて、履歴に1行残す
function addPoints(label, amount) {
  state.balance += amount;
  state.history.unshift({ label: label, amount: amount, time: new Date() });
}

// URLの「?get=○○」を読み取り、条件に合えばポイントを加える
function handleGetFromUrl() {
  var code = new URLSearchParams(location.search).get("get");
  if (code === null) return;  // 印のない普通のURL

  var rule = Object.prototype.hasOwnProperty.call(RULES.earn, code) ? RULES.earn[code] : null;
  if (rule) {
    addPoints(rule.label, rule.points);
    state.message = rule.points + "ポイントもらいました";
  } else {
    state.message = "このQRコードは使えません";
  }

  // 再読み込みで二重に加わらないよう、アドレスから印を消す。
  // ファイルを直接開いたときは消せないブラウザがあるので、失敗しても止めない。
  try {
    history.replaceState(null, "", location.pathname + location.hash);
  } catch (e) {}
}

// ランクを選んで交換する。足りないときは引かずに理由を出す。
function spendPoints(rank) {
  if (state.balance < rank.points) {
    state.message = "ポイントが足りません（あと" + (rank.points - state.balance) + "ポイント必要）";
    return;
  }
  addPoints("食品と交換", -rank.points);
  state.message = rank.points + "ポイント使いました";
}

// 交換ボタンを rules.js のランクから作る（開いたときに1回だけ）
function setupRankButtons() {
  var area = document.getElementById("ranks");
  RULES.spend.forEach(function (rank) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = rank.points + "ポイント";  // 点数だけを表示する（D-28）
    button.addEventListener("click", function () {
      spendPoints(rank);
      saveState();
      render();
    });
    area.appendChild(button);
  });
}

// 画面を今の state に合わせて書き直す
function render() {
  var notes = [state.message];
  if (!canSave) notes.push("この端末では保存できません");
  document.getElementById("message").textContent = notes.filter(Boolean).join("　");
  document.getElementById("balance").textContent = state.balance;

  var list = document.getElementById("history");
  list.innerHTML = "";
  state.history.forEach(function (item) {
    var li = document.createElement("li");
    var sign = item.amount > 0 ? "+" : "";
    li.textContent = formatTime(item.time) + "　" + item.label + "　" + sign + item.amount + " ポイント";
    list.appendChild(li);
  });
}

// 時刻を「11/04 10:30」の形にする
function formatTime(date) {
  function two(n) { return (n < 10 ? "0" : "") + n; }
  return two(date.getMonth() + 1) + "/" + two(date.getDate()) + " " +
    two(date.getHours()) + ":" + two(date.getMinutes());
}

// 初回の500ポイントは、保存がないときだけ加える
if (!loadState()) {
  addPoints("初回", RULES.initialPoints);
}
handleGetFromUrl();
saveState();
setupRankButtons();
render();
