
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuiQcRJuIQJfkl2zdQs5-qD_fnI0wclrj2KaSyjPo7wPzbcY7dieT5HoCJVI9zB145Ww/exec";


// Parent Sign Up
async function handleSignup(event) {
   event.preventDefault();
  
   const familyName = document.getElementById("familyname").value;
   const email = document.getElementById("gmail").value;
   const password = document.getElementById("password").value;
   const confirmPassword = document.getElementById("confirmpassword").value;
  
   if (password !== confirmPassword) {
       alert("Passwords do not match!");
       return;
   }
  
   try {
       const response = await fetch(GOOGLE_SCRIPT_URL, {
           method: "POST",
           body: JSON.stringify({
               action: "signup",
               role: "parent",
               familyName: familyName,
               email: email,
               password: password
           })
       });
      
       const result = await response.json();
      
       if (result.success) {
           alert("Sign up successful! Please sign in.");
           window.location.href = "basigninparent.html";
       } else {
           alert(result.message || "Sign up failed!");
       }
   } catch (error) {
       console.error("Error:", error);
       alert("An error occurred. Please try again.");
   }
}


// Parent Sign In
async function handleLogin(event) {
   event.preventDefault();
  
   const username = document.getElementById("username").value;
   const password = document.getElementById("password").value;
  
   try {
       const response = await fetch(GOOGLE_SCRIPT_URL, {
           method: "POST",
           body: JSON.stringify({
               action: "login",
               role: "parent",
               email: username,
               password: password
           })
       });
      
       const result = await response.json();
      
       if (result.success) {
           // Store user session data
           localStorage.setItem("userEmail", username);
           localStorage.setItem("userName", result.userName);
           localStorage.setItem("userRole", "parent");
          
           alert("Login successful!");
           window.location.href = "parent.html";
       } else {
           alert(result.message || "Login failed!");
       }
   } catch (error) {
       console.error("Error:", error);
       alert("An error occurred. Please try again.");
   }
}


// Child Sign In
async function handleChildLogin(event) {
   event.preventDefault();
  
   const familyName = document.getElementById("familyname").value;
   const childName = document.getElementById("childname").value;
   const password = document.getElementById("password").value;
  
   try {
       const response = await fetch(GOOGLE_SCRIPT_URL, {
           method: "POST",
           body: JSON.stringify({
               action: "login",
               role: "child",
               familyName: familyName,
               childName: childName,
               password: password
           })
       });
      
       const result = await response.json();
      
       if (result.success) {
           // Store user session data
           localStorage.setItem("familyName", familyName);
           localStorage.setItem("childName", childName);
           localStorage.setItem("userRole", "child");
          
           alert("Login successful!");
           window.location.href = "aahome.html";
       } else {
           alert(result.message || "Login failed!");
       }
   } catch (error) {
       console.error("Error:", error);
       alert("An error occurred. Please try again.");
   }
}


// Check if user is logged in
function checkAuth() {
   const userEmail = localStorage.getItem("userEmail");
   if (!userEmail) {
       window.location.href = "basigninparent.html";
   }
}


// Logout function
function logout() {
   localStorage.clear();
   window.location.href = "basigninparent.html";
}


