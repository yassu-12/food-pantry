// 掲示用QRコードのページ（タスク12、職員用）
// rules.js の「もらう条件」（RULES.earn）にある活動ごとに、QRコードを並べる。
// QRコードは、このブラウザの中で作る（vendor/qrcode.js）。外部には何も送らない。
// このページでは app.js を読み込まないので、開いてもポイントは増えない。

// アプリのページ（index.html）のアドレスを、このページのアドレスから作る。
// 例：https://yassu-12.github.io/minnano-shokuhin/qr.html → https://yassu-12.github.io/minnano-shokuhin/
function appBaseUrl() {
  var url = new URL("./", location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

// QRのまわりの飾り：SDGs の17色の光（使い方の1枚目と同じ形。生徒Kが選んだ案B、2026-11-26）
// 白い丸の中にQRを置き、光はQRの角より外にだけ出す。QRのまわりの白い余白はそのまま残すので、読み取りに影響しない。
var BURST_COLORS = ["#E5243B", "#DDA63A", "#4C9F38", "#C5192D", "#FF3A21", "#26BDE2", "#FCC30B", "#A21942", "#FD6925",
  "#DD1367", "#FD9D24", "#BF8B2E", "#3F7E44", "#0A97D9", "#56C02B", "#00689D", "#19486A"];
var BURST_LENGTHS = [22, 12, 17, 9, 20, 14, 16, 24, 10, 19, 13, 18, 11, 23, 15, 17, 12];

function burstSvg() {
  // 全体は 200×200。QRは中央の 100×100（角は中心から約71）。白い丸は半径74、光は76から外へ。
  var svg = '<svg class="qr-burst" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">';
  BURST_COLORS.forEach(function (color, i) {
    var length = BURST_LENGTHS[i];
    svg += '<rect x="-5" y="' + (-76 - length) + '" width="10" height="' + length + '" rx="2" fill="' + color +
      '" transform="rotate(' + (i * 360 / 17).toFixed(2) + ')"/>';
  });
  svg += '<circle r="74" fill="#ffffff"/></svg>';
  return svg;
}

// 1つの活動のカードを作る
function makeCard(code, rule, index) {
  var url = appBaseUrl() + "?get=" + encodeURIComponent(code);

  var qr = qrcode(0, "M");  // 0 = 大きさは自動、"M" = 少し汚れても読める程度の強さ
  qr.addData(url);
  qr.make();

  var card = document.createElement("section");
  card.className = "qr-card";

  var ring = document.createElement("div");
  ring.className = "qr-ring";
  ring.innerHTML = burstSvg();

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

  // 掲示物にもセンター名を入れる（タスク21）。パントリーの名前「みんなの食品庫」も足した（生徒K、2026-11-26）
  var org = document.createElement("p");
  org.className = "qr-org";
  org.textContent = "地域連携教育推進センター　フードパントリー「みんなの食品庫」";

  var address = document.createElement("p");
  address.className = "qr-url";
  address.textContent = url;

  ring.appendChild(image);
  card.appendChild(ring);
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
