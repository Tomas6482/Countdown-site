# Countdown Hub

A fully-featured countdown website for tracking holidays, game events, and more. Built with HTML, CSS, and JavaScript.

## Features

- Beautiful, responsive UI with countdown cards
- Filter countdowns by category (Holidays, Game Events)
- Admin panel to add, edit, and delete countdowns
- Support for recurring events (daily, weekly, monthly, yearly)
- Simple password protection for admin access
- Data stored in Firebase Firestore database

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" and follow the setup steps
3. Once your project is created, click on "Web" to add a web app to your project
4. Register your app with a nickname (e.g., "Countdown Hub")
5. Copy the Firebase configuration object - you'll need this in step 3

### 2. Configure Firestore Database

1. In your Firebase Console, go to "Firestore Database" in the left sidebar
2. Click "Create database" 
3. Start in production mode (or test mode if you're just experimenting)
4. Choose a location closest to you
5. Set up basic security rules (you can update these later)

### 3. Configure Your App

1. Open the `firebase-config.js` file
2. Replace the placeholder values with your actual Firebase project details:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

### 4. Set Admin Password

1. Open the `app.js` file
2. Locate the `ADMIN_PASSWORD` constant near the top of the file
3. Change the default password ("admin123") to your desired admin password:
   ```javascript
   const ADMIN_PASSWORD = "your-secure-password";
   ```

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push your code to the repository
3. Go to repository Settings > Pages
4. Select the main branch as the source and click Save
5. Your site will be published at `https://yourusername.github.io/repositoryname/`

## Usage

### Public View

- The main page displays all countdowns with their remaining time
- Use the navigation buttons to filter countdowns by category
- Each countdown shows days, hours, minutes, and seconds remaining

### Admin Panel

1. Click the "Admin" button in the navigation
2. Enter the admin password you configured in step 4
3. Add new countdowns with the form at the top
4. Edit or delete existing countdowns from the list below
5. Click the "Logout" button when you're done

## What Firebase Does for Your Site

Firebase provides several key features for this countdown site:

1. **Firestore Database**: Stores all your countdown events securely in the cloud
2. **Real-time Updates**: Changes to countdowns can be reflected immediately across all devices
3. **Cloud Hosting**: Easy deployment with Firebase Hosting (alternative to GitHub Pages)
4. **Offline Capabilities**: The site can work even when users are temporarily offline
5. **Scalability**: Handles any number of users or countdown events with ease

## Customization

- Edit `styles.css` to change colors, fonts, and layout
- Modify `index.html` to add new sections or features
- Update `app.js` to change functionality or add new features

## License

This project is open source and available under the MIT License. 