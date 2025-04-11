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

function showConfirmationModal(username, userId, zoneId) {
  const modal = document.getElementById('confirmationModal');
  const formattedUsername = username.replace(/\+/g, ' ');
  
  document.getElementById('confirmModalImage').src = currentReward.imageUrl;
  document.getElementById('confirmUsername').textContent = formattedUsername;
  document.getElementById('confirmUserId').textContent = userId;
  document.getElementById('confirmZoneId').textContent = zoneId;
  
  modal.classList.add('active');
}

async function submitForm() {
  const messageElement = document.getElementById('formModalMessage');
  const spinner = document.getElementById('formSpinner');
  messageElement.textContent = "Validating...";
  spinner.classList.remove('hidden');
  messageElement.className = "";

  if (!currentReward.formFields || Object.keys(currentReward.formFields).length === 0) {
    messageElement.textContent = "Form configuration error.";
    messageElement.className = "error";
    spinner.classList.add('hidden');
    return;
  }

  try {
    const formValues = {};
    const fieldKeys = Object.keys(currentReward.formFields);
    
    let userId, zoneId;

    fieldKeys.forEach(key => {
      const input = document.getElementById(`form_${key}`);
      formValues[key] = input.value.trim();

      if (key.toLowerCase() === 'userid') userId = formValues[key];
      if (key.toLowerCase() === 'zoneid') zoneId = formValues[key];
    });

    const missingFields = fieldKeys
      .filter(key => currentReward.formFields[key].required)
      .filter(key => !formValues[key])
      .map(key => currentReward.formFields[key].label);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!userId || !zoneId) {
      throw new Error("User ID and Zone ID are required");
    }

    const mlbbUsername = await get_mlbb_username(userId, zoneId);

    if (mlbbUsername.startsWith("Error")) {
      throw new Error(mlbbUsername);
    }

    showConfirmationModal(
      mlbbUsername.replace(/\+/g, ' '),
      userId,
      zoneId
    );

  } catch (error) {
    messageElement.textContent = error.message;
    messageElement.className = "error";
  } finally {
    spinner.classList.add('hidden');
  }
}

async function confirmSubmission() {
  console.log("Confirm button clicked");
  const spinner = document.getElementById('confirmSpinner');
  const messageElement = document.getElementById('confirmationMessage');

  try {
    messageElement.textContent = `Preparing submission data...`;
    messageElement.className = "success";

    const formData = {
      reward: currentReward?.title || '',
      code: currentReward?.code || '',
      timestamp: new Date().toISOString(),
      username: document.getElementById('confirmUsername')?.textContent || '',
      userId: document.getElementById('confirmUserId')?.textContent || '',
      zoneId: document.getElementById('confirmZoneId')?.textContent || ''
    };

    const fieldKeys = Object.keys(currentReward?.formFields || {});
    fieldKeys.forEach(key => {
      const input = document.getElementById(`form_${key}`);
      if (input && input.value) {
        formData[key] = input.value.trim();
      }
    });

    console.log("Final formData:", formData);

    await addDoc(collection(db, "submissions"), formData);
    await incrementRedemptionCount();

    messageElement.textContent = "🎉 Success! You have submitted your request. Please wait for the hoster (Adeel Torres) message confirmation.";
    messageElement.className = "success";

    setTimeout(() => {
      console.log("Closing modals...");
      closeConfirmationModal();
      closeModal();
    }, 6000);

  } catch (error) {
    console.error("Submission error:", error);
    messageElement.textContent = `❌ Error: ${error.message}`;
    messageElement.className = "error";
  } finally {
    spinner.classList.add('hidden');
    console.log("Submission process completed");
  }
}

function closeConfirmationModal() {
  document.getElementById('confirmationModal').classList.remove('active');
}

async function get_mlbb_username(user_id, zone_id) {
  if (!user_id || !zone_id) {
    return "Error: UserID and ZoneID are required";
  }

  try {
    const response = await fetch('https://8jgdaj77-ajajga-production.up.railway.app/validate-mlbb', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user_id.toString(),
        zoneId: zone_id.toString(),
        voucherTypeName: "MOBILE_LEGENDS",
        deviceId: self.crypto.randomUUID(),
        country: "sg"
      })
    });

    const data = await response.json();
    const rawUsername = data.result?.username || "";
    const formattedUsername = rawUsername.replace(/\+/g, ' ').trim();
    
    return formattedUsername || "Error: Username not found";
    
  } catch (error) {
    return `Network Error: ${error.message}`;
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
  formContainer.innerHTML = '';

  const fieldKeys = Object.keys(currentReward.formFields);

  fieldKeys.forEach(key => {
    const field = currentReward.formFields[key];
    
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';

    const label = document.createElement('label');
    label.textContent = field.label;

    const input = document.createElement('input');
    input.type = field.type || 'text';
    input.placeholder = field.placeholder || field.label;
    input.required = field.required || false;
    input.id = `form_${key}`;

    fieldDiv.appendChild(label);
    fieldDiv.appendChild(input);
    formContainer.appendChild(fieldDiv);
  });

  document.getElementById('formModalTitle').textContent = currentReward.title;
  document.getElementById('formModalImage').src = currentReward.imageUrl;
  document.getElementById('redemptionKeyDisplay').value = currentReward.code;
  
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

// ================== Global Exports ================== //
window.checkCode = checkCode;
window.checkModalPassword = checkModalPassword;
window.submitForm = submitForm;
window.toggleSecret = toggleSecret;
window.closeModal = closeModal;
window.showRedemptionHelp = showRedemptionHelp;
window.closeConfirmationModal = closeConfirmationModal;
window.confirmSubmission = confirmSubmission;
