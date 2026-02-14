const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVI4reE9zZ8_jLOyh8OixIlX3g_Vzr7YjpSQubwNzYdJQ4LgmIsF5nPd35w1ReCB-f/exec";


// family name comes from login (stored as userName) or legacy parentName
let parentName = localStorage.getItem('userName') || localStorage.getItem('parentName') || '';
let userRole = localStorage.getItem('userRole') || '';
let familyMembers = JSON.parse(localStorage.getItem('familyMembers') || '[]');
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
let rewards = JSON.parse(localStorage.getItem('rewards') || '[{"id":1,"title":"Extra Screen Time","points":50,"icon":"⏰"},{"id":2,"title":"Movie Night Selection","points":100,"icon":"▶"},{"id":3,"title":"Choose Dinner","points":200,"icon":"🍕"}]');




function init() {
  if (!parentName) {
      document.getElementById('landingPage').classList.remove('hidden');
      document.getElementById('mainApp').classList.add('hidden');
  } else {
      document.getElementById('landingPage').classList.add('hidden');
      document.getElementById('mainApp').classList.remove('hidden');
      document.getElementById('parentName').textContent = parentName;
      document.getElementById('settingsParentName').value = parentName;
       // load family data from server then render
       loadFamilyFromServer(parentName).then(() => renderAll());
  }
}




function startApp(role) {
  if (!parentName) {
      const name = prompt('Please enter your family name:');
      if (!name) return;
      parentName = name;
      localStorage.setItem('parentName', parentName);
      // try saving to server if logged in
      if (localStorage.getItem('userEmail')) saveFamilyToServer();
  }
  userRole = role;
  localStorage.setItem('userRole', role);
  document.getElementById('landingPage').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('parentName').textContent = parentName;
  renderAll();
}




function saveData() {
  localStorage.setItem('parentName', parentName);
  localStorage.setItem('userName', parentName);
  localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('rewards', JSON.stringify(rewards));
  // persist to backend if we have a logged-in familyName
  if (parentName) {
      saveFamilyToServer();
  }
}


async function saveFamilyToServer() {
  try {
      const payload = { action: 'saveFamilyData', familyName: parentName, tasks: tasks, members: familyMembers, rewards: rewards };
      const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const j = await res.json();
      if (!j.success) console.warn('Save failed:', j.message);
  } catch (e) {
      console.error('Error saving to server', e);
  }
}


async function loadFamilyFromServer(familyName) {
  try {
      const payload = { action: 'loadFamilyData', familyName };
      const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const j = await res.json();
      if (j.success) {
          tasks = j.tasks || [];
          familyMembers = j.members || [];
          rewards = j.rewards && j.rewards.length ? j.rewards : rewards;
          // save to local cache
          localStorage.setItem('tasks', JSON.stringify(tasks));
          localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
          localStorage.setItem('rewards', JSON.stringify(rewards));
      } else {
          console.warn('Load family data failed:', j.message);
      }
  } catch (e) {
      console.error('Error loading family data', e);
  }
}




function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
   event.target.closest('.nav-item').classList.add('active');
  document.getElementById(tab + 'Tab').classList.remove('hidden');
   renderAll();
}




function getBadge(points) {
  if (points >= 300) return { name: 'Gold Champion', color: '#B8860B' };
  if (points >= 150) return { name: 'Silver Star', color: '#A8A8A8' };
  if (points >= 50) return { name: 'Bronze Helper', color: '#8B7355' };
  return null;
}




function renderDashboard() {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const overdueTasks = tasks.filter(t => t.status === 'pending' && t.dueDate && new Date(t.dueDate) < new Date());




  document.getElementById('statPending').textContent = pendingTasks.length;
  document.getElementById('statCompleted').textContent = completedTasks.length;
  document.getElementById('statOverdue').textContent = overdueTasks.length;
   const totalTasks = pendingTasks.length + overdueTasks.length;
  document.getElementById('welcomeMessage').textContent =
      `You have ${totalTasks} task${totalTasks !== 1 ? 's' : ''} waiting and ${familyMembers.length} family member${familyMembers.length !== 1 ? 's' : ''}`;




  const leaderboard = document.getElementById('leaderboard');
  if (familyMembers.length === 0) {
      leaderboard.innerHTML = '<div class="empty-state">No family members yet. Add children to see the leaderboard!</div>';
  } else {
      const sorted = [...familyMembers].sort((a, b) => b.points - a.points);
      leaderboard.innerHTML = sorted.map((member, i) => {
          const badge = getBadge(member.points);
          return `
              <div class="leaderboard-item ${i === 0 ? 'first' : 'other'}">
                  <div class="rank">${i + 1}</div>
                  <div class="member-info">
                      <div class="member-name">${member.name}</div>
                      ${badge ? `<div class="member-badge"><div class="badge-dot" style="background: ${badge.color}"></div>${badge.name}</div>` : ''}
                  </div>
                  <div class="points-display">
                      <div class="points-value">${member.points}</div>
                      <div class="points-label">points</div>
                  </div>
              </div>
          `;
      }).join('');
  }




  const recent = document.getElementById('recentTasks');
  if (tasks.length === 0) {
      recent.innerHTML = '<div class="empty-state">No tasks yet!</div>';
  } else {
      recent.innerHTML = tasks.slice(-5).reverse().map(task => {
          const member = familyMembers.find(m => m.id === task.assignedTo);
          return `
              <div class="task-item">
                  <div class="task-content">
                      <div class="task-header">
                          <h4 class="task-title">${task.title}</h4>
                          <span class="task-points">${task.points} pts</span>
                      </div>
                      <div class="task-meta">
                          ${member ? `<span>${member.memberCode} - ${member.name}</span>` : '<span>Unassigned</span>'}
                          <span>${task.status}</span>
                      </div>
                  </div>
              </div>
          `;
      }).join('');
  }
}




document.getElementById('taskForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const assignedTo = document.getElementById('taskAssignee').value;
  tasks.push({
      id: Date.now(),
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      assignedTo: assignedTo ? parseInt(assignedTo) : null,
      points: parseInt(document.getElementById('taskPoints').value) || 10,
      dueDate: document.getElementById('taskDueDate').value,
      status: 'pending',
      createdAt: new Date().toISOString()
  });
  saveData();
  this.reset();
  document.getElementById('taskPoints').value = '10';
  renderTasks();
  renderDashboard();
});




function completeTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      if (task.assignedTo) {
          const member = familyMembers.find(m => m.id === task.assignedTo);
          if (member) {
              member.points = (member.points || 0) + task.points;
          }
      }
      saveData();
      renderAll();
  }
}




function deleteTask(id) {
  if (confirm('Delete this task?')) {
      tasks = tasks.filter(t => t.id !== id);
      saveData();
      renderTasks();
      renderDashboard();
  }
}




function renderTasks() {
  const assigneeSelect = document.getElementById('taskAssignee');
  if (assigneeSelect) {
      assigneeSelect.innerHTML = '<option value="">Assign to...</option>' +
          familyMembers.map(m => `<option value="${m.id}">${m.memberCode} - ${m.name}</option>`).join('');
  }




  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');




  document.getElementById('pendingTasks').innerHTML = pending.length === 0
      ? '<div class="empty-state">All caught up!</div>'
      : pending.map(task => renderTaskItem(task)).join('');




  document.getElementById('completedTasks').innerHTML = completed.length === 0
      ? '<div class="empty-state">No completed tasks yet.</div>'
      : completed.map(task => renderTaskItem(task, true)).join('');
}




function renderTaskItem(task, isCompleted = false) {
  const member = task.assignedTo ? familyMembers.find(m => m.id === task.assignedTo) : null;
  return `
      <div class="task-item">
          <div class="task-checkbox ${isCompleted ? 'completed' : ''}" ${!isCompleted ? `onclick="completeTask(${task.id})"` : ''}></div>
          <div class="task-content">
              <div class="task-header">
                  <h4 class="task-title">${task.title}</h4>
                  <span class="task-points">${task.points} pts</span>
              </div>
              ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
              <div class="task-meta">
                  ${member ? `
                      <div class="task-assignee">
                          <div class="assignee-code">${member.memberCode}</div>
                          <span>${member.name}</span>
                      </div>
                  ` : '<span>Unassigned</span>'}
                  ${task.dueDate ? `<span>Due ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
              </div>
          </div>
          <div class="task-actions">
              <button class="btn-icon" onclick="deleteTask(${task.id})">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
              </button>
          </div>
      </div>
  `;
}




document.getElementById('rewardForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  rewards.push({
      id: Date.now(),
      title: document.getElementById('rewardTitle').value,
      points: parseInt(document.getElementById('rewardPoints').value) || 50,
      icon: document.getElementById('rewardIcon').value || '⭐'
  });
  saveData();
  this.reset();
  document.getElementById('rewardPoints').value = '50';
  document.getElementById('rewardIcon').value = '⭐';
  renderRewards();
});




function redeemReward(rewardId, memberId) {
  const reward = rewards.find(r => r.id === rewardId);
  const member = familyMembers.find(m => m.id === memberId);
  if (reward && member && member.points >= reward.points) {
      member.points -= reward.points;
      saveData();
      renderAll();
      alert(`${member.name} redeemed ${reward.title}!`);
  }
}




function deleteReward(id) {
  if (confirm('Delete this reward?')) {
      rewards = rewards.filter(r => r.id !== id);
      saveData();
      renderRewards();
  }
}




function renderRewards() {
  document.getElementById('rewardsList').innerHTML = rewards.map(reward => `
      <div class="reward-card">
          <button class="btn-icon btn-delete" onclick="deleteReward(${reward.id})">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
          </button>
          <div class="reward-icon">${reward.icon}</div>
          <h4 class="reward-title">${reward.title}</h4>
          <div class="reward-points">${reward.points} points</div>
          <select class="reward-select" onchange="if(this.value) {redeemReward(${reward.id}, parseInt(this.value)); this.value = '';}">
              <option value="">Redeem for...</option>
              ${familyMembers.filter(m => m.points >= reward.points).map(m =>
                  `<option value="${m.id}">${m.memberCode} - ${m.name} (${m.points} pts)</option>`
              ).join('')}
          </select>
      </div>
  `).join('');
}




document.getElementById('memberForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const memberName = document.getElementById('memberName').value;
  const memberCode = document.getElementById('memberCode').value;
 
  if (!memberCode) {
      alert('Please generate a member code first!');
      return;
  }
 
  familyMembers.push({
      id: Date.now(),
      name: memberName,
      memberCode: memberCode,
      points: 0
  });
  saveData();
  this.reset();
  document.getElementById('memberCode').value = '';
  renderAll();
});


async function generateMemberCode() {
  try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({
              action: 'generateMemberCode',
              familyName: parentName || localStorage.getItem('familyName')
          })
      });
     
      const result = await response.json();
      if (result.success) {
          document.getElementById('memberCode').value = result.memberCode;
      } else {
          alert('Failed to generate code');
      }
  } catch (error) {
      console.error('Error generating member code:', error);
      alert('Error generating code');
  }
}




function deleteMember(id) {
  if (confirm('Delete this member?')) {
      familyMembers = familyMembers.filter(m => m.id !== id);
      saveData();
      renderAll();
  }
}




function renderMembers() {
  document.getElementById('membersList').innerHTML = familyMembers.length === 0
      ? '<div class="empty-state">No family members yet.</div>'
      : familyMembers.map(member => {
          const badge = getBadge(member.points);
          const memberTasks = tasks.filter(t => t.assignedTo === member.id && t.status === 'completed');
          return `
              <div class="member-card">
                  <button class="btn-icon btn-delete" onclick="deleteMember(${member.id})">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                  </button>
                  <div class="member-header">
                      <div class="member-code">${member.memberCode}</div>
                      <div class="member-details">
                          <div class="member-name">${member.name}</div>
                          ${badge ? `<div class="member-badge"><div class="badge-dot" style="background: ${badge.color}"></div>${badge.name}</div>` : ''}
                      </div>
                  </div>
                  <div class="member-stats">
                      <div class="member-stat">
                          <div class="member-stat-value">${member.points}</div>
                          <div class="member-stat-label">Total Points</div>
                      </div>
                      <div class="member-stat">
                          <div class="member-stat-value">${memberTasks.length}</div>
                          <div class="member-stat-label">Tasks Done</div>
                      </div>
                  </div>
              </div>
          `;
      }).join('');
}




document.getElementById('settingsParentName')?.addEventListener('change', function() {
  parentName = this.value;
  document.getElementById('parentName').textContent = parentName;
  saveData();
});




function resetTasks() {
  if (confirm('Reset all tasks?')) {
      tasks = [];
      saveData();
      renderAll();
  }
}




function resetEverything() {
  if (confirm('Reset everything? This will delete all data.')) {
      localStorage.clear();
      location.reload();
  }
}




function renderAll() {
  renderDashboard();
  renderTasks();
  renderRewards();
  renderMembers();
}
init();











