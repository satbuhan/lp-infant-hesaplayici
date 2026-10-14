/*
 * LP Hesaplayıcı — saf karar mantığı (DOM'dan bağımsız)
 *
 * Bu dosya, index.html'deki arayüzün VE araştırma amaçlı parametre
 * taramasının (sweep.js) tek ve ortak kaynağıdır. Buradaki mantık
 * değiştiğinde her iki kullanım da otomatik güncellenir; aradaki
 * sapma riskini ortadan kaldırmak için mantık ASLA başka bir yerde
 * kopyalanıp tekrar yazılmamalıdır.
 *
 * Tarayıcıda <script src="logic.js"></script> ile window.LPLogic
 * olarak; Node'da require('./logic.js') ile kullanılır.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.LPLogic = mod;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {

  var GUIDELINE_KEYS = ['aap', 'pecarn', 'nice', 'cps', 'step', 'tnd'];

  // inputs: { age, appearance:'good'|'bad', urine:'neg'|'pos'|'unknown',
  //           pct, crp, anc, wbc, temp } — sayısal alanlar null veya sayı.
  //
  // NOT: "term" (term/önceden sağlıklı) alanı arayüzde toplanıp PDF/CSV
  // kayıtlarında görüntülenir, ancak hiçbir kılavuzun algoritmasında karar
  // değişkeni olarak KULLANILMAZ — araç, kapsamını zaten "term, önceden
  // sağlıklı" infantlarla sınırlı tanımlar (bkz. footerScope metni), bu
  // yüzden bu alan bir dahil etme/dışlama ön koşulu olarak değil, yalnızca
  // kayıt amaçlı bir bilgi alanı olarak tasarlanmıştır. Parametre taraması
  // bu nedenle "term" eksenini atlar (her değeri için sonuç özdeş olur).
  function evaluateGuidelines(inputs) {
    var age = inputs.age, appearance = inputs.appearance, urine = inputs.urine,
        pct = inputs.pct, crp = inputs.crp, anc = inputs.anc, wbc = inputs.wbc, temp = inputs.temp;
    var byKey = {};

    if (appearance === 'bad') {
      GUIDELINE_KEYS.forEach(function (k) { byKey[k] = { cls: 'red', msgKey: 'bad', oos: false }; });
      return { byKey: byKey, banner: 'bad' };
    }

    // ---- AAP 2021 ----
    if (age < 8) {
      byKey.aap = { cls: 'gray', msgKey: 'aap_lt8', oos: true };
    } else if (age <= 21) {
      byKey.aap = { cls: 'red', msgKey: 'aap_8_21', oos: false };
    } else if (age <= 28) {
      var haveMarker28 = pct !== null || crp !== null || anc !== null || temp !== null;
      var abn28 = pct !== null ? (pct > 0.5 || (anc !== null && anc > 4000))
                               : ((crp !== null && crp > 20) || (anc !== null && anc > 5200) || (temp !== null && temp > 38.5));
      if (!haveMarker28) byKey.aap = { cls: 'gray', msgKey: 'aap_22_28_missing', oos: false };
      else if (abn28) byKey.aap = { cls: 'red', msgKey: 'aap_22_28_red', oos: false };
      else byKey.aap = { cls: 'yellow', msgKey: 'aap_22_28_yellow', oos: false };
    } else if (age <= 60) {
      var haveMarker60 = pct !== null || crp !== null || anc !== null || temp !== null;
      var abn60 = pct !== null ? (pct > 0.5 || (anc !== null && anc > 4000))
                               : ((crp !== null && crp > 20) || (anc !== null && anc > 5200) || (temp !== null && temp > 38.5));
      if (!haveMarker60) byKey.aap = { cls: 'gray', msgKey: 'aap_29_60_missing', oos: false };
      else if (abn60) byKey.aap = { cls: 'yellow', msgKey: 'aap_29_60_yellow', oos: false };
      else byKey.aap = { cls: 'green', msgKey: 'aap_29_60_green', oos: false };
    } else {
      byKey.aap = { cls: 'gray', msgKey: 'aap_gt60', oos: true };
    }

    // ---- PECARN ----
    if (age <= 60) {
      if (urine === 'neg' && anc !== null && anc <= 4000 && pct !== null && pct <= 0.5) {
        byKey.pecarn = { cls: 'green', msgKey: 'pecarn_green', oos: false };
      } else if (urine === 'unknown' || anc === null || pct === null) {
        byKey.pecarn = { cls: 'gray', msgKey: 'pecarn_missing', oos: false };
      } else {
        byKey.pecarn = { cls: 'yellow', msgKey: 'pecarn_yellow', oos: false };
      }
    } else {
      byKey.pecarn = { cls: 'gray', msgKey: 'pecarn_outofscope', oos: true };
    }

    // ---- NICE NG143 ----
    if (age < 30) {
      byKey.nice = { cls: 'red', msgKey: 'nice_lt30', oos: false };
    } else if (age <= 90) {
      if (wbc !== null && (wbc < 5000 || wbc > 15000)) {
        byKey.nice = { cls: 'red', msgKey: 'nice_30_90_red', oos: false };
      } else if (wbc === null) {
        byKey.nice = { cls: 'gray', msgKey: 'nice_30_90_missing', oos: false };
      } else {
        byKey.nice = { cls: 'green', msgKey: 'nice_30_90_green', oos: false };
      }
    } else {
      byKey.nice = { cls: 'gray', msgKey: 'nice_outofscope', oos: true };
    }

    // ---- CPS 2024/26 ----
    if (age <= 28) {
      byKey.cps = { cls: 'yellow', msgKey: 'cps_0_28', oos: false };
    } else if (age <= 60) {
      var abnCps = (pct !== null && pct > 0.5) || (crp !== null && crp > 20) || (anc !== null && anc > 4000);
      if (abnCps) byKey.cps = { cls: 'yellow', msgKey: 'cps_29_60_yellow', oos: false };
      else if (pct === null && crp === null && anc === null) byKey.cps = { cls: 'gray', msgKey: 'cps_29_60_missing', oos: false };
      else byKey.cps = { cls: 'green', msgKey: 'cps_29_60_green', oos: false };
    } else if (age <= 90) {
      if (urine === 'pos') byKey.cps = { cls: 'yellow', msgKey: 'cps_61_90_urinepos', oos: false };
      else byKey.cps = { cls: 'green', msgKey: 'cps_61_90_green', oos: false };
    } else {
      byKey.cps = { cls: 'gray', msgKey: 'cps_outofscope', oos: true };
    }

    // ---- Step-by-Step (Gómez 2016) ----
    if (age <= 21) {
      byKey.step = { cls: 'red', msgKey: 'step_le21', oos: false };
    } else if (age <= 90) {
      var haveAll = urine !== 'unknown' && pct !== null && crp !== null && anc !== null;
      if (!haveAll) byKey.step = { cls: 'gray', msgKey: 'step_missing', oos: false };
      else if (urine === 'neg' && pct < 0.5 && crp <= 20 && anc <= 10000) byKey.step = { cls: 'green', msgKey: 'step_green', oos: false };
      else if (crp > 20 || anc > 10000) byKey.step = { cls: 'yellow', msgKey: 'step_yellow', oos: false };
      else byKey.step = { cls: 'red', msgKey: 'step_red', oos: false };
    } else {
      byKey.step = { cls: 'gray', msgKey: 'step_outofscope', oos: true };
    }

    // ---- TND 2023 ----
    byKey.tnd = { cls: 'gray', msgKey: 'tnd_general', oos: true };

    // ---- Birleşik ("seçici LP") sonuç ----
    var applicable = GUIDELINE_KEYS.map(function (k) { return byKey[k]; }).filter(function (r) { return !r.oos; });
    var anyRed = applicable.some(function (r) { return r.cls === 'red'; });
    var anyYellow = applicable.some(function (r) { return r.cls === 'yellow'; });
    var missingCount = applicable.filter(function (r) { return r.cls === 'gray'; }).length;

    var banner;
    if (applicable.length === 0) banner = 'oos';
    else if (anyRed) banner = 'red';
    else if (anyYellow) banner = 'yellow';
    else if (missingCount > 0) banner = 'missing';
    else banner = 'green';

    return { byKey: byKey, banner: banner };
  }

  return { GUIDELINE_KEYS: GUIDELINE_KEYS, evaluateGuidelines: evaluateGuidelines };
});
