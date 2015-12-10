var SHEET_NAME = "1";
var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service
 
function doGet(e){
  return handleResponse(e);
}
 

function addOrder(data) {
  return returnResponse("success", "Your order has been added!");
}

function getOrder(data) {
  return returnResponse("success", "Here is the requested order");
}

function handleResponse(e) {
  
  var data = e.parameter;
  if (data['addOrder']) {
    return addOrder(data['addOrder']);
  } else if (data['getOrder']) {
    return getOrder(data['getOrder']);
  } else { 
    return returnError('Method Not Allowed');
  }
}
 
function returnResponse(result_type, content) {
  return ContentService
    .createTextOutput(JSON.stringify({"result": result_type, "content": content}))
    .setMimeType(ContentService.MimeType.JSON);
}

function returnError(error) {
  return returnResponse("error", error);
}
  
function legacy(e) {
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
