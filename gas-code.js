/**
 * Radilia HP制作 - ネクストアクション チェックリスト同期用
 * Google Apps Script (GAS) コード
 *
 * 【セットアップ手順】
 * 1. Google スプレッドシートを新規作成する
 * 2. シート名が「シート1」であることを確認（デフォルトのまま）
 * 3. メニュー「拡張機能」→「Apps Script」を開く
 * 4. デフォルトの Code.gs の中身を全て削除し、このコードを貼り付ける
 * 5. 保存（Ctrl+S）する
 * 6. 右上「デプロイ」→「新しいデプロイ」をクリック
 * 7. 種類の選択で「ウェブアプリ」を選ぶ
 * 8. 「アクセスできるユーザー」を「全員」に設定
 * 9. 「デプロイ」をクリックし、表示されたURLをコピーする
 * 10. next-actions.html の GAS_URL 変数にコピーしたURLを貼り付ける
 *
 * 【スプレッドシートの構成】（自動で作成されます）
 *   A列: taskIndex（タスクの番号 0,1,2,...）
 *   B列: done（完了状態 TRUE/FALSE/DELETE）
 */

// ---------- 設定 ----------
var SHEET_NAME = 'checklist';

// ---------- ヘルパー ----------
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/**
 * スプレッドシートから全タスク状態を返す
 * { "0": true, "3": true, "5": "DELETE", ... }
 * - true: 完了
 * - "DELETE": 不要
 * - 未完了のタスクは含まない
 */
function getAllStates() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var states = {};
  if (lastRow === 0) return states;

  var data = sheet.getRange(1, 1, lastRow, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    var idx = String(data[i][0]);
    var val = data[i][1];
    if (val === 'DELETE') {
      states[idx] = 'DELETE';
    } else if (val === true || val === 'TRUE') {
      states[idx] = true;
    }
  }
  return states;
}

/**
 * GET リクエスト: 全タスク状態を JSON で返す
 */
function doGet(e) {
  var states = getAllStates();
  return ContentService
    .createTextOutput(JSON.stringify(states))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST リクエスト: タスク状態を更新する
 * リクエストボディ: { "taskIndex": 0, "done": true / false / "DELETE" }
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var taskIndex = String(body.taskIndex);
  // done: true(完了) / false(未完了) / "DELETE"(不要)
  var done = body.done;
  var cellValue;
  if (done === 'DELETE') {
    cellValue = 'DELETE';
  } else {
    cellValue = (done === true);
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  // 既存の行を検索
  var found = false;
  if (lastRow > 0) {
    var indices = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (var i = 0; i < indices.length; i++) {
      if (String(indices[i][0]) === taskIndex) {
        sheet.getRange(i + 1, 2).setValue(cellValue);
        found = true;
        break;
      }
    }
  }

  // 見つからなければ新しい行を追加
  if (!found) {
    sheet.appendRow([parseInt(taskIndex, 10), cellValue]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
