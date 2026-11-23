// ポイントを増やす・減らす処理と、画面の表示
// タスク1：開くと初回の500ポイントが加わり、残りと履歴を表示する。
// タスク2：URLに「?get=○○」が付いていたら、その条件のポイントを加える。
// タスク3：ランクのボタンを押すと、そのポイントを使って交換する。足りないときは交換しない。
// タスク4：残りと履歴をこのブラウザの中（ローカルストレージ）に保存する。外部には送らない。
// タスク7：画面に「ランク」という言葉を出さず、点数だけで表示する。
// （コードの中の rank や ranks という名前は、画面には出ない。変更を小さくするため、そのままにしている）
// タスク14：残りより高い点数のボタンは、点線にして「あと○」を出す。押せることは変えない。
// タスク15：画面には新しい履歴10件だけを出す。保存する履歴は新しい200件まで（残りポイントは別に保存しているので減らない）。
//           もらった（＋）点数はオレンジの太字、使った（−）点数は黒で、右端にそろえる。

var STORAGE_KEY = "foodPantryPoints.v1";  // ブラウザの中の保存場所の名前
var canSave = true;                        // 保存できない環境では false になる
var rankButtons = [];                      // 交換のボタンと、その点数（render で表示を切りかえる）
var MAX_HISTORY = 200;                     // 保存する履歴の最大の件数
var SHOW_HISTORY = 10;                     // 最初に画面に出す履歴の件数
var showAllHistory = false;                // 「すべての履歴を見る」を押したら true（保存しない）
// タスク16：アプリを開いたとき（QRでポイントをもらったときも、開いたときにあたる）、残りの数字を約1秒回してから止める。
//           交換のときは回さない。スマホで「動きを減らす」設定の人には回さない。
var rollOnNextRender = true;               // 開いたあと最初の表示だけ回す
var rollTimer = null;                      // 回している途中のタイマー

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
    }).slice(0, MAX_HISTORY);  // 古い保存データでも、新しい200件までにする
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
  if (state.history.length > MAX_HISTORY) {
    state.history.length = MAX_HISTORY;  // 一番古い履歴から消える。残りポイント（balance）は変わらない
  }
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
  addPoints("交換", -rank.points);  // 食品以外と交換することもあるので「食品」とは書かない
  state.message = rank.points + "ポイント使いました";
}

// 交換ボタンを rules.js のランクから作る（開いたときに1回だけ）
function setupRankButtons() {
  var area = document.getElementById("ranks");
  RULES.spend.forEach(function (rank) {
    var button = document.createElement("button");
    button.type = "button";

    var label = document.createElement("span");
    label.textContent = rank.points + "ポイント";  // 点数だけを表示する（D-28）
    var note = document.createElement("span");
    note.className = "rank-note";                   // 足りないときだけ「あと○」が入る（タスク14）

    button.appendChild(label);
    button.appendChild(note);
    // 足りないボタンも押せるままにする。押すと「ポイントが足りません」が出る。
    button.addEventListener("click", function () {
      spendPoints(rank);
      saveState();
      render();
    });
    area.appendChild(button);
    rankButtons.push({ button: button, note: note, rank: rank });
  });
}

// 残りに合わせて、足りないボタンに印と「あと○」を付ける（タスク14）
// 完全に押せなくすると、キーボードで選べず理由も伝わらないので、aria-disabled で「使えない状態」だけを伝える。
function updateRankButtons() {
  rankButtons.forEach(function (item) {
    var need = item.rank.points - state.balance;
    if (need > 0) {
      item.button.setAttribute("aria-disabled", "true");
      item.note.textContent = "あと" + need;
    } else {
      item.button.removeAttribute("aria-disabled");
      item.note.textContent = "";
    }
  });
}

// 画面を今の state に合わせて書き直す
function render() {
  var notes = [state.message];
  if (!canSave) notes.push("この端末では保存できません");
  document.getElementById("message").textContent = notes.filter(Boolean).join("　");
  if (rollOnNextRender) {
    rollOnNextRender = false;
    rollBalance(state.balance);
  } else {
    showBalance(state.balance);
  }
  updateRankButtons();

  renderHistory();
}

// 残りの数字をすぐに出す。回している途中なら、止めてから出す（タスク16）
function showBalance(value) {
  var el = document.getElementById("balance");
  if (rollTimer !== null) {
    clearInterval(rollTimer);
    rollTimer = null;
  }
  el.parentNode.removeAttribute("aria-busy");
  el.textContent = value;
}

// 残りの数字を回してから止める（タスク16）
// 残りが何ポイントでも、少なくとも4桁で回す（生徒Kの希望）。
// 左の桁から順に止まり、残りより多い桁は止まると消える（例：「4桁で回って、150で止まる」）。
// 数字の欄の幅は style.css で4桁分に固定しているので、右の「ポイント」の文字は動かない。
var SPIN_DIGITS = 4;  // 回すときの最低の桁数

function rollBalance(value) {
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    showBalance(value);
    return;
  }

  var el = document.getElementById("balance");
  var target = String(value);
  var length = Math.max(SPIN_DIGITS, target.length);
  // 左を空白で埋めて、回す桁数にそろえる（例：150 → " 150"）
  var digits = new Array(length - target.length + 1).join(" ") + target;
  // 5桁以上のときは、数字の欄の幅をその桁数に広げる（「ポイント」の文字がゆれないように）
  if (length > SPIN_DIGITS) {
    el.style.minWidth = (length + 0.5) + "ch";
  }
  var DURATION = 1000;    // 全部が止まるまで（ミリ秒）
  var FIRST_STOP = 400;   // 一番左の桁が止まり始めるまで（ミリ秒）
  var start = Date.now();

  // 読み上げ機能が、回っている途中のでたらめな数字を読まないようにする
  el.parentNode.setAttribute("aria-busy", "true");

  rollTimer = setInterval(function () {
    var passed = Date.now() - start;
    if (passed >= DURATION) {
      showBalance(value);
      return;
    }
    var text = "";
    for (var i = 0; i < digits.length; i++) {
      var stopAt = FIRST_STOP + (DURATION - FIRST_STOP) * (i + 1) / digits.length;
      if (passed >= stopAt) {
        if (digits.charAt(i) !== " ") {
          text += digits.charAt(i);                          // この桁はもう止まった（空白の桁は消える）
        }
      } else if (i === 0 && digits.length > 1) {
        text += String(1 + Math.floor(Math.random() * 9));   // 先頭の桁は 0 にしない
      } else {
        text += String(Math.floor(Math.random() * 10));
      }
    }
    el.textContent = text;
  }, 50);
}

// 履歴を出す（タスク15）。新しい10件だけ、または「すべて」を出す。
function renderHistory() {
  var list = document.getElementById("history");
  list.innerHTML = "";

  if (state.history.length === 0) {
    var empty = document.createElement("li");
    empty.textContent = "まだ履歴はありません";
    list.appendChild(empty);
  }

  var shown = showAllHistory ? state.history : state.history.slice(0, SHOW_HISTORY);
  shown.forEach(function (item) {
    var li = document.createElement("li");

    var time = document.createElement("span");
    time.className = "history-time";
    time.textContent = formatTime(item.time);

    var label = document.createElement("span");
    label.className = "history-label";
    label.textContent = item.label;

    // 色だけに頼らず、「+」「−」の記号も付ける
    var amount = document.createElement("span");
    if (item.amount > 0) {
      amount.className = "history-amount plus";
      amount.textContent = "+" + item.amount + " ポイント";
    } else {
      amount.className = "history-amount";
      amount.textContent = item.amount + " ポイント";
    }

    li.appendChild(time);
    li.appendChild(label);
    li.appendChild(amount);
    list.appendChild(li);
  });

  // 10件より多いときだけ、切りかえのボタンを出す
  var toggle = document.getElementById("history-toggle");
  if (state.history.length > SHOW_HISTORY) {
    toggle.hidden = false;
    toggle.textContent = showAllHistory
      ? "新しい" + SHOW_HISTORY + "件だけを見る"
      : "すべての履歴を見る（" + state.history.length + "件）";
  } else {
    toggle.hidden = true;
  }
}

// 「すべての履歴を見る」ボタン（タスク15）
function setupHistoryToggle() {
  document.getElementById("history-toggle").addEventListener("click", function () {
    showAllHistory = !showAllHistory;
    renderHistory();
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
setupHistoryToggle();
render();
