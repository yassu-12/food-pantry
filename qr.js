// 掲示用QRコードのページ（タスク12、職員用）
// rules.js の「もらう条件」（RULES.earn）にある活動ごとに、QRコードを並べる。
// QRコードは、このブラウザの中で作る（vendor/qrcode.js）。外部には何も送らない。
// このページでは app.js を読み込まないので、開いてもポイントは増えない。

// アプリのページ（index.html）のアドレスを、このページのアドレスから作る。
// 例：https://yassu-12.github.io/food-pantry/qr.html → https://yassu-12.github.io/food-pantry/
function appBaseUrl() {
  var url = new URL("./", location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

// 1つの活動のカードを作る
function makeCard(code, rule, index) {
  var url = appBaseUrl() + "?get=" + encodeURIComponent(code);

  var qr = qrcode(0, "M");  // 0 = 大きさは自動、"M" = 少し汚れても読める程度の強さ
  qr.addData(url);
  qr.make();

  var card = document.createElement("section");
  card.className = "qr-card";

  var image = document.createElement("div");
  image.className = "qr-image";
  image.innerHTML = qr.createSvgTag({
    cellSize: 8,
    margin: 32,
    scalable: true,
    title: { text: rule.label + "（" + rule.points + "ポイント）のQRコード", id: "qr-title-" + index }
  });

  // 一番大きく「〇ポイント」、その下に小さく名前（来所・活動に参加）を出す（D-31）
  // 「もらえます」と「スマホのカメラで読んでください」は、画面がうるさくなるので出さない（生徒K、2026-11-25）
  var name = document.createElement("p");
  name.className = "qr-name";
  name.textContent = rule.points + "ポイント";

  var points = document.createElement("p");
  points.className = "qr-points";
  points.textContent = rule.label;

  // 掲示物にもセンター名を入れる（タスク21）
  var org = document.createElement("p");
  org.className = "qr-org";
  org.textContent = "地域連携教育推進センター　フードパントリー";

  var address = document.createElement("p");
  address.className = "qr-url";
  address.textContent = url;

  card.appendChild(image);
  card.appendChild(name);
  card.appendChild(points);
  card.appendChild(org);
  card.appendChild(address);
  return card;
}

function showCards() {
  var list = document.getElementById("qr-list");
  var codes = Object.keys(RULES.earn);
  if (codes.length === 0) {
    list.textContent = "rules.js に、ポイントをもらう活動がありません。";
    return;
  }
  codes.forEach(function (code, index) {
    list.appendChild(makeCard(code, RULES.earn[code], index));
  });
}

document.getElementById("print-button").addEventListener("click", function () {
  window.print();
});

showCards();
