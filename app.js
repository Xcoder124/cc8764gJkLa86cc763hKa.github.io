import { db } from './firebase-config.js';
import {
  collection, query, where, getDocs,
  addDoc, updateDoc, doc, increment
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

let currentReward = null;

// ================== Firebase Functions ================== //
async function checkCode() {
  const code = document.getElementById('codeInput').value.trim();
  const messageElement = document.getElementById('message');
  const spinner = document.getElementById('checkSpinner');

  if (!code) {
    messageElement.textContent = "Please enter a redemption code!";
    messageElement.className = "error";
    return;
  }

  messageElement.textContent = "Checking code...";
  spinner.classList.remove('hidden');

  try {
    const q = query(collection(db, "rewards"), where("code", "==", code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      messageElement.textContent = "Invalid redemption code!";
      messageElement.className = "error";
      return;
    }

    const docSnapshot = querySnapshot.docs[0];
    currentReward = {
      id: docSnapshot.id,
      ...docSnapshot.data(),
      redemptionCount: docSnapshot.data().redemptionCount || 0
    };

    if (currentReward.maxRedemptions > 0 &&
      currentReward.redemptionCount >= currentReward.maxRedemptions) {
      messageElement.textContent = "This code has reached its redemption limit!";
      messageElement.className = "error";
      return;
    }

    // Code valid — show modal
    messageElement.textContent = "";
    if (currentReward.type === 'form') {
      showFormModal();
    } else {
      showPasswordModal();
    }

  } catch (error) {
    console.error("Error checking code:", error);
    messageElement.textContent = `Error verifying code: ${error.message || error}`;
    messageElement.className = "error";
  } finally {
    spinner.classList.add('hidden');
  }
}

async function incrementRedemptionCount(messageElement = null) {
  try {
    const rewardRef = doc(db, "rewards", currentReward.id);
    await updateDoc(rewardRef, { redemptionCount: increment(1) });
  } catch (error) {
    console.error("Error incrementing redemption count:", error);
    if (messageElement) {
      messageElement.textContent = `Error: ${error.message || error}`;
      messageElement.className = "error";
    }
  }
}

async function submitForm() {
  const messageElement = document.getElementById('formModalMessage');
  const spinner = document.getElementById('formSpinner');
  messageElement.textContent = "Submitting...";
  spinner.classList.remove('hidden');
  messageElement.className = "";

  if (!currentReward.formFields || currentReward.formFields.length === 0) {
    messageElement.textContent = "Form fields not defined.";
    messageElement.className = "error";
    spinner.classList.add('hidden');
    return;
  }

  let allValid = true;
  currentReward.formFields.forEach(field => {
    const input = document.getElementById(`form_${field.replace(/\s+/g, '_')}`);
    if (!input.value.trim()) allValid = false;
  });

  if (!allValid) {
    messageElement.textContent = "Please fill all required fields!";
    messageElement.className = "error";
    spinner.classList.add('hidden');
    return;
  }

  const formData = {
    reward: currentReward.title,
    code: currentReward.code,
    timestamp: new Date().toISOString()
  };

  currentReward.formFields.forEach(field => {
    formData[field] = document.getElementById(`form_${field.replace(/\s+/g, '_')}`).value.trim();
  });

  try {
    await addDoc(collection(db, "submissions"), formData);
    await incrementRedemptionCount();
    messageElement.textContent = "Form submitted successfully! Your reward will be processed shortly.";
    messageElement.className = "success";
  } catch (error) {
    console.error("Error submitting form:", error);
    messageElement.textContent = `Error: ${error.message || error}`;
    messageElement.className = "error";
  } finally {
    spinner.classList.add('hidden');
  }
}

// ================== UI Functions ================== //
function showPasswordModal() {
  const modal = document.getElementById('passwordModal');
  document.getElementById('modalTitle').textContent = currentReward.title;
  document.getElementById('modalImage').src = currentReward.imageUrl;
  document.getElementById('modalInstructions').textContent = currentReward.instructions || "Enter the password to claim your reward:";
  document.getElementById('modalPasswordInput').placeholder = currentReward.passwordHint || "Password";
  modal.classList.add('active');
}

function showFormModal() {
  const modal = document.getElementById('formModal');
  const formContainer = document.getElementById('formFieldsContainer');

  document.getElementById('formModalTitle').textContent = currentReward.title;
  document.getElementById('formModalImage').src = currentReward.imageUrl;
  document.getElementById('formModalInstructions').textContent = currentReward.instructions || "Please fill out the form to claim your reward:";
  document.getElementById('redemptionKeyDisplay').value = currentReward.code;

  formContainer.innerHTML = '';
  currentReward.formFields.forEach(field => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';

    const label = document.createElement('label');
    label.textContent = field;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = field;
    input.id = `form_${field.replace(/\s+/g, '_')}`;

    fieldDiv.appendChild(label);
    fieldDiv.appendChild(input);
    formContainer.appendChild(fieldDiv);
  });

  modal.classList.add('active');
}

async function checkModalPassword() {
  const password = document.getElementById('modalPasswordInput').value;
  const messageElement = document.getElementById('modalMessage');
  const spinner = document.getElementById('passwordSpinner');

  spinner.classList.remove('hidden');
  messageElement.textContent = "";

  if (password === currentReward.password) {
    try {
      await incrementRedemptionCount();
      document.getElementById('secretMessage').setAttribute('data-real', currentReward.secretMessage);
      document.getElementById('secretContainer').classList.remove('hidden');
      messageElement.textContent = "Redemption success!";
      messageElement.className = "success";
    } catch (error) {
      messageElement.textContent = `There was an error: ${error.message || error}`;
      messageElement.className = "error";
    }
  } else {
    messageElement.textContent = "Incorrect password! Try again.";
    messageElement.className = "error";
  }

  spinner.classList.add('hidden');
}

function showRedemptionHelp() {
  const modal = document.getElementById('helpModal');
  document.getElementById('helpModalImage').src = currentReward.imageUrl;
  modal.classList.add('active');
}

function toggleSecret() {
  const secretElement = document.getElementById('secretMessage');
  const realMessage = secretElement.getAttribute('data-real');

  if (secretElement.hasAttribute('data-visible')) {
    secretElement.textContent = '••••••••••••••••';
    secretElement.removeAttribute('data-visible');
  } else {
    secretElement.textContent = realMessage;
    secretElement.setAttribute('data-visible', 'true');
  }
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));

  const secretElement = document.getElementById('secretMessage');
  if (secretElement) {
    secretElement.textContent = '••••••••••••••••';
    secretElement.removeAttribute('data-visible');
  }

  document.getElementById('modalMessage').textContent = '';
  document.getElementById('formModalMessage').textContent = '';
}

// ================== Event Listeners ================== //
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
});

document.getElementById('codeInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') checkCode();
});

document.getElementById('modalPasswordInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') checkModalPassword();
});

// Attach functions globally
window.checkCode = checkCode;
window.checkModalPassword = checkModalPassword;
window.submitForm = submitForm;
window.toggleSecret = toggleSecret;
window.closeModal = closeModal;
window.showRedemptionHelp = showRedemptionHelp;
