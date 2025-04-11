import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

let currentReward = null;
const adminEmail = "huhhello80@gmail.com"; // Replace with your admin email

// ================== Firebase Functions ================== //
async function checkCode() {
    const code = document.getElementById('codeInput').value.trim();
    const messageElement = document.getElementById('message');

    if (!code) {
        messageElement.textContent = "Please enter a redemption code!";
        messageElement.className = "error";
        return;
    }

    messageElement.textContent = "Checking code...";
    messageElement.className = "";

    try {
        const q = query(collection(db, "rewards"), where("code", "==", code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            messageElement.textContent = "Invalid redemption code!";
            messageElement.className = "error";
            return;
        }

        querySnapshot.forEach((doc) => {
            currentReward = doc.data();
            messageElement.textContent = "";
            messageElement.className = "";

            if (currentReward.type === "password") {
                showPasswordModal();
            } else if (currentReward.type === "form") {
                showFormModal();
            }
        });
    } catch (error) {
        console.error("Error getting document:", error);
        messageElement.textContent = "An error occurred. Please try again.";
        messageElement.className = "error";
    }
}

async function submitForm() {
    const messageElement = document.getElementById('formModalMessage');
    messageElement.textContent = "Submitting...";
    messageElement.className = "";
    
    const formData = {
        reward: currentReward.title,
        code: currentReward.code,
        timestamp: new Date().toISOString()
    };
    
    currentReward.formFields.forEach(field => {
        const fieldId = `form_${field.replace(/\s+/g, '_')}`;
        formData[field] = document.getElementById(fieldId).value;
    });
    
    try {
        await addDoc(collection(db, "submissions"), formData);
        messageElement.textContent = "Form submitted successfully! Your reward will be processed shortly.";
        messageElement.className = "success";
    } catch (error) {
        console.error("Error submitting form:", error);
        messageElement.textContent = "Error submitting form. Please try again.";
        messageElement.className = "error";
    }
}

// ================== UI Functions (No Changes Needed) ================== //
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

function checkModalPassword() {
    const password = document.getElementById('modalPasswordInput').value;
    const messageElement = document.getElementById('modalMessage');

    if (password === currentReward.password) {
        document.getElementById('secretMessage').setAttribute('data-real', currentReward.secretMessage);
        document.getElementById('secretContainer').classList.remove('hidden');
        messageElement.textContent = "Password correct! Your reward is below.";
        messageElement.className = "success";
    } else {
        messageElement.textContent = "Incorrect password! Try again.";
        messageElement.className = "error";
    }
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
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('formModal').classList.remove('active');
    
    const secretElement = document.getElementById('secretMessage');
    if (secretElement) {
        secretElement.textContent = '••••••••••••••••';
        secretElement.removeAttribute('data-visible');
    }
    
    document.getElementById('modalMessage').textContent = '';
    document.getElementById('formModalMessage').textContent = '';
}

// ================== Event Listeners (No Changes Needed) ================== //
document.getElementById('codeInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkCode();
    }
});

document.getElementById('modalPasswordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkModalPassword();
    }
});
