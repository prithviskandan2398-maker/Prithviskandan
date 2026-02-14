const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVI4reE9zZ8_jLOyh8OixIlX3g_Vzr7YjpSQubwNzYdJQ4LgmIsF5nPd35w1ReCB-f/exec";
let currentChild = null;
let currentFamilyName = null;
let familyMembers = [];
let tasks = [];
let rewards = [];


function init() {
  const childCode = localStorage.getItem('childMemberCode');
  const familyName = localStorage.getItem('childFamilyName');
  if (!childCode || !familyName) {
      alert('Please log in first');
      window.location.href = 'dasigninchild.html';
      return;
  }
  currentFamilyName = familyName;
  loadChildData();
}


async function loadChildData() {
  if (!currentFamilyName) return;
  try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
              action: 'loadFamilyData',
              familyName: currentFamilyName
          })
      });
     
       const result = await response.json();
     
   if (result.success) {
       familyMembers = result.members || [];
       tasks = result.tasks || [];
       rewards = result.rewards || [];
       const childCode = localStorage.getItem('childMemberCode');
       currentChild = familyMembers.find(m => m.memberCode === childCode);
         
   if (currentChild) {
       setupUI();
       renderAll();
   } else {
       alert('Member not found');
       window.location.href = 'dasigninchild.html';
   }
      }
   } catch (err) {
       console.error('Error loading family data:', err);
   }
}


function setupUI() {
   if (!currentChild) return;
document.getElementById('childName').textContent = currentChild.name + "'s Tasks";
document.getElementById('userName').textContent = currentChild.name;
document.getElementById('userPoints').textContent = currentChild.points + ' points';
document.getElementById('userAvatar').textContent = currentChild.name.charAt(0).toUpperCase();
document.getElementById('pointsDisplay').textContent = currentChild.points;
document.getElementById('pointsDisplayRewards').textContent = currentChild.points;
}


function switchTab(tab) {
document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
event.target.closest('.nav-item').classList.add('active');
document.getElementById(tab + 'Tab').classList.remove('hidden');
}


function getBadge(points) {
if (points >= 300) return { name: 'Gold Champion', color: '#B8860B' };
if (points >= 150) return { name: 'Silver Star', color: '#A8A8A8' };
if (points >= 50) return { name: 'Bronze Helper', color: '#8B7355' };
return null;
}


async function completeTask(taskId) {
const task = tasks.find(t => t.id === taskId);
if (!task || task.status !== 'pending') return;
   task.status = 'completed';
   task.completedAt = new Date().toISOString();
currentChild.points += task.points;
   const memberIndex = familyMembers.findIndex(m => m.memberCode === currentChild.memberCode);
if (memberIndex !== -1) {
   familyMembers[memberIndex] = currentChild;
}


try {
await fetch(GOOGLE_SCRIPT_URL, {
   method: 'POST',
   body: JSON.stringify({
   action: 'saveFamilyData',
   familyName: currentFamilyName,
   members: familyMembers,
   tasks: tasks,
   rewards: rewards
   })
});
     
   alert(`Great job! You earned ${task.points} points!`);
   renderAll();
   } catch (err) {
   console.error('Error saving task:', err);
   alert('Error saving task. Please try again.');
  }
}


async function redeemReward(rewardId) {
   const reward = rewards.find(r => r.id === rewardId);
   if (!reward || currentChild.points < reward.points) return;
   if (!confirm(`Redeem ${reward.title} for ${reward.points} points?`)) return;
   currentChild.points -= reward.points;
   const memberIndex = familyMembers.findIndex(m => m.memberCode === currentChild.memberCode);
   if (memberIndex !== -1) {
      familyMembers[memberIndex] = currentChild;
   }
   try {
       await fetch(GOOGLE_SCRIPT_URL, {
           method: 'POST',
           body: JSON.stringify({
           action: 'saveFamilyData',
           familyName: currentFamilyName,
           members: familyMembers,
           tasks: tasks,
           rewards: rewards
          })
      });
   alert(`Success! You've redeemed ${reward.title}!`);
   renderAll();
} catch (err) {
   console.error('Error redeeming reward:', err);
   alert('Error redeeming reward. Please try again.');
  }
}


function renderAll() {
  renderTasks();
  renderRewards();
  renderStats();
}


function renderStats() {
   const myTasks = tasks.filter(t => t.assignedTo === currentChild.id && t.status === 'pending');
   document.getElementById('taskStats').textContent =
       myTasks.length === 0
           ? 'All tasks completed! Great job!'
           : `You have ${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} to complete`;
 
  const badge = getBadge(currentChild.points);
  const badgeDisplay = document.getElementById('badgeDisplay');
  badgeDisplay.innerHTML = '';
  if (badge) {
       badgeDisplay.innerHTML = `
           <div class="badge-display">
               <div class="badge-dot" style="background: ${badge.color}"></div>
               <span class="badge-name">${badge.name}</span>
           </div>`;
   }
}


function renderTasks() {
   const myPending = tasks.filter(t => t.assignedTo === currentChild.id && t.status === 'pending');
   const myAwaitingApproval = tasks.filter(t => t.assignedTo === currentChild.id && t.status === 'awaiting-approval');
   const myCompleted = tasks.filter(t => t.assignedTo === currentChild.id && t.status === 'completed');
   const myTasksContainer = document.getElementById('myTasks');
   myTasksContainer.innerHTML = ''; // Clear first
   let tasksHTML = '';
   if (myAwaitingApproval.length > 0) {
       tasksHTML += myAwaitingApproval.map(task => `
           <div class="task-item" style="background: #FFF8DC; border-color: #F0E68C;">
           <div class="task-checkbox" style="background: #FFD700; border-color: #FFD700; cursor: default;">
               <span style="color: white; font-size: 12px;">⏳</span>
           </div>
           <div class="task-content">
           <div class="task-header">
               <h4 class="task-title">${task.title}</h4>
               <span class="task-points" style="background: #F0E68C; color: #8B7500;">+${task.points} pts</span>
           </div>
       ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
           <div class="task-meta">
           <span style="color: #8B7500;">⏳ Waiting for parent approval</span>
           </div>
           </div>
           </div>`).join('');
   }
   if (myPending.length > 0) {
       tasksHTML += myPending.map(task => `
           <div class="task-item">
               <div class="task-checkbox" onclick="completeTask(${task.id})"></div>
               <div class="task-content">
               <div class="task-header">
               <h4 class="task-title">${task.title}</h4>
               <span class="task-points">+${task.points} pts</span>
               </div>
       ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
               <div class="task-meta">
       ${task.dueDate ? `<span>Due ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
               </div>
               </div>
               </div>`).join('');
  }
 
   if (tasksHTML === '') {
       myTasksContainer.innerHTML = '<div class="empty-state">No tasks assigned yet. Check back later!</div>';
   } else {
       myTasksContainer.innerHTML = tasksHTML;
   }
const completedContainer = document.getElementById('completedTasks');
   completedContainer.innerHTML = ''; // Clear first
   if (myCompleted.length === 0) {
       completedContainer.innerHTML = '<div class="empty-state">No completed tasks yet. Start completing to earn points!</div>';
   } else {
       completedContainer.innerHTML = myCompleted.slice(-5).reverse().map(task => `
           <div class="task-item">
               <div class="task-checkbox completed"></div>
               <div class="task-content">
               <div class="task-header">
                   <h4 class="task-title">${task.title}</h4>
                   <span class="task-points">+${task.points} pts</span>
               </div>
               <div class="task-meta">
                   <span>Completed ${new Date(task.completedAt).toLocaleDateString()}</span>
               </div>
              </div>
          </div>`).join('');
  }
}


function renderRewards() {
  const rewardsList = document.getElementById('rewardsList');
  rewardsList.innerHTML = '';
  if (rewards.length === 0) {
      rewardsList.innerHTML = '<div class="empty-state">No rewards available yet.</div>';
  } else {
      rewardsList.innerHTML = rewards.map(reward => {
          const canAfford = currentChild.points >= reward.points;
          const needed = reward.points - currentChild.points;
          return `
               <div class="reward-card ${!canAfford ? 'locked' : ''}">
                   ${!canAfford ? `
                       <svg class="lock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                       </svg>` : ''}
                   <div class="reward-icon">${reward.icon}</div>
                   <h4 class="reward-title">${reward.title}</h4>
                   <div class="reward-points">${reward.points} points</div>
                   <button
                       class="btn-redeem"
                       onclick="redeemReward(${reward.id})"
                       ${!canAfford ? 'disabled' : ''}
                   >
                       ${canAfford ? 'Redeem Now' : `Need ${needed} more pts`}
                   </button>
               </div>`;
}).join('');
  }
}


setInterval(() => {
   if (currentFamilyName) {
       loadChildData();
   }
}, 3000);


init();

