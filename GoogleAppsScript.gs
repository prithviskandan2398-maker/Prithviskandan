// Google Apps Script for handling authentication and database operations
// This script should be deployed as a Web App

const SHEET_NAME = "Users"; // Name of your Google Sheet
const SPREADSHEET_ID = "12mhbYT6Ma3Zhm5DGGb5c-59xgF2QbNLokrxJgea91Bw"; // Replace with your Google Sheet ID

const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
let sheet = ss.getSheetByName(SHEET_NAME);

// Initialize sheet if it doesn't exist
function initializeSheet() {
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(["Family Name", "Email", "Password", "Child Name"]);
    }
}

// Handle POST requests
function doPost(e) {
    initializeSheet();
    
    try {
        const data = JSON.parse(e.postData.contents);
        
        if (data.action === "signup") {
            return handleSignup(data);
        } else if (data.action === "login") {
            return handleLogin(data);
        }
        
        return sendResponse(false, "Invalid action");
    } catch (error) {
        return sendResponse(false, "Error: " + error.message);
    }
}

// Handle signup
function handleSignup(data) {
    const { role, familyName, email, password, childName } = data;
    
    // Check if email already exists (for parents)
    if (role === "parent") {
        const emailExists = sheet.getRange(1, 2, sheet.getLastRow()).getValues()
            .some(row => row[0] === email);
        
        if (emailExists) {
            return sendResponse(false, "Email already registered");
        }
    }
    
    // Add user to sheet
    sheet.appendRow([
        familyName || "",
        email || "",
        password, // Note: In production, hash the password!
        childName || ""
    ]);
    
    return sendResponse(true, "Signup successful", { userName: familyName || childName });
}

// Handle login
function handleLogin(data) {
    const { role, familyName, email, childName, password } = data;
    
    const values = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();
    
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        
        if (role === "parent") {
            if (row[1] === email && row[2] === password) {
                return sendResponse(true, "Login successful", { userName: row[0] });
            }
        } else if (role === "child") {
            if (row[0] === familyName && row[3] === childName && row[2] === password) {
                return sendResponse(true, "Login successful", { userName: childName });
            }
        }
    }
    
    return sendResponse(false, "Invalid credentials");
}

// Send response helper
function sendResponse(success, message, data = {}) {
    return ContentService.createTextOutput(
        JSON.stringify({
            success: success,
            message: message,
            ...data
        })
    ).setMimeType(ContentService.MimeType.JSON);
}

// Get all users (for debugging)
function getAllUsers() {
    initializeSheet();
    const values = sheet.getRange(1, 1, sheet.getLastRow(), 4).getValues();
    return values;
}

