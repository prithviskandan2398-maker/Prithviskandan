// Google Apps Script for handling authentication and database operations
// This script should be deployed as a Web App

const SHEET_NAME = "Users"; // Name of your Google Sheet
const SPREADSHEET_ID = "12mhbYT6Ma3Zhm5DGGb5c-59xgF2QbNLokrxJgea91Bw"; // Replace with your Google Sheet ID

const TASKS_SHEET = "Tasks";
const MEMBERS_SHEET = "Members";
const REWARDS_SHEET = "Rewards";

const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
let sheet = ss.getSheetByName(SHEET_NAME);

// Initialize sheet if it doesn't exist
function initializeSheet() {
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(["Family Name", "Email", "Password", "Child Name"]);
    }
    // ensure other sheets exist with headers
    if (!ss.getSheetByName(TASKS_SHEET)) {
        const s = ss.insertSheet(TASKS_SHEET);
        s.appendRow(["Family Name", "Id", "Title", "Description", "AssignedTo", "Points", "DueDate", "Status", "CreatedAt", "CompletedAt"]);
    }
    if (!ss.getSheetByName(MEMBERS_SHEET)) {
        const s = ss.insertSheet(MEMBERS_SHEET);
        s.appendRow(["Family Name", "Id", "Name", "MemberCode", "Points"]);
    }
    if (!ss.getSheetByName(REWARDS_SHEET)) {
        const s = ss.insertSheet(REWARDS_SHEET);
        s.appendRow(["Family Name", "Id", "Title", "Points", "Icon"]);
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
        } else if (data.action === "saveFamilyData") {
            return handleSaveFamilyData(data);
        } else if (data.action === "loadFamilyData") {
            return handleLoadFamilyData(data);
        } else if (data.action === "generateMemberCode") {
            return handleGenerateMemberCode(data);
        } else if (data.action === "getMemberByCode") {
            return handleGetMemberByCode(data);
        }
        
        return sendResponse(false, "Invalid action");
    } catch (error) {
        return sendResponse(false, "Error: " + error.message);
    }
}

// Generate unique member code
function generateUniqueMemberCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Handle member code generation
function handleGenerateMemberCode(data) {
    const { familyName } = data;
    if (!familyName) return sendResponse(false, "Missing familyName");
    
    // Generate unique code (check against existing codes)
    let code = generateUniqueMemberCode();
    let isUnique = false;
    const mSheet = ss.getSheetByName(MEMBERS_SHEET);
    const mRows = mSheet.getDataRange().getValues();
    
    while (!isUnique) {
        isUnique = true;
        for (let i = 1; i < mRows.length; i++) {
            if (mRows[i][0] === familyName && mRows[i][3] === code) {
                isUnique = false;
                code = generateUniqueMemberCode();
                break;
            }
        }
    }
    
    return sendResponse(true, "Generated member code", { memberCode: code });
}

// Handle member code login - find member by code and return their data
function handleGetMemberByCode(data) {
    const { memberCode } = data;
    if (!memberCode) return sendResponse(false, "Missing memberCode");
    
    const mSheet = ss.getSheetByName(MEMBERS_SHEET);
    const mRows = mSheet.getDataRange().getValues();
    
    // Search for member with this code
    for (let i = 1; i < mRows.length; i++) {
        if (mRows[i][3] === memberCode.toUpperCase()) {
            const familyName = mRows[i][0];
            const member = {
                id: mRows[i][1],
                name: mRows[i][2],
                memberCode: mRows[i][3],
                points: mRows[i][4] || 0
            };
            return sendResponse(true, "Member found", { familyName: familyName, member: member });
        }
    }
    
    return sendResponse(false, "Member code not found");
}


// Save family data (tasks, members, rewards)
function handleSaveFamilyData(data) {
    const { familyName, tasks, members, rewards } = data;
    if (!familyName) return sendResponse(false, "Missing familyName");

    // Save tasks
    const tSheet = ss.getSheetByName(TASKS_SHEET);
    // Delete all rows except header for this family
    const tValues = tSheet.getDataRange().getValues();
    for (let i = tValues.length - 1; i >= 1; i--) {
        if (tValues[i][0] === familyName) {
            tSheet.deleteRow(i + 1);
        }
    }
    // Append new tasks
    if (tasks && tasks.length) {
        for (let t of tasks) {
            tSheet.appendRow([familyName, t.id, t.title || '', t.description || '', t.assignedTo || '', t.points || 0, t.dueDate || '', t.status || 'pending', t.createdAt || '', t.completedAt || '']);
        }
    }

    // Save members
    const mSheet = ss.getSheetByName(MEMBERS_SHEET);
    // Delete all rows except header for this family
    const mValues = mSheet.getDataRange().getValues();
    for (let i = mValues.length - 1; i >= 1; i--) {
        if (mValues[i][0] === familyName) {
            mSheet.deleteRow(i + 1);
        }
    }
    // Append new members
    if (members && members.length) {
        for (let m of members) {
            mSheet.appendRow([familyName, m.id, m.name || '', m.memberCode || '', m.points || 0]);
        }
    }

    // Save rewards
    const rSheet = ss.getSheetByName(REWARDS_SHEET);
    // Delete all rows except header for this family
    const rValues = rSheet.getDataRange().getValues();
    for (let i = rValues.length - 1; i >= 1; i--) {
        if (rValues[i][0] === familyName) {
            rSheet.deleteRow(i + 1);
        }
    }
    // Append new rewards
    if (rewards && rewards.length) {
        for (let r of rewards) {
            rSheet.appendRow([familyName, r.id, r.title || '', r.points || 0, r.icon || '']);
        }
    }

    return sendResponse(true, "Saved family data");
}

// Load family data
function handleLoadFamilyData(data) {
    const { familyName } = data;
    if (!familyName) return sendResponse(false, "Missing familyName");

    const tSheet = ss.getSheetByName(TASKS_SHEET);
    const tRows = tSheet.getDataRange().getValues();
    const tasks = [];
    for (let i = 1; i < tRows.length; i++) {
        if (tRows[i][0] === familyName) {
            tasks.push({ id: Number(tRows[i][1]), title: tRows[i][2], description: tRows[i][3], assignedTo: tRows[i][4] ? Number(tRows[i][4]) : null, points: Number(tRows[i][5]) || 0, dueDate: tRows[i][6], status: tRows[i][7], createdAt: tRows[i][8], completedAt: tRows[i][9] });
        }
    }

    const mSheet = ss.getSheetByName(MEMBERS_SHEET);
    const mRows = mSheet.getDataRange().getValues();
    const members = [];
    for (let i = 1; i < mRows.length; i++) {
        if (mRows[i][0] === familyName) {
            members.push({ id: Number(mRows[i][1]), name: mRows[i][2], memberCode: mRows[i][3], points: Number(mRows[i][4]) || 0 });
        }
    }

    const rSheet = ss.getSheetByName(REWARDS_SHEET);
    const rRows = rSheet.getDataRange().getValues();
    const rewards = [];
    for (let i = 1; i < rRows.length; i++) {
        if (rRows[i][0] === familyName) {
            rewards.push({ id: Number(rRows[i][1]), title: rRows[i][2], points: Number(rRows[i][3]) || 0, icon: rRows[i][4] });
        }
    }

    return sendResponse(true, "Loaded family data", { tasks: tasks, members: members, rewards: rewards });
}

// Handle signup
function handleSignup(data) {
    const { role, familyName, email, password, childName } = data;
    
    // Check if email already exists (for parents)
    if (role === "parent") {
        const last = sheet.getLastRow();
        let emailExists = false;
        if (last > 1) {
            const emails = sheet.getRange(2, 2, last - 1, 1).getValues();
            emailExists = emails.some(row => row[0] === email);
        }
        if (emailExists) return sendResponse(false, "Email already registered");
    }
    
    // Add user to sheet
    sheet.appendRow([
        familyName || "",
        email || "",
        password, // Note: In production, hash the password!
        childName || ""
    ]);
    
    return sendResponse(true, "Signup successful", { userName: familyName || childName, familyName: familyName || "" });
}

// Handle login
function handleLogin(data) {
    const { role, familyName, email, childName, password } = data;
    const last = sheet.getLastRow();
    if (last <= 1) return sendResponse(false, "Invalid credentials");

    const values = sheet.getRange(2, 1, last - 1, 4).getValues();
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (role === "parent") {
            if (row[1] === email && row[2] === password) {
                return sendResponse(true, "Login successful", { userName: row[0], familyName: row[0] });
            }
        } else if (role === "child") {
            if (row[0] === familyName && row[3] === childName && row[2] === password) {
                return sendResponse(true, "Login successful", { userName: childName, familyName: row[0] });
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




