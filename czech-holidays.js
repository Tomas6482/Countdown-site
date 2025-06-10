// Script to add Czech holidays to Firestore
// Run this in your browser console while on your site to add all holidays

// Connect to Firestore
function addCzechHolidays() {
    // List of Czech holidays with dates for the current year
    const currentYear = new Date().getFullYear();
    
    const czechHolidays = [
        {
            name: "New Year's Day (Nový rok)",
            date: new Date(`${currentYear}-01-01T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Good Friday (Velký pátek)",
            date: calculateEaster(currentYear, -2),
            category: "holidays",
            repeat: "yearly",
            color: "#9b59b6"
        },
        {
            name: "Easter Monday (Velikonoční pondělí)",
            date: calculateEaster(currentYear, 1),
            category: "holidays",
            repeat: "yearly",
            color: "#9b59b6"
        },
        {
            name: "Labor Day (Svátek práce)",
            date: new Date(`${currentYear}-05-01T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Liberation Day (Den vítězství)",
            date: new Date(`${currentYear}-05-08T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Saints Cyril and Methodius Day (Den slovanských věrozvěstů Cyrila a Metoděje)",
            date: new Date(`${currentYear}-07-05T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#3498db"
        },
        {
            name: "Jan Hus Day (Den upálení mistra Jana Husa)",
            date: new Date(`${currentYear}-07-06T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#3498db"
        },
        {
            name: "Czech Statehood Day (Den české státnosti)",
            date: new Date(`${currentYear}-09-28T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Independence Day (Den vzniku samostatného československého státu)",
            date: new Date(`${currentYear}-10-28T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Freedom and Democracy Day (Den boje za svobodu a demokracii)",
            date: new Date(`${currentYear}-11-17T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#e74c3c"
        },
        {
            name: "Christmas Eve (Štědrý den)",
            date: new Date(`${currentYear}-12-24T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#2ecc71"
        },
        {
            name: "Christmas Day (1. svátek vánoční)",
            date: new Date(`${currentYear}-12-25T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#2ecc71"
        },
        {
            name: "St. Stephen's Day (2. svátek vánoční)",
            date: new Date(`${currentYear}-12-26T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#2ecc71"
        },
        {
            name: "Summer Holiday Start (Začátek letních prázdnin)",
            date: new Date(`${currentYear}-07-01T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#f39c12"
        },
        {
            name: "Summer Holiday End (Konec letních prázdnin)",
            date: new Date(`${currentYear}-08-31T00:00:00`),
            category: "holidays",
            repeat: "yearly",
            color: "#f39c12"
        }
    ];
    
    // Add each holiday to Firestore
    let addedCount = 0;
    let errorCount = 0;
    
    const addHoliday = (holiday, index) => {
        // Convert date to Firestore timestamp
        const firestoreDate = firebase.firestore.Timestamp.fromDate(holiday.date);
        
        // Add to Firestore
        return db.collection('countdowns').add({
            name: holiday.name,
            date: firestoreDate,
            category: holiday.category,
            repeat: holiday.repeat,
            color: holiday.color,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            console.log(`Added: ${holiday.name}`);
            addedCount++;
            
            // Process next holiday after a short delay to avoid overloading Firestore
            if (index < czechHolidays.length - 1) {
                setTimeout(() => {
                    addHoliday(czechHolidays[index + 1], index + 1);
                }, 500);
            } else {
                console.log(`Finished adding Czech holidays. Added: ${addedCount}, Errors: ${errorCount}`);
            }
        })
        .catch(error => {
            console.error(`Error adding ${holiday.name}:`, error);
            errorCount++;
            
            // Continue with next holiday even if there was an error
            if (index < czechHolidays.length - 1) {
                setTimeout(() => {
                    addHoliday(czechHolidays[index + 1], index + 1);
                }, 500);
            } else {
                console.log(`Finished adding Czech holidays. Added: ${addedCount}, Errors: ${errorCount}`);
            }
        });
    };
    
    // Start adding holidays
    if (czechHolidays.length > 0) {
        addHoliday(czechHolidays[0], 0);
    }
}

// Helper function to calculate Easter date
// offset: days from Easter Sunday (0 = Easter Sunday, 1 = Easter Monday, etc.)
function calculateEaster(year, offset = 0) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    // Create Easter date
    const easter = new Date(year, month - 1, day);
    
    // Add offset if needed
    if (offset !== 0) {
        easter.setDate(easter.getDate() + offset);
    }
    
    return easter;
}

// Function to run in browser console
console.log("Run addCzechHolidays() to add Czech holidays to your countdown database"); 