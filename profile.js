// ══════════════════════════════════════════════════
//  USER PROFILE
// ══════════════════════════════════════════════════
let userProfile = {
  name: localStorage.getItem('userName') || 'User',
  email: localStorage.getItem('userEmail') || 'user@example.com',
  createdDate: localStorage.getItem('userCreatedDate') || new Date().toLocaleDateString('en-IN'),
  photo: localStorage.getItem('userPhoto') || null
};

function saveUserProfile(name, email, photo = null) {
  userProfile.name = name;
  userProfile.email = email;
  localStorage.setItem('userName', name);
  localStorage.setItem('userEmail', email);
  if (photo !== null) {
    userProfile.photo = photo;
    localStorage.setItem('userPhoto', photo);
  }
  if (!localStorage.getItem('userCreatedDate')) {
    userProfile.createdDate = new Date().toLocaleDateString('en-IN');
    localStorage.setItem('userCreatedDate', userProfile.createdDate);
  }
}

function toggleProfileEdit(isEdit) {
  const viewMode = document.getElementById('profileView');
  const editMode = document.getElementById('profileEditForm');
  const editBtn = document.getElementById('editBtn');
  const doneBtn = document.getElementById('doneBtn');
  const viewFooter = document.getElementById('profileFooter');
  const editFooter = document.getElementById('profileEditFooter');

  if (isEdit) {
    viewMode.classList.add('hidden');
    editMode.classList.add('active');
    editBtn.style.display = 'none';
    doneBtn.style.display = 'inline-flex';
    viewFooter.style.display = 'none';
    editFooter.style.display = 'flex';

    // Populate edit fields
    document.getElementById('editNameInput').value = userProfile.name;
    document.getElementById('editEmailInput').value = userProfile.email;
    
    // Show photo preview
    if (userProfile.photo) {
      document.getElementById('photoPreview').src = userProfile.photo;
    }
  } else {
    viewMode.classList.remove('hidden');
    editMode.classList.remove('active');
    editBtn.style.display = 'inline-flex';
    doneBtn.style.display = 'none';
    viewFooter.style.display = 'flex';
    editFooter.style.display = 'none';
  }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const photoData = e.target.result;
    document.getElementById('photoPreview').src = photoData;
    // Store temporarily, will be saved when user clicks Save Changes
  };
  reader.readAsDataURL(file);
}

function saveProfileChanges() {
  const newName = document.getElementById('editNameInput').value.trim();
  const newEmail = document.getElementById('editEmailInput').value.trim();
  const photoData = document.getElementById('photoPreview').src;

  if (!newName) {
    alert('Please enter your name');
    return;
  }

  if (!newEmail || !newEmail.includes('@')) {
    alert('Please enter a valid email');
    return;
  }

  // Save profile with new photo
  saveUserProfile(newName, newEmail, photoData);

  // Update display and close edit mode
  showUserProfile();
  toggleProfileEdit(false);
  toast('✓ Profile updated successfully!');
}

function showUserProfile() {
  // Update profile display
  const initial = (userProfile.name || 'U')[0].toUpperCase();
  
  // Set avatar
  const avatarEl = document.getElementById('profileAvatar');
  if (userProfile.photo) {
    avatarEl.innerHTML = `<img src="${userProfile.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    avatarEl.innerHTML = initial;
  }

  document.getElementById('profileName').textContent = userProfile.name || 'User';
  document.getElementById('profileEmail').textContent = userProfile.email || 'user@example.com';
  document.getElementById('profileDate').textContent = 'Created: ' + userProfile.createdDate;

  // Update stats
  document.getElementById('statSSLC').textContent = state.sslc.length || '0';
  document.getElementById('statDiploma').textContent = state.diploma.length || '0';
  document.getElementById('statEngineering').textContent = state.engineering.length || '0';

  // Show modal
  document.getElementById('profileOverlay').classList.add('open');
}

function closeProfileModal(event) {
  if (event && event.target.id !== 'profileOverlay') return;
  document.getElementById('profileOverlay').classList.remove('open');
  // Reset edit mode when closing
  if (document.getElementById('profileEditForm').classList.contains('active')) {
    toggleProfileEdit(false);
  }
}

document.getElementById('profileOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeProfileModal(e);
});

