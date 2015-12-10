//  OLOLOLO 1. Enter sheet name where data is to be written below
        var SHEET_NAME = "1";
        var testSetup = 0;

//  2. Run > setup
//
//  3. Publish > Deploy as web app
//    - enter Project Version name and click 'Save New Version'
//    - set security level and enable service (most likely execute as 'me' and access 'anyone, even anonymously)
//
//  4. Copy the 'Current web app URL' and post this in your form/script action
//
//  5. Insert column names on your destination sheet matching the parameter names of the data you are passing in (exactly matching case)

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

// If you don't want to expose either GET or POST methods you can comment out the appropriate function
function doGet(e){
  return handleResponse(e);
}

function doPost(e){
  return handleResponse(e);
}

function handleResponse(e) {
  // shortly after my original solution Google announced the LockService[1]
  // this prevents concurrent access overwritting data
  // [1] http://googleappsdeveloper.blogspot.co.uk/2011/10/concurrency-and-google-apps-script.html
  // we want a public lock, one that locks for all invocations
 //  var lock = LockService.getPublicLock();
  var doc = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));

  // next set where we write the data - you could write to multiple/alternate destinations
  var sheet = doc.getActiveSheet();

  // we'll assume header is in row 1 but you can override with header_row in GET/POST data
  var row = [];
  var data = JSON.stringify(e.parameter);
  row.push(new Date());
  row.push(data);
  testSetup += 1;
  // more efficient to set values as [][] array than individually

  try {
      var lock = LockService.getScriptLock();
      lock.waitLock(3000);
      sheet.appendRow(row);
    // return json success results
    return ContentService
    .createTextOutput(JSON.stringify({"result":"success", "testSetup": testSetup}))
          .setMimeType(ContentService.MimeType.JSON);
  } catch(e){
    // if error return this
    return ContentService
          .createTextOutput(JSON.stringify({"result":"error", "error": e}))
          .setMimeType(ContentService.MimeType.JSON);
  } finally { //release lock
    lock.releaseLock();
  }
}

function setup() {
    var doc = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/121dxHWUAqiKaDR7oD4rn9M-QlxG_k6rgkg28jNpDTv4/edit');
    SCRIPT_PROP.setProperty("key", doc.getId());
}
