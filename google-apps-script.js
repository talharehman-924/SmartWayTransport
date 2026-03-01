// Google Apps Script Webhook Receiver for SmartWay Booking System
// 1. Go to your Google Sheet -> Extensions -> Apps Script
// 2. Paste this code and save
// 3. Click Deploy -> New Deployment
// 4. Select type: 'Web app'
// 5. Execute as: 'Me'
// 6. Who has access: 'Anyone'
// 7. Click Deploy, copy the Web App URL generated.
// 8. Add that Web App URL to your Vercel Environment Variables as NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK

const SHEET_NAME = "Bookings";

function doPost(e) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
        if (!sheet) {
            return ContentService.createTextOutput("Sheet not found").setMimeType(ContentService.MimeType.TEXT);
        }

        // Parse the incoming JSON booking payload
        const payload = JSON.parse(e.postData.contents);
        const data = payload.data;
        const action = payload.action;

        // Define the exact column headers you want based on your database payload
        const headers = [
            "id", "client_name", "client_contact", "date", "pickup_time", "vehicle", "package",
            "adults", "children", "payment_sar", "advance_sar",
            "driver_name", "driver_contact", "driver_vehicle",
            "commission_sar", "status", "payment_mode", "commission_received",
            "booking_refer_by", "booking_referral_contact", "added_by", "created_at"
        ];

        // Initialize Headers on row 1 if empty
        if (sheet.getLastRow() === 0) {
            sheet.appendRow(headers);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }

        // Try to find if this booking ID already exists to update it, rather than creating duplicates
        const dataRange = sheet.getDataRange();
        const values = dataRange.getValues();
        let rowIndex = -1;

        // Search for ID in Column 1 (index 0)
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][0]) === String(data.id)) {
                rowIndex = i + 1; // Apps Script rows are 1-indexed
                break;
            }
        }

        // Extract row data based on our header map
        const rowData = headers.map(header => data[header] !== undefined ? data[header] : "");

        if (rowIndex > -1) {
            // Update existing row (Edit/Assign/Complete)
            sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        } else {
            // Insert new row (New Booking)
            sheet.appendRow(rowData);
        }

        return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            "status": "error",
            "message": error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}
