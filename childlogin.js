const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVI4reE9zZ8_jLOyh8OixIlX3g_Vzr7YjpSQubwNzYdJQ4LgmIsF5nPd35w1ReCB-f/exec";
async function handleMemberCodeLogin(event) {
   event.preventDefault();
   const memberCode = document.getElementById('memberCode').value.trim().toUpperCase();
   const errorEl = document.getElementById('errorMessage');
   errorEl.textContent = '';
   if (!memberCode) {
       errorEl.textContent = 'Please enter your member code';
       return;
   }
   try {
   const response = await fetch(GOOGLE_SCRIPT_URL, {
   method: 'POST',
   body: JSON.stringify({
   action: 'getMemberByCode',
   memberCode: memberCode})
   });
   const result = await response.json();
      
   if (result.success && result.familyName && result.member) {
       localStorage.setItem('childMemberCode', memberCode);
       localStorage.setItem('childFamilyName', result.familyName);
       localStorage.setItem('childId', result.member.id);
       localStorage.setItem('childName', result.member.name);
window.location.href = 'child.html';
   } else {
       errorEl.textContent = 'Invalid member code. Please try again.';
   }
   } catch (err) {
       console.error('Login error:', err);
       errorEl.textContent = 'Connection error. Please try again.';
   }
}

