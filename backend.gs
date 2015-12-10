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

function getTable(environment) {
    var db = SpreadsheetApp.openById(SCRIPT_PROP.getProperty(environment));
    var table = db.getActiveSheet();
    return table;
}

function getCalendar(environment) {
    return CalendarApp.getCalendarById(SCRIPT_PROP.getProperty(environment + 'Calendar'));
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
        return returnError("Order with orderId='" + data['orderId'] + "' not found");
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

function insertOrderToDatabase(environment, data) {
    var table = getTable(environment);
    var calendar = getCalendar(environment);
    var row = [];
    var now = new Date()
    row.push(now);
    row.push(data['phoneNumber']);
    row.push(data['orderId']);
    var geoAddressFrom = geocodeAddress(data['addressFrom']);
    var geoAddressTo = geocodeAddress(data['addressTo']);
    row.push(geoAddressFrom['formatted']);
    row.push(geoAddressTo['formatted']);
    row.push(data['bookingTime']);
    row.push("OPEN"); //status
    row.push("NOBODY"); // assigned

    row.push(geoAddressFrom['latitude']);   // addressFromLatitude
    row.push(geoAddressFrom['longitude']);  // addressFromLongitude
    row.push(geoAddressTo['latitude']);     // addressToLatitude
    row.push(geoAddressTo['longitude']);    // addressToLongitude

    addEventToCalendar(calendar, geoAddressFrom['formatted'],  geoAddressTo['formatted'],
                       data['bookingTime'], data['orderId']);
    return insert(table, row);
}

function addEventToCalendar(calendar, from, to, bookingTime, orderId) {
    event_description = "From '" + from + "' to '" + to + "' (" + orderId + ")";
    var event = calendar.createEvent(event_description, new Date(), new Date(bookingTime));
}

function geocodeAddress(address) {
  var response = Maps.newGeocoder().geocode(address);
  point = response.results[0];
  result = {'latitude': point.geometry.location.lat.toString(),
            'longitude': point.geometry.location.lng.toString(),
            'formatted': point.formatted_address}
  return result;
}

function buildOrderJSON(headers, row) {
    // map headers and rows
    var result = row.reduce(function(result, field, index) {
        result[headers[index]] = field;
        return result
        }, {});
    return result;
}

function getOrderById(environment, orderId) {
    var table = getTable(environment);
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
    var testingCalendar = '3983qmc7vmt04ok21pvcofdeg0@group.calendar.google.com';
    var productionCalendar = '3mfdarqlfcm0rccip8kh0leq3k@group.calendar.google.com';
    SCRIPT_PROP.setProperty("testingCalendar", testingCalendar);
    SCRIPT_PROP.setProperty("productionCalendar", productionCalendar);
    SCRIPT_PROP.setProperty("testing", testingDB.getId());
    SCRIPT_PROP.setProperty("production", productionDB.getId());

}