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

// Default password (only used if Firebase fetch fails)
const DEFAULT_PASSWORD = "admin123";
let adminPassword = DEFAULT_PASSWORD;

// Generate a time-based authentication code
function generateAuthCode() {
    // Get current date/time
    const now = new Date();
    
    // Use the current date as seed for the auth code
    // This will change every minute
    const seed = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}`;
    
    // Create a simple hash of the seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to a 6-digit positive number
    const authCode = Math.abs(hash % 1000000).toString().padStart(6, '0');
    
    return authCode;
}

// Store the current auth code in Firebase
function updateAuthCode() {
    const authCode = generateAuthCode();
    return db.collection('admin').doc('auth').set({
        code: authCode,
        expires: firebase.firestore.Timestamp.fromDate(
            new Date(Math.ceil(Date.now() / 60000) * 60000) // Next minute
        )
    })
    .then(() => {
        console.log('Auth code updated in Firebase');
        return authCode;
    })
    .catch(error => {
        console.error('Error updating auth code:', error);
        return null;
    });
}

// Get the current auth code from Firebase
function getAuthCode() {
    return db.collection('admin').doc('auth').get()
        .then(doc => {
            if (doc.exists && doc.data().code) {
                // Check if the code is still valid
                const expires = doc.data().expires.toDate();
                if (expires > new Date()) {
                    return doc.data().code;
                }
            }
            
            // If no valid code exists, generate a new one
            return updateAuthCode();
        })
        .catch(error => {
            console.error('Error fetching auth code:', error);
            return null;
        });
}

// Start the auth code update interval
let authCodeInterval = null;

function startAuthCodeUpdates() {
    // Update auth code immediately
    updateAuthCode();
    
    // Calculate time until the next minute
    const now = new Date();
    const nextMinute = new Date(Math.ceil(now.getTime() / 60000) * 60000);
    const timeUntilNextMinute = nextMinute - now;
    
    // Schedule first update at the next minute
    setTimeout(() => {
        updateAuthCode();
        
        // Then update every minute
        authCodeInterval = setInterval(updateAuthCode, 60000);
    }, timeUntilNextMinute);
}

// Fetch the admin password from Firebase
function fetchAdminPassword() {
    return db.collection('admin').doc('settings').get()
        .then(doc => {
            if (doc.exists && doc.data().password) {
                adminPassword = doc.data().password;
                console.log('Admin password loaded from Firebase');
                return true;
            } else {
                // If no password is set in Firebase, create one with the default
                return db.collection('admin').doc('settings').set({
                    password: DEFAULT_PASSWORD
                })
                .then(() => {
                    console.log('Default admin password saved to Firebase');
                    return true;
                })
                .catch(error => {
                    console.error('Error setting default password:', error);
                    return false;
                });
            }
        })
        .catch(error => {
            console.error('Error fetching admin password:', error);
            return false;
        });
}

// Simple connection status update using Firestore
// (fallback if Realtime Database isn't set up yet)
function updateConnectionStatus() {
    db.collection('system').doc('status').set({
        lastCheck: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        firebaseIndicator.classList.add('connected');
        firebaseIndicator.classList.remove('disconnected');
        firebaseStatusText.textContent = 'Connected to Firebase';
    })
    .catch(() => {
        firebaseIndicator.classList.remove('connected');
        firebaseIndicator.classList.add('disconnected');
        firebaseStatusText.textContent = 'Disconnected from Firebase';
    });
}

// Firebase connection monitoring
function monitorFirebaseConnection() {
    try {
        // Try using Realtime Database if available
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
    } catch (error) {
        console.error('Firebase Realtime Database not initialized:', error);
        // Fall back to Firestore for connection status
        updateConnectionStatus();
        // Set interval to check connection periodically
        setInterval(updateConnectionStatus, 30000);
    }
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
    monitorFirebaseConnection();
    
    // Fetch admin password from Firebase
    fetchAdminPassword();
    
    // Start auth code updates
    startAuthCodeUpdates();
    
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
    const authCode = document.getElementById('auth-code').value;
    
    // Verify both password and auth code
    Promise.all([fetchAdminPassword(), getAuthCode()])
        .then(([passwordSuccess, currentAuthCode]) => {
            if (password === adminPassword && authCode === currentAuthCode) {
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
            } else if (password !== adminPassword) {
                alert('Incorrect password');
            } else {
                alert('Incorrect authentication code');
            }
        })
        .catch(error => {
            console.error('Login verification error:', error);
            alert('Error during login. Please try again.');
        });
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
    
    console.log('Loading countdowns with filter:', currentFilter);
    
    // Create and execute query
    let query = db.collection('countdowns');
    
    if (currentFilter !== 'all') {
        query = query.where('category', '==', currentFilter);
    }
    
    // We still need to get the data sorted by date initially from Firestore
    query.orderBy('date')
        .get()
        .then(querySnapshot => {
            // Remove loading message
            countdownsContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                countdownsContainer.innerHTML = '<div class="loading">No countdowns found.</div>';
                console.log('No countdowns found');
                return;
            }

            console.log('Found', querySnapshot.size, 'countdowns');

            // Collect all countdowns with their calculated time remaining
            const countdownsWithTimeRemaining = [];
            const currentDate = new Date().getTime();
            
            querySnapshot.forEach(doc => {
                const countdown = doc.data();
                console.log('Processing countdown:', countdown.name, 'Category:', countdown.category);
                
                let targetDateTime = countdown.date.toDate();
                const repeatType = countdown.repeat || 'none';
                
                // Handle repeating events
                if (repeatType !== 'none' && currentDate > targetDateTime.getTime()) {
                    const originalDate = new Date(targetDateTime);
                    
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
                
                // Calculate time remaining
                const timeRemaining = targetDateTime.getTime() - currentDate;
                
                countdownsWithTimeRemaining.push({
                    id: doc.id,
                    countdown: countdown,
                    timeRemaining: timeRemaining > 0 ? timeRemaining : Infinity // Put expired non-repeating events at the end
                });
            });
            
            console.log('Before sorting:', countdownsWithTimeRemaining.map(item => ({
                name: item.countdown.name, 
                timeRemaining: Math.floor(item.timeRemaining / (1000 * 60 * 60 * 24)) + ' days'
            })));
            
            // Sort by time remaining (ascending - less time at the top)
            countdownsWithTimeRemaining.sort((a, b) => a.timeRemaining - b.timeRemaining);
            
            console.log('After sorting:', countdownsWithTimeRemaining.map(item => ({
                name: item.countdown.name, 
                timeRemaining: Math.floor(item.timeRemaining / (1000 * 60 * 60 * 24)) + ' days'
            })));
            
            // Create and append countdown elements in the new sorted order
            countdownsWithTimeRemaining.forEach(item => {
                const countdownElement = createCountdownElement(item.id, item.countdown);
                countdownsContainer.appendChild(countdownElement);
            });
            
            // Start countdown timers
            startCountdowns();
        })
        .catch(error => {
            console.error('Error loading countdowns:', error);
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

            // Collect all countdowns with their calculated time remaining
            const countdownsWithTimeRemaining = [];
            const currentDate = new Date().getTime();
            
            querySnapshot.forEach(doc => {
                const countdown = doc.data();
                let targetDateTime = countdown.date.toDate();
                const repeatType = countdown.repeat || 'none';
                
                // Handle repeating events
                if (repeatType !== 'none' && currentDate > targetDateTime.getTime()) {
                    const originalDate = new Date(targetDateTime);
                    
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
                
                // Calculate time remaining
                const timeRemaining = targetDateTime.getTime() - currentDate;
                
                countdownsWithTimeRemaining.push({
                    id: doc.id,
                    countdown: countdown,
                    timeRemaining: timeRemaining > 0 ? timeRemaining : Infinity // Put expired non-repeating events at the end
                });
            });
            
            // Sort by time remaining (ascending - less time at the top)
            countdownsWithTimeRemaining.sort((a, b) => a.timeRemaining - b.timeRemaining);
            
            // Create and append countdown elements in the new sorted order
            countdownsWithTimeRemaining.forEach(item => {
                const countdown = item.countdown;
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

                // Calculate time remaining in days for display
                const daysRemaining = Math.floor(item.timeRemaining / (1000 * 60 * 60 * 24));
                const timeRemainingDisplay = item.timeRemaining < Infinity 
                    ? `Time remaining: ${daysRemaining} days`
                    : 'Event has passed';
                
                listItem.innerHTML = `
                    <div class="countdown-details">
                        <h4>${countdown.name}</h4>
                        <p>Date: ${dateString}</p>
                        <p>Category: ${categoryLabel} | Repeat: ${repeatLabel}</p>
                        <p class="time-remaining">${timeRemainingDisplay}</p>
                    </div>
                    <div class="action-buttons">
                        <button class="edit-btn" data-id="${item.id}">Edit</button>
                        <button class="delete-btn" data-id="${item.id}">Delete</button>
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
    
    // Get the actual target date (adjusted for repeating events)
    const currentDate = new Date().getTime();
    let targetDateTime = new Date(dateObj);
    const repeatType = countdown.repeat || 'none';
    
    // Handle repeating events - calculate the next occurrence
    if (repeatType !== 'none' && currentDate > targetDateTime.getTime()) {
        const originalDate = new Date(targetDateTime);
        
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
    
    // Check if date is during summer break (July 1 - August 31)
    const month = targetDateTime.getMonth(); // 0-indexed (6 = July, 7 = August)
    const day = targetDateTime.getDate();
    const isSummerBreak = (month === 6 || month === 7) || (month === 5 && day >= 24); // July, August, or after June 23
    
    countdownCard.innerHTML = `
        <span class="countdown-category">${categoryLabel}</span>
        <h2 class="countdown-title">${countdown.name}</h2>
        <div class="countdown-timer" data-target="${targetDateTime.getTime()}" data-repeat="${countdown.repeat}">
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
        <div class="countdown-date">${targetDateTime.toLocaleString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</div>
        ${repeatLabel ? `<div class="countdown-recurring">${repeatLabel}</div>` : ''}
        ${!isSummerBreak ? `
        <button class="school-info-toggle">Show School Days</button>
        <div class="school-info-panel hidden">
            <div class="school-info-item">
                <h3>School Days Left</h3>
                <div class="school-days-count" id="school-days-${id}">Calculating...</div>
                <div class="school-info-desc">Only counting Mon-Fri</div>
            </div>
            <div class="school-info-item">
                <h3>Days Until End of School</h3>
                <div class="end-of-school-count" id="end-school-${id}">Calculating...</div>
                <div class="school-info-desc">Until June 23rd</div>
            </div>
        </div>
        ` : ''}
    `;
    
    // Add click event to the toggle button if it exists
    setTimeout(() => {
        const toggleButton = countdownCard.querySelector('.school-info-toggle');
        if (!toggleButton) return; // Skip if button doesn't exist (summer break)
        
        const infoPanel = countdownCard.querySelector('.school-info-panel');
        
        if (toggleButton && infoPanel) {
            toggleButton.addEventListener('click', () => {
                infoPanel.classList.toggle('hidden');
                const isHidden = infoPanel.classList.contains('hidden');
                toggleButton.textContent = isHidden ? 'Show School Days' : 'Hide School Days';
                
                // Toggle expanded class for browsers that don't support :has()
                if (isHidden) {
                    countdownCard.classList.remove('expanded');
                } else {
                    countdownCard.classList.add('expanded');
                    calculateSchoolDays(id, targetDateTime);
                }
            });
        }
    }, 0);
    
    return countdownCard;
}

// Calculate school days
function calculateSchoolDays(id, targetDate) {
    const schoolDaysElement = document.getElementById(`school-days-${id}`);
    const endSchoolElement = document.getElementById(`end-school-${id}`);
    
    if (!schoolDaysElement || !endSchoolElement) return;
    
    // Get current date and check if it's past 12:30 PM
    const now = new Date();
    const isPastSchoolDay = now.getHours() > 12 || (now.getHours() === 12 && now.getMinutes() >= 30);
    
    // Start counting from today or tomorrow based on time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If it's past 12:30 PM, start counting from tomorrow
    const startDate = new Date(today);
    if (isPastSchoolDay) {
        startDate.setDate(startDate.getDate() + 1);
    }
    
    // Calculate school days (Monday-Friday) until the target date
    let schoolDays = 0;
    const tempDate = new Date(startDate);
    
    // Check if the target date is before June 24th of the same year as the target date
    const targetYear = targetDate.getFullYear();
    const endOfSchoolDate = new Date(targetYear, 5, 23, 23, 59, 59, 999); // June 23rd
    
    // Only calculate school days if the target date is before the end of school in that year
    // or if we're currently before the end of school in the current year
    if (targetDate <= endOfSchoolDate || today <= endOfSchoolDate) {
        while (tempDate <= targetDate) {
            // Check if the date is within summer break (July 1 - August 31)
            const month = tempDate.getMonth(); // 0-indexed (6 = July, 7 = August)
            const day = tempDate.getDate();
            
            // Skip any dates from previous summer (if applicable)
            const isInSummerBreak = (month === 6 || month === 7) || // July or August
                                   (month === 5 && day > 23);  // After June 23rd
            
            const dayOfWeek = tempDate.getDay();
            // Only count weekdays (Mon-Fri) and not during summer break
            if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isInSummerBreak) {
                schoolDays++;
            }
            
            tempDate.setDate(tempDate.getDate() + 1);
        }
    }
    
    // Calculate days until end of school (June 23rd of current or next year)
    const currentYear = today.getFullYear();
    let currentEndOfSchoolDate = new Date(currentYear, 5, 23); // June 23rd (month is 0-indexed)
    currentEndOfSchoolDate.setHours(23, 59, 59, 999); // Set to end of day
    
    // If we've passed this year's end date, use next year's
    if (today > currentEndOfSchoolDate) {
        currentEndOfSchoolDate = new Date(currentYear + 1, 5, 23);
        currentEndOfSchoolDate.setHours(23, 59, 59, 999);
    }
    
    const endOfSchoolDays = Math.ceil((currentEndOfSchoolDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Calculate school days until end of school
    let schoolDaysUntilEnd = 0;
    const tempEndDate = new Date(startDate);
    
    while (tempEndDate <= currentEndOfSchoolDate) {
        const dayOfWeek = tempEndDate.getDay();
        // Only count weekdays (Mon-Fri)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Skip any dates that are in summer break from previous years
            const month = tempEndDate.getMonth();
            const day = tempEndDate.getDate();
            const isInSummerBreak = (month === 6 || month === 7); // July or August
            
            if (!isInSummerBreak) {
                schoolDaysUntilEnd++;
            }
        }
        
        tempEndDate.setDate(tempEndDate.getDate() + 1);
    }
    
    // Update the elements
    schoolDaysElement.textContent = schoolDays;
    endSchoolElement.innerHTML = `${endOfSchoolDays} days<br><span class="school-days-subset">(${schoolDaysUntilEnd} school days)</span>`;
    
    // Add a note about today if it's past 12:30
    let noteText = 'Only counting Mon-Fri';
    if (isPastSchoolDay) {
        noteText = `<span class="today-note">(Today not counted - past 12:30)</span>`;
    }
    
    // Add note about summer break
    const schoolInfoDesc = schoolDaysElement.closest('.school-info-item').querySelector('.school-info-desc');
    if (schoolInfoDesc) {
        schoolInfoDesc.innerHTML = noteText;
    }
    
    // Add note about summer break to the End of School section
    const endSchoolDesc = endSchoolElement.closest('.school-info-item').querySelector('.school-info-desc');
    if (endSchoolDesc) {
        endSchoolDesc.innerHTML = 'Until June 23rd<br><span class="note">(Summer break: Jul 1 - Aug 31)</span>';
    }
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