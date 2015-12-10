var SHEET_NAME = "1";
var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service

function doGet(e) {
    return handleResponse(e);
}

function getEnvironment(data) {
    var environment = data['env'];
    if (!environment)
      environment = 'testing';
    return environment;
}

function getTable(db_name) {
    var db = SpreadsheetApp.openById(SCRIPT_PROP.getProperty(db_name));
    var table = db.getActiveSheet();
    return table;
}

function addOrder(data) {
    if (insertOrderToDatabase(getEnvironment(data), data))
      return returnResponse("success",
                            "Your order '" + data['orderId'] + "' has been added!");
}

function getOrder(data) {
    var order = getOrderById(getEnvironment(data), data['orderId']);
    if (order)
        return returnResponse("success", order);
    else
        return returnResponse("Order with orderId='" + data['orderId'] + "' not found");
}

function handleResponse(e) {

    var data = e.parameter;
    if (data['addOrder']) {
        new_order = JSON.parse(data['addOrder']);
        return addOrder(new_order);
    } else if (data['getOrder']) {
        order_meta = JSON.parse(data['getOrder']);
        return getOrder(order_meta);
    } else {
        return returnError('Method Not Allowed');
    }
}

function returnResponse(result_type, content) {
    return ContentService
        .createTextOutput(JSON.stringify({
            "result": result_type,
            "content": content
        }))
        .setMimeType(ContentService.MimeType.JSON);
}

function returnError(error) {
    return returnResponse("error", error);
}

function insertOrderToDatabase(db_name, data) {
    var table = getTable(db_name);
    var row = [];
    row.push(new Date());
    row.push(data['phoneNumber']);
    row.push(data['orderId']);
    row.push(data['addressFrom']);
    row.push(data['addressTo']);
    row.push(data['bookingTime']);
    row.push("OPEN"); //status
    // assigned
    // addressFromLongitude
    // addressFromLatitude
    // addressToLongitude
    // addressToLatitude
    return insert(table, row);
}

function buildOrderJSON(headers, row) {
    // map headers and rows
    var result = row.reduce(function(result, field, index) {
        result[headers[index]] = field;
        return result
        }, {});
    return result;
}

function getOrderById(db_name, orderId) {
    var table = getTable(db_name);
    var values = table.getDataRange().getValues();
    var headers = values[0];

    var row = findRowByOrderId(table, orderId);

    if (row)
        return buildOrderJSON(headers, values[row]);
    else
        return null;

}

function findRowByOrderId(table, orderId) {
    var values = table.getDataRange().getValues();
    for (var row in values) {
        for (var col in values[row])
          if (values[row][col] == orderId)
              return row;

   }
}

function getColumnIndex(headers, column_name) {
     return headers.indexOf(column_name);
}

function setCellValue(table, row, column, value) {
    //setCellValue(table, row, getColumnIndex(headers, "phoneNumber"), "new-phone-number");

    try {
        var lock = LockService.getScriptLock();
        lock.waitLock(1000);
        table.getRange(parseInt(row) + 1, parseInt(column) + 1).setValue(value); // main thing
        return True;
    } catch (e) {
        return returnError(e);
    } finally { //release lock
        lock.releaseLock();
    }

}

function insert(table, row) {
    try {
        var lock = LockService.getScriptLock();
        lock.waitLock(1000);
        table.appendRow(row);  //main thing
        return True;
    } catch (e) {
        return returnError(e);
    } finally { //release lock
        lock.releaseLock();
    }
}

function setup() {
    var testingDB = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/121dxHWUAqiKaDR7oD4rn9M-QlxG_k6rgkg28jNpDTv4/edit');
    var productionDB = SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/1QD-cIBTBLBbdrxV-oWgruTGP8XqdysQWW-U9KoMUsKE/edit');
    SCRIPT_PROP.setProperty("testing", testingDB.getId());
    SCRIPT_PROP.setProperty("production", productionDB.getId());

}