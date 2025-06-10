// DOM Elements
const countdownsContainer = document.getElementById('countdowns');
const adminPanel = document.getElementById('admin-panel');
const loginSection = document.getElementById('login-section');
const countdownManagement = document.getElementById('countdown-management');
const loginForm = document.getElementById('login-form');
const countdownForm = document.getElementById('countdown-form');
const adminCountdownList = document.getElementById('admin-countdown-list');
const firebaseIndicator = document.getElementById('firebase-indicator');
const firebaseStatusText = document.getElementById('firebase-status-text');
const logoutBtn = document.getElementById('logout-btn');

// Navigation buttons
const allBtn = document.getElementById('all-btn');
const holidaysBtn = document.getElementById('holidays-btn');
const gamesBtn = document.getElementById('games-btn');
const adminBtn = document.getElementById('admin-btn');

// Current filter
let currentFilter = 'all';
// Admin state
let isAdminLoggedIn = false;

// The admin password - change this to your desired password
const ADMIN_PASSWORD = "admin123";

// Firebase connection monitoring
function monitorFirebaseConnection() {
    // Get the Firestore database connection state
    const connectedRef = firebase.database().ref('.info/connected');
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            // Connected to Firebase
            firebaseIndicator.classList.add('connected');
            firebaseIndicator.classList.remove('disconnected');
            firebaseStatusText.textContent = 'Connected to Firebase';
        } else {
            // Not connected to Firebase
            firebaseIndicator.classList.remove('connected');
            firebaseIndicator.classList.add('disconnected');
            firebaseStatusText.textContent = 'Disconnected from Firebase';
        }
    });
}

// Set current date and time in the form
function setCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`;
    document.getElementById('event-date').value = dateTimeValue;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Monitor Firebase connection
    try {
        monitorFirebaseConnection();
    } catch (error) {
        console.error('Firebase Realtime Database not initialized:', error);
        firebaseIndicator.classList.add('disconnected');
        firebaseStatusText.textContent = 'Firebase connection issue';
    }
    
    // Set current date/time in form when admin panel is opened
    adminBtn.addEventListener('click', () => {
        setCurrentDateTime();
    });
    
    // Use the logout button from HTML instead of creating one in JS
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutAdmin);
    }
    
    // Check if there's a stored login state
    if(localStorage.getItem('isAdminLoggedIn') === 'true') {
        isAdminLoggedIn = true;
        loginSection.classList.add('hidden');
        countdownManagement.classList.remove('hidden');
        // Load admin countdowns
        loadAdminCountdowns();
    }
    
    // Load all countdowns by default
    loadCountdowns();
});

// Login form submission
loginForm.addEventListener('submit', e => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    
    if (password === ADMIN_PASSWORD) {
        // Set logged in state
        isAdminLoggedIn = true;
        localStorage.setItem('isAdminLoggedIn', 'true');
        
        // Show admin panel
        loginSection.classList.add('hidden');
        countdownManagement.classList.remove('hidden');
        
        // Set current date/time
        setCurrentDateTime();
        
        // Load admin countdowns
        loadAdminCountdowns();
        
        // Clear form
        loginForm.reset();
    } else {
        alert('Incorrect password');
    }
});

// Logout function
function logoutAdmin() {
    isAdminLoggedIn = false;
    localStorage.removeItem('isAdminLoggedIn');
    loginSection.classList.remove('hidden');
    countdownManagement.classList.add('hidden');
}

// Countdown form submission (add new countdown)
countdownForm.addEventListener('submit', e => {
    e.preventDefault();
    
    const eventName = document.getElementById('event-name').value;
    const eventDate = new Date(document.getElementById('event-date').value);
    const eventCategory = document.getElementById('event-category').value;
    const eventRepeat = document.getElementById('event-repeat').value;
    const eventColor = document.getElementById('event-color').value;
    
    // Add to Firestore
    db.collection('countdowns').add({
        name: eventName,
        date: firebase.firestore.Timestamp.fromDate(eventDate),
        category: eventCategory,
        repeat: eventRepeat,
        color: eventColor,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Clear form
        countdownForm.reset();
        document.getElementById('event-color').value = '#4287f5';
        // Reset the date/time to current
        setCurrentDateTime();
        alert('Countdown added successfully!');
        
        // Refresh admin countdown list
        loadAdminCountdowns();
    })
    .catch(error => {
        alert(`Error adding countdown: ${error.message}`);
    });
});

// Navigation handlers
allBtn.addEventListener('click', () => filterCountdowns('all'));
holidaysBtn.addEventListener('click', () => filterCountdowns('holidays'));
gamesBtn.addEventListener('click', () => filterCountdowns('games'));
adminBtn.addEventListener('click', toggleAdminPanel);

function filterCountdowns(category) {
    // Update active button
    [allBtn, holidaysBtn, gamesBtn].forEach(btn => {
        btn.classList.remove('active');
    });
    
    switch(category) {
        case 'holidays':
            holidaysBtn.classList.add('active');
            break;
        case 'games':
            gamesBtn.classList.add('active');
            break;
        default:
            allBtn.classList.add('active');
            break;
    }
    
    // Hide admin panel if visible
    adminPanel.classList.add('hidden');
    countdownsContainer.classList.remove('hidden');
    
    // Update current filter and load countdowns
    currentFilter = category;
    loadCountdowns();
}

function toggleAdminPanel() {
    // Update active button
    [allBtn, holidaysBtn, gamesBtn, adminBtn].forEach(btn => {
        btn.classList.remove('active');
    });
    adminBtn.classList.add('active');
    
    // Show admin panel and hide countdowns
    adminPanel.classList.remove('hidden');
    countdownsContainer.classList.add('hidden');
}

// Load countdowns from Firestore
function loadCountdowns() {
    // Clear current countdowns
    countdownsContainer.innerHTML = '<div class="loading">Loading countdowns...</div>';
    
    // Create and execute query
    let query = db.collection('countdowns');
    
    if (currentFilter !== 'all') {
        query = query.where('category', '==', currentFilter);
    }
    
    query.orderBy('date')
        .get()
        .then(querySnapshot => {
            // Remove loading message
            countdownsContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                countdownsContainer.innerHTML = '<div class="loading">No countdowns found.</div>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const countdown = doc.data();
                const countdownElement = createCountdownElement(doc.id, countdown);
                countdownsContainer.appendChild(countdownElement);
            });
            
            // Start countdown timers
            startCountdowns();
        })
        .catch(error => {
            countdownsContainer.innerHTML = `<div class="loading">Error loading countdowns: ${error.message}</div>`;
        });
}

// Load countdowns for admin panel
function loadAdminCountdowns() {
    // Clear current list
    adminCountdownList.innerHTML = '<li class="loading">Loading countdowns...</li>';
    
    db.collection('countdowns')
        .orderBy('date')
        .get()
        .then(querySnapshot => {
            // Remove loading message
            adminCountdownList.innerHTML = '';
            
            if (querySnapshot.empty) {
                adminCountdownList.innerHTML = '<li class="loading">No countdowns found.</li>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const countdown = doc.data();
                const listItem = document.createElement('li');
                listItem.className = 'admin-countdown-item';
                
                const dateString = countdown.date.toDate().toLocaleString();
                const categoryLabel = {
                    'holidays': 'Holiday',
                    'games': 'Game Event'
                }[countdown.category] || 'Other';
                
                const repeatLabel = {
                    'none': 'No repeat',
                    'daily': 'Daily',
                    'weekly': 'Weekly',
                    'monthly': 'Monthly',
                    'yearly': 'Yearly'
                }[countdown.repeat] || 'No repeat';
                
                listItem.innerHTML = `
                    <div class="countdown-details">
                        <h4>${countdown.name}</h4>
                        <p>Date: ${dateString}</p>
                        <p>Category: ${categoryLabel} | Repeat: ${repeatLabel}</p>
                    </div>
                    <div class="action-buttons">
                        <button class="edit-btn" data-id="${doc.id}">Edit</button>
                        <button class="delete-btn" data-id="${doc.id}">Delete</button>
                    </div>
                `;
                
                adminCountdownList.appendChild(listItem);
            });
            
            // Add event listeners for edit and delete buttons
            addAdminEventListeners();
        })
        .catch(error => {
            adminCountdownList.innerHTML = `<li class="loading">Error loading countdowns: ${error.message}</li>`;
        });
}

// Add event listeners to admin buttons
function addAdminEventListeners() {
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', e => {
            const id = e.target.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this countdown?')) {
                deleteCountdown(id);
            }
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', e => {
            const id = e.target.getAttribute('data-id');
            editCountdown(id);
        });
    });
}

// Delete countdown
function deleteCountdown(id) {
    db.collection('countdowns').doc(id).delete()
        .then(() => {
            alert('Countdown deleted successfully!');
            loadAdminCountdowns();
        })
        .catch(error => {
            alert(`Error deleting countdown: ${error.message}`);
        });
}

// Edit countdown (fetch data and populate form)
function editCountdown(id) {
    db.collection('countdowns').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // Populate form
                document.getElementById('event-name').value = data.name;
                
                // Format date for datetime-local input
                const dateObj = data.date.toDate();
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                document.getElementById('event-date').value = `${year}-${month}-${day}T${hours}:${minutes}`;
                
                document.getElementById('event-category').value = data.category;
                document.getElementById('event-repeat').value = data.repeat;
                document.getElementById('event-color').value = data.color || '#4287f5';
                
                // Change form submission to update instead of add
                countdownForm.removeEventListener('submit', countdownForm.onsubmit);
                countdownForm.onsubmit = (e) => {
                    e.preventDefault();
                    updateCountdown(id);
                };
                
                // Change button text
                document.querySelector('#countdown-form button[type="submit"]').textContent = 'Update Countdown';
            } else {
                alert('Countdown not found!');
            }
        })
        .catch(error => {
            alert(`Error loading countdown: ${error.message}`);
        });
}

// Update countdown
function updateCountdown(id) {
    const eventName = document.getElementById('event-name').value;
    const eventDate = new Date(document.getElementById('event-date').value);
    const eventCategory = document.getElementById('event-category').value;
    const eventRepeat = document.getElementById('event-repeat').value;
    const eventColor = document.getElementById('event-color').value;
    
    db.collection('countdowns').doc(id).update({
        name: eventName,
        date: firebase.firestore.Timestamp.fromDate(eventDate),
        category: eventCategory,
        repeat: eventRepeat,
        color: eventColor,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Reset form and button text
        countdownForm.reset();
        document.getElementById('event-color').value = '#4287f5';
        document.querySelector('#countdown-form button[type="submit"]').textContent = 'Add Countdown';
        
        // Reset form submission handler
        countdownForm.removeEventListener('submit', countdownForm.onsubmit);
        countdownForm.addEventListener('submit', e => {
            e.preventDefault();
            
            const eventName = document.getElementById('event-name').value;
            const eventDate = new Date(document.getElementById('event-date').value);
            const eventCategory = document.getElementById('event-category').value;
            const eventRepeat = document.getElementById('event-repeat').value;
            const eventColor = document.getElementById('event-color').value;
            
            // Add to Firestore
            db.collection('countdowns').add({
                name: eventName,
                date: firebase.firestore.Timestamp.fromDate(eventDate),
                category: eventCategory,
                repeat: eventRepeat,
                color: eventColor,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Clear form
                countdownForm.reset();
                document.getElementById('event-color').value = '#4287f5';
                alert('Countdown added successfully!');
                
                // Refresh admin countdown list
                loadAdminCountdowns();
            })
            .catch(error => {
                alert(`Error adding countdown: ${error.message}`);
            });
        });
        
        alert('Countdown updated successfully!');
        loadAdminCountdowns();
    })
    .catch(error => {
        alert(`Error updating countdown: ${error.message}`);
    });
}

// Create countdown element for display
function createCountdownElement(id, countdown) {
    const countdownCard = document.createElement('div');
    countdownCard.className = 'countdown-card';
    countdownCard.id = `countdown-${id}`;
    
    if (countdown.color) {
        countdownCard.style.setProperty('--primary-color', countdown.color);
        countdownCard.querySelector(':before')?.style.setProperty('background-color', countdown.color);
    }
    
    const dateObj = countdown.date.toDate();
    const dateString = dateObj.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const categoryLabel = {
        'holidays': 'Holiday',
        'games': 'Game Event'
    }[countdown.category] || 'Event';
    
    const repeatLabel = {
        'none': '',
        'daily': 'Repeats Daily',
        'weekly': 'Repeats Weekly',
        'monthly': 'Repeats Monthly',
        'yearly': 'Repeats Yearly'
    }[countdown.repeat] || '';
    
    countdownCard.innerHTML = `
        <span class="countdown-category">${categoryLabel}</span>
        <h2 class="countdown-title">${countdown.name}</h2>
        <div class="countdown-timer" data-target="${dateObj.getTime()}" data-repeat="${countdown.repeat}">
            <div class="countdown-segment">
                <span class="number" id="days-${id}">--</span>
                <span class="label">Days</span>
            </div>
            <div class="countdown-segment">
                <span class="number" id="hours-${id}">--</span>
                <span class="label">Hours</span>
            </div>
            <div class="countdown-segment">
                <span class="number" id="minutes-${id}">--</span>
                <span class="label">Minutes</span>
            </div>
            <div class="countdown-segment">
                <span class="number" id="seconds-${id}">--</span>
                <span class="label">Seconds</span>
            </div>
        </div>
        <div class="countdown-date">${dateString}</div>
        ${repeatLabel ? `<div class="countdown-recurring">${repeatLabel}</div>` : ''}
    `;
    
    return countdownCard;
}

// Start all countdown timers
function startCountdowns() {
    const countdownTimers = document.querySelectorAll('.countdown-timer');
    
    countdownTimers.forEach(timer => {
        const id = timer.closest('.countdown-card').id.replace('countdown-', '');
        const targetDate = parseInt(timer.getAttribute('data-target'));
        const repeatType = timer.getAttribute('data-repeat');
        
        const daysElement = document.getElementById(`days-${id}`);
        const hoursElement = document.getElementById(`hours-${id}`);
        const minutesElement = document.getElementById(`minutes-${id}`);
        const secondsElement = document.getElementById(`seconds-${id}`);
        
        updateCountdown();
        
        // Update every second
        const interval = setInterval(updateCountdown, 1000);
        
        function updateCountdown() {
            const currentDate = new Date().getTime();
            let targetDateTime = new Date(targetDate);
            
            // Handle repeating events
            if (repeatType !== 'none' && currentDate > targetDate) {
                const originalDate = new Date(targetDate);
                
                switch(repeatType) {
                    case 'daily':
                        // Next occurrence today or tomorrow
                        targetDateTime = new Date();
                        targetDateTime.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), 0);
                        if (targetDateTime.getTime() < currentDate) {
                            targetDateTime.setDate(targetDateTime.getDate() + 1);
                        }
                        break;
                    
                    case 'weekly':
                        // Next occurrence this week or next week on the same day
                        targetDateTime = new Date();
                        targetDateTime.setDate(targetDateTime.getDate() + (originalDate.getDay() + 7 - targetDateTime.getDay()) % 7);
                        targetDateTime.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), 0);
                        if (targetDateTime.getTime() < currentDate) {
                            targetDateTime.setDate(targetDateTime.getDate() + 7);
                        }
                        break;
                    
                    case 'monthly':
                        // Next occurrence this month or next month on the same day
                        targetDateTime = new Date();
                        targetDateTime.setDate(Math.min(originalDate.getDate(), getDaysInMonth(targetDateTime.getMonth(), targetDateTime.getFullYear())));
                        targetDateTime.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), 0);
                        if (targetDateTime.getTime() < currentDate) {
                            targetDateTime.setMonth(targetDateTime.getMonth() + 1);
                            targetDateTime.setDate(Math.min(originalDate.getDate(), getDaysInMonth(targetDateTime.getMonth(), targetDateTime.getFullYear())));
                        }
                        break;
                    
                    case 'yearly':
                        // Next occurrence this year or next year on the same month and day
                        targetDateTime = new Date();
                        targetDateTime.setMonth(originalDate.getMonth());
                        targetDateTime.setDate(Math.min(originalDate.getDate(), getDaysInMonth(originalDate.getMonth(), targetDateTime.getFullYear())));
                        targetDateTime.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), 0);
                        if (targetDateTime.getTime() < currentDate) {
                            targetDateTime.setFullYear(targetDateTime.getFullYear() + 1);
                        }
                        break;
                }
            }
            
            const timeRemaining = targetDateTime.getTime() - currentDate;
            
            if (timeRemaining <= 0) {
                if (repeatType === 'none') {
                    clearInterval(interval);
                    daysElement.textContent = '0';
                    hoursElement.textContent = '0';
                    minutesElement.textContent = '0';
                    secondsElement.textContent = '0';
                    
                    timer.closest('.countdown-card').classList.add('expired');
                    return;
                } else {
                    // Recalculate for repeating events
                    updateCountdown();
                    return;
                }
            }
            
            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
            
            daysElement.textContent = days;
            hoursElement.textContent = hours < 10 ? `0${hours}` : hours;
            minutesElement.textContent = minutes < 10 ? `0${minutes}` : minutes;
            secondsElement.textContent = seconds < 10 ? `0${seconds}` : seconds;
        }
    });
}

// Helper function to get days in a month
function getDaysInMonth(month, year) {
    return new Date(year, month + 1, 0).getDate();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load all countdowns by default
    loadCountdowns();
}); 