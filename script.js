// Import Firebase modules
import { db, storage } from './firebaseconfig.js';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    limit,
    setDoc,
    serverTimestamp,
    increment
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';

// Global Application State
window.appState = {
    currentUser: null,
    isAdmin: false,
    currentDate: new Date(),
    votingActive: false,
    menuItems: {
        breakfast: [],
        lunch: [],
        dinner: []
    },
    votes: {},
    votingResults: {},
    users: [],
    weeklyMenus: {},
    complaints: [],
    settings: {
        votingStartTime: '00:00',
        votingEndTime: '12:00',
        menuCycleDays: 7
    }
};

// Utility Functions
const utils = {
    // Date formatting
    formatDate: (date) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    },

    // Time formatting
    formatTime: (date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    },

    // Get current day of week (0-6, Sunday is 0)
    getCurrentDayIndex: () => {
        return new Date().getDay();
    },

    // Get menu cycle day (0-6 for 7-day cycle)
    getMenuCycleDay: () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const diffTime = today - startOfWeek;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays % window.appState.settings.menuCycleDays;
    },

    // Check if voting is currently active
    isVotingActive: () => {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const startTime = window.appState.settings.votingStartTime.split(':');
        const endTime = window.appState.settings.votingEndTime.split(':');
        
        const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
        const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
        
        return currentTime >= startMinutes && currentTime <= endMinutes;
    },

    // Calculate time remaining for voting
    getTimeRemaining: () => {
        const now = new Date();
        const endTime = window.appState.settings.votingEndTime.split(':');
        const endDate = new Date();
        endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0, 0);
        
        if (now > endDate) {
            return { hours: 0, minutes: 0, seconds: 0 };
        }
        
        const diff = endDate - now;
        return {
            hours: Math.floor(diff / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Show toast notification
    showToast: (message, type = 'info', duration = 3000) => {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${iconMap[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;

        toastContainer.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    },

    // Validate student ID format
    validateStudentId: (id) => {
        return /^[0-9]{1,10}$/.test(id);
    },

    // Sanitize input
    sanitizeInput: (input) => {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
};

// Authentication Functions
const auth = {
    // Student login
    loginStudent: async (name, studentId) => {
        try {
            if (!name.trim() || !studentId.trim()) {
                throw new Error('Please fill in all fields');
            }

            if (!utils.validateStudentId(studentId)) {
                throw new Error('Student ID must be 1-10 digits only');
            }

            // Check if student exists in registered users
            const userRef = doc(db, 'users', studentId);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error('Student ID not found. Please contact admin to register first.');
            }

            // Verify the name matches (case-insensitive)
            const userData = userDoc.data();
            if (userData.name.toLowerCase() !== name.trim().toLowerCase()) {
                throw new Error('Name does not match registered student ID');
            }

            // Update last login
            await updateDoc(userRef, {
                lastLogin: serverTimestamp()
            });

            window.appState.currentUser = {
                name: userData.name,
                studentId: studentId
            };

            localStorage.setItem('hostelMenuUser', JSON.stringify(window.appState.currentUser));
            utils.showToast('Login successful!', 'success');
            
            return true;
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.message || error.toString() || 'Login failed. Please try again.';
            utils.showToast(errorMessage, 'error');
            return false;
        }
    },

    // Admin login
    loginAdmin: async (username, password) => {
        try {
            // Simple admin authentication - in production, use proper authentication
            const adminUsername = 'admin';
            const adminPassword = 'admin123';

            if (username === adminUsername && password === adminPassword) {
                window.appState.isAdmin = true;
                localStorage.setItem('hostelMenuAdmin', 'true');
                utils.showToast('Admin login successful!', 'success');
                return true;
            } else {
                throw new Error('Invalid admin credentials');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            utils.showToast(error.message, 'error');
            return false;
        }
    },

    // Logout
    logout: () => {
        window.appState.currentUser = null;
        window.appState.isAdmin = false;
        localStorage.removeItem('hostelMenuUser');
        localStorage.removeItem('hostelMenuAdmin');
        location.reload();
    },

    // Check stored auth
    checkStoredAuth: () => {
        const storedUser = localStorage.getItem('hostelMenuUser');
        const storedAdmin = localStorage.getItem('hostelMenuAdmin');

        if (storedUser) {
            window.appState.currentUser = JSON.parse(storedUser);
            return 'student';
        } else if (storedAdmin) {
            window.appState.isAdmin = true;
            return 'admin';
        }

        return null;
    }
};

// Database Functions
const database = {
    // Load menu items
    loadMenuItems: async () => {
        try {
            const menuQuery = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(menuQuery);
            
            const menuItems = { breakfast: [], lunch: [], dinner: [] };
            
            snapshot.forEach(doc => {
                const item = { id: doc.id, ...doc.data() };
                if (menuItems[item.mealType]) {
                    menuItems[item.mealType].push(item);
                }
            });

            window.appState.menuItems = menuItems;
            return menuItems;
        } catch (error) {
            console.error('Error loading menu items:', error);
            utils.showToast('Failed to load menu items', 'error');
            return { breakfast: [], lunch: [], dinner: [] };
        }
    },

    // Add menu item
    addMenuItem: async (itemData, imageFile) => {
        try {
            let imageUrl = null;

            if (imageFile) {
                const imageRef = storageRef(storage, `menu-images/${utils.generateId()}_${imageFile.name}`);
                const uploadResult = await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(uploadResult.ref);
            }

            const docRef = await addDoc(collection(db, 'menuItems'), {
                name: utils.sanitizeInput(itemData.name),
                mealType: itemData.mealType,
                description: utils.sanitizeInput(itemData.description || ''),
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
                isActive: true
            });

            utils.showToast('Menu item added successfully!', 'success');
            return docRef.id;
        } catch (error) {
            console.error('Error adding menu item:', error);
            utils.showToast('Failed to add menu item', 'error');
            throw error;
        }
    },

    // Update menu item
    updateMenuItem: async (itemId, updates) => {
        try {
            const itemRef = doc(db, 'menuItems', itemId);
            await updateDoc(itemRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });

            utils.showToast('Menu item updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating menu item:', error);
            utils.showToast('Failed to update menu item', 'error');
            throw error;
        }
    },

    // Delete menu item
    deleteMenuItem: async (itemId, imageUrl) => {
        try {
            // Delete from Firestore
            await deleteDoc(doc(db, 'menuItems', itemId));

            // Delete image from Storage if exists
            if (imageUrl) {
                try {
                    const imageRef = storageRef(storage, imageUrl);
                    await deleteObject(imageRef);
                } catch (storageError) {
                    console.warn('Failed to delete image:', storageError);
                }
            }

            utils.showToast('Menu item deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting menu item:', error);
            utils.showToast('Failed to delete menu item', 'error');
            throw error;
        }
    },

    // Submit vote
    submitVote: async (mealType, itemId, studentId) => {
        try {
            const today = utils.formatDate(new Date()).replace(/,/g, '');
            const voteId = `${studentId}_${today}_${mealType}`;

            await setDoc(doc(db, 'votes', voteId), {
                studentId: studentId,
                mealType: mealType,
                itemId: itemId,
                date: today,
                timestamp: serverTimestamp()
            });

            // Update user total votes
            const userRef = doc(db, 'users', studentId);
            await updateDoc(userRef, {
                totalVotes: increment(1),
                lastVote: serverTimestamp()
            });

            // Update item vote count
            if (itemId !== 'skip') {
                const itemRef = doc(db, 'menuItems', itemId);
                await updateDoc(itemRef, {
                    voteCount: increment(1)
                });
            }

            utils.showToast(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} vote submitted!`, 'success');
        } catch (error) {
            console.error('Error submitting vote:', error);
            utils.showToast('Failed to submit vote', 'error');
            throw error;
        }
    },

    // Load voting results
    loadVotingResults: async (date = null) => {
        try {
            const targetDate = date || utils.formatDate(new Date()).replace(/,/g, '');
            const votesQuery = query(
                collection(db, 'votes'),
                where('date', '==', targetDate)
            );

            const snapshot = await getDocs(votesQuery);
            const results = {
                breakfast: {},
                lunch: {},
                dinner: {}
            };

            snapshot.forEach(doc => {
                const vote = doc.data();
                if (!results[vote.mealType][vote.itemId]) {
                    results[vote.mealType][vote.itemId] = 0;
                }
                results[vote.mealType][vote.itemId]++;
            });

            window.appState.votingResults = results;
            return results;
        } catch (error) {
            console.error('Error loading voting results:', error);
            utils.showToast('Failed to load voting results', 'error');
            return { breakfast: {}, lunch: {}, dinner: {} };
        }
    },

    // Load user votes for today
    loadUserVotes: async (studentId) => {
        try {
            const today = utils.formatDate(new Date()).replace(/,/g, '');
            const votesQuery = query(
                collection(db, 'votes'),
                where('studentId', '==', studentId),
                where('date', '==', today)
            );

            const snapshot = await getDocs(votesQuery);
            const userVotes = {};

            snapshot.forEach(doc => {
                const vote = doc.data();
                userVotes[vote.mealType] = vote.itemId;
            });

            window.appState.votes = userVotes;
            return userVotes;
        } catch (error) {
            console.error('Error loading user votes:', error);
            return {};
        }
    },

    // Load all users
    loadUsers: async () => {
        try {
            const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(usersQuery);
            
            const users = [];
            snapshot.forEach(doc => {
                users.push({ id: doc.id, ...doc.data() });
            });

            window.appState.users = users;
            return users;
        } catch (error) {
            console.error('Error loading users:', error);
            utils.showToast('Failed to load users', 'error');
            return [];
        }
    },

    // Add user (admin function)
    addUser: async (name, studentId) => {
        try {
            if (!name.trim() || !studentId.trim()) {
                throw new Error('Please fill in all fields');
            }

            if (!utils.validateStudentId(studentId)) {
                throw new Error('Student ID must be 1-10 digits only');
            }

            // Check if user already exists
            const userRef = doc(db, 'users', studentId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                throw new Error('Student ID already exists');
            }

            await setDoc(userRef, {
                name: utils.sanitizeInput(name),
                studentId: studentId,
                createdAt: serverTimestamp(),
                totalVotes: 0
            });

            utils.showToast('Student added successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error adding user:', error);
            utils.showToast(error.message || 'Failed to add student', 'error');
            throw error;
        }
    },

    // Delete user
    deleteUser: async (studentId) => {
        try {
            await deleteDoc(doc(db, 'users', studentId));
            utils.showToast('Student deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting user:', error);
            utils.showToast('Failed to delete student', 'error');
            throw error;
        }
    },

    // Load system settings
    loadSettings: async () => {
        try {
            const settingsRef = doc(db, 'settings', 'system');
            const settingsDoc = await getDoc(settingsRef);
            
            if (settingsDoc.exists()) {
                const settings = settingsDoc.data();
                window.appState.settings = {
                    ...window.appState.settings,
                    ...settings
                };
            }
            
            return window.appState.settings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return window.appState.settings;
        }
    },

    // Save system settings
    saveSettings: async (settings) => {
        try {
            const settingsRef = doc(db, 'settings', 'system');
            await setDoc(settingsRef, {
                ...settings,
                updatedAt: serverTimestamp()
            });
            
            // Update local state
            window.appState.settings = {
                ...window.appState.settings,
                ...settings
            };
            
            utils.showToast('Settings saved successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            utils.showToast('Failed to save settings', 'error');
            throw error;
        }
    },

    // Load weekly menus
    loadWeeklyMenus: async () => {
        try {
            const weeklyQuery = query(collection(db, 'weeklyMenus'), orderBy('date', 'asc'));
            const snapshot = await getDocs(weeklyQuery);
            
            const weeklyMenus = {};
            snapshot.forEach(doc => {
                weeklyMenus[doc.id] = doc.data();
            });

            window.appState.weeklyMenus = weeklyMenus;
            return weeklyMenus;
        } catch (error) {
            console.error('Error loading weekly menus:', error);
            return {};
        }
    },

    // Set up real-time weekly menu listener
    setupWeeklyMenuListener: () => {
        try {
            const weeklyQuery = query(collection(db, 'weeklyMenus'), orderBy('date', 'asc'));
            
            return onSnapshot(weeklyQuery, (snapshot) => {
                const weeklyMenus = {};
                snapshot.forEach(doc => {
                    weeklyMenus[doc.id] = doc.data();
                });

                window.appState.weeklyMenus = weeklyMenus;
                console.log('Weekly menus updated:', weeklyMenus);
                
                // Update UI elements in real-time
                if (window.appState.isAdmin) {
                    // Update admin calendar if on weekly planning tab
                    const weeklyPlanningTab = document.getElementById('weekly-planning');
                    if (weeklyPlanningTab && weeklyPlanningTab.classList.contains('active')) {
                        adminUI.renderWeeklyCalendar();
                    }
                } else {
                    // Update student interface with new menus
                    ui.renderWeeklyMenu();
                    ui.renderVotingOptions('breakfast');
                    ui.renderVotingOptions('lunch');
                    ui.renderVotingOptions('dinner');
                }
            });
        } catch (error) {
            console.error('Error setting up weekly menu listener:', error);
        }
    },

    // Save daily menu
    saveDailyMenu: async (date, menuData) => {
        try {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
            const docRef = doc(db, 'weeklyMenus', dateStr);
            
            await setDoc(docRef, {
                date: dateStr,
                breakfast: menuData.breakfast || [],
                lunch: menuData.lunch || [],
                dinner: menuData.dinner || [],
                updatedAt: serverTimestamp()
            });

            // Update local state
            window.appState.weeklyMenus[dateStr] = {
                date: dateStr,
                breakfast: menuData.breakfast || [],
                lunch: menuData.lunch || [],
                dinner: menuData.dinner || []
            };

            utils.showToast('Daily menu saved successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error saving daily menu:', error);
            utils.showToast('Failed to save daily menu', 'error');
            throw error;
        }
    },

    // Get today's menu
    getTodaysMenu: async () => {
        const today = new Date().toISOString().split('T')[0];
        const todaysMenu = window.appState.weeklyMenus[today];
        
        if (todaysMenu) {
            return {
                breakfast: todaysMenu.breakfast || [],
                lunch: todaysMenu.lunch || [],
                dinner: todaysMenu.dinner || []
            };
        }
        
        return {
            breakfast: [],
            lunch: [],
            dinner: []
        };
    },

    // Clear daily menu
    clearDailyMenu: async (date) => {
        try {
            const dateStr = date.toISOString().split('T')[0];
            await deleteDoc(doc(db, 'weeklyMenus', dateStr));
            
            // Remove from local state
            delete window.appState.weeklyMenus[dateStr];
            
            utils.showToast('Daily menu cleared successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error clearing daily menu:', error);
            utils.showToast('Failed to clear daily menu', 'error');
            throw error;
        }
    },

    // Submit complaint
    submitComplaint: async (complaintData) => {
        try {
            if (!complaintData.name || !complaintData.roomNumber || !complaintData.text) {
                throw new Error('Please fill in all required fields');
            }

            if (complaintData.roomNumber < 1 || complaintData.roomNumber > 200) {
                throw new Error('Room number must be between 1 and 200');
            }

            const complaint = {
                name: utils.sanitizeInput(complaintData.name),
                roomNumber: parseInt(complaintData.roomNumber),
                category: complaintData.category,
                text: utils.sanitizeInput(complaintData.text),
                urgency: complaintData.urgency,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                response: null,
                photoURL: complaintData.photoURL || null
            };

            const docRef = await addDoc(collection(db, 'complaints'), complaint);
            utils.showToast('Complaint submitted successfully!', 'success');
            return docRef.id;
        } catch (error) {
            console.error('Error submitting complaint:', error);
            utils.showToast(error.message || 'Failed to submit complaint', 'error');
            throw error;
        }
    },

    // Upload complaint photo
    uploadComplaintPhoto: async (file) => {
        try {
            const timestamp = Date.now();
            const fileName = `complaints/${timestamp}_${file.name}`;
            const storageReference = storageRef(storage, fileName);
            
            const uploadTask = uploadBytes(storageReference, file);
            const snapshot = await uploadTask;
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return downloadURL;
        } catch (error) {
            console.error('Error uploading photo:', error);
            throw error;
        }
    },

    // Load complaints
    loadComplaints: async (filter = 'all') => {
        try {
            let complaintsQuery;
            
            if (filter === 'all') {
                complaintsQuery = query(
                    collection(db, 'complaints'), 
                    orderBy('createdAt', 'desc')
                );
            } else {
                complaintsQuery = query(
                    collection(db, 'complaints'),
                    where('status', '==', filter),
                    orderBy('createdAt', 'desc')
                );
            }
            
            const snapshot = await getDocs(complaintsQuery);
            
            const complaints = [];
            snapshot.forEach(doc => {
                complaints.push({ id: doc.id, ...doc.data() });
            });

            window.appState.complaints = complaints;
            return complaints;
        } catch (error) {
            console.error('Error loading complaints:', error);
            utils.showToast('Failed to load complaints', 'error');
            return [];
        }
    },

    // Update complaint status
    updateComplaintStatus: async (complaintId, status, response = null) => {
        try {
            const updateData = {
                status: status,
                updatedAt: serverTimestamp()
            };

            if (response) {
                updateData.response = utils.sanitizeInput(response);
            }

            await updateDoc(doc(db, 'complaints', complaintId), updateData);
            utils.showToast('Complaint updated successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error updating complaint:', error);
            utils.showToast('Failed to update complaint', 'error');
            throw error;
        }
    },

    // Get user complaints
    getUserComplaints: async (userName) => {
        try {
            if (!userName) {
                console.log('No username provided for getting complaints');
                return [];
            }

            console.log('Searching for complaints by user:', userName);
            
            // First try to get all complaints and filter on client side
            const allComplaintsQuery = query(collection(db, 'complaints'));
            const snapshot = await getDocs(allComplaintsQuery);
            
            const allComplaints = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                allComplaints.push({ id: doc.id, ...data });
            });

            console.log('All complaints in database:', allComplaints.length);
            console.log('Sample complaints:', allComplaints.slice(0, 2));

            // Filter by exact name match (case sensitive)
            let userComplaints = allComplaints.filter(complaint => 
                complaint.name === userName
            );

            console.log('Exact match complaints:', userComplaints.length);

            // If no exact match, try case insensitive
            if (userComplaints.length === 0) {
                userComplaints = allComplaints.filter(complaint => 
                    complaint.name?.toLowerCase() === userName.toLowerCase()
                );
                console.log('Case insensitive match complaints:', userComplaints.length);
            }

            // Sort by createdAt on client side
            userComplaints.sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return bTime - aTime;
            });

            console.log('Final user complaints for', userName, ':', userComplaints);
            return userComplaints.slice(0, 5); // Take latest 5
        } catch (error) {
            console.error('Error loading user complaints:', error);
            // Return empty array instead of throwing
            return [];
        }
    },



    // Delete complaint
    deleteComplaint: async (complaintId) => {
        try {
            await deleteDoc(doc(db, 'complaints', complaintId));
            utils.showToast('Complaint deleted successfully!', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting complaint:', error);
            utils.showToast('Failed to delete complaint', 'error');
            throw error;
        }
    }
};

// UI Functions
const ui = {
    // Show loading screen
    showLoading: () => {
        document.getElementById('loadingScreen').style.display = 'flex';
    },

    // Hide loading screen
    hideLoading: () => {
        document.getElementById('loadingScreen').style.display = 'none';
    },

    // Show student login
    showStudentLogin: () => {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').classList.add('hidden');
    },

    // Show main app
    showMainApp: () => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').classList.remove('hidden');
    },

    // Show admin login
    showAdminLogin: () => {
        document.getElementById('adminLoginScreen').style.display = 'flex';
        document.getElementById('adminApp').classList.add('hidden');
    },

    // Show admin app
    showAdminApp: () => {
        document.getElementById('adminLoginScreen').style.display = 'none';
        document.getElementById('adminApp').classList.remove('hidden');
    },

    // Update current date display
    updateDateDisplay: () => {
        const dateElements = document.querySelectorAll('#currentDate, #dashboardDate');
        const formattedDate = utils.formatDate(new Date());
        
        dateElements.forEach(element => {
            if (element) {
                element.textContent = formattedDate;
            }
        });
    },

    // Update voting status
    updateVotingStatus: () => {
        const statusElement = document.getElementById('votingStatus');
        const statusText = document.getElementById('statusText');
        const timeRemaining = document.getElementById('timeRemaining');

        if (!statusElement || !statusText || !timeRemaining) return;

        const isActive = utils.isVotingActive();
        
        if (isActive) {
            statusElement.classList.remove('closed');
            statusText.textContent = `Voting is open until ${window.appState.settings.votingEndTime}`;
            
            const remaining = utils.getTimeRemaining();
            timeRemaining.textContent = `${remaining.hours}h ${remaining.minutes}m ${remaining.seconds}s remaining`;
        } else {
            statusElement.classList.add('closed');
            statusText.textContent = 'Voting is currently closed';
            timeRemaining.textContent = `Voting opens at ${window.appState.settings.votingStartTime}`;
        }

        window.appState.votingActive = isActive;
    },

    // Update user display name
    updateUserDisplay: () => {
        const userDisplayElement = document.getElementById('userDisplayName');
        const profileUserName = document.getElementById('profileUserName');
        
        if (window.appState.currentUser) {
            if (userDisplayElement) {
                userDisplayElement.textContent = window.appState.currentUser.name;
            }
            if (profileUserName) {
                profileUserName.textContent = window.appState.currentUser.name;
            }
        }
    },

    // Show specific section
    showSection: (sectionName) => {
        const sections = ['voting', 'results', 'weekly-menu', 'complaints'];
        
        sections.forEach(section => {
            const element = document.querySelector(`.${section}-section`);
            if (element) {
                element.style.display = section === sectionName ? 'block' : 'none';
            }
        });
        
        // Special handling for complaints section
        if (sectionName === 'complaints') {
            // Auto-fill user details if logged in
            const currentUser = window.appState?.currentUser;
            if (currentUser) {
                const nameInput = document.getElementById('complainantName');
                const roomInput = document.getElementById('roomNumber');
                
                if (nameInput && !nameInput.value) {
                    nameInput.value = currentUser.name;
                }
                if (roomInput && !roomInput.value) {
                    roomInput.value = currentUser.studentId || currentUser.roomNumber || '';
                }
            }
        }
    },

    // Show profile modal
    showProfileModal: () => {
        const modal = document.getElementById('profileModal');
        if (modal) {
            // Update profile information
            const profileName = document.getElementById('profileName');
            const profileId = document.getElementById('profileId');
            const profileLastLogin = document.getElementById('profileLastLogin');
            
            if (window.appState?.currentUser) {
                if (profileName) profileName.textContent = window.appState.currentUser.name;
                if (profileId) profileId.textContent = window.appState.currentUser.studentId;
                if (profileLastLogin) profileLastLogin.textContent = new Date().toLocaleString();
            }
            
            modal.style.display = 'flex';
        }
    },

    // Hide profile modal
    hideProfileModal: () => {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Render voting options
    renderVotingOptions: async (mealType) => {
        const container = document.getElementById(`${mealType}Options`);
        if (!container) {
            console.log(`Container not found for ${mealType}Options`);
            return;
        }

        // Get today's planned menu first, fallback to all menu items if no plan exists
        const today = new Date().toISOString().split('T')[0];
        const todaysPlannedMenu = window.appState.weeklyMenus[today];
        
        let items = [];
        if (todaysPlannedMenu && todaysPlannedMenu[mealType] && todaysPlannedMenu[mealType].length > 0) {
            // Use planned menu for today
            items = todaysPlannedMenu[mealType];
        } else {
            // Fallback to all available menu items if no plan exists
            items = window.appState.menuItems[mealType] || [];
        }

        const userVotes = window.appState.votes || {};
        const isVotingActive = window.appState.votingActive;

        console.log(`Rendering ${mealType} options:`, { items, userVotes, isVotingActive });

        container.innerHTML = '';

        // Show message if no items
        if (items.length === 0) {
            const message = todaysPlannedMenu ? 
                `No ${mealType} items planned for today. Please contact admin.` : 
                `No ${mealType} items available yet. Please check back later or contact admin.`;
            container.innerHTML = `<div class="no-items">${message}</div>`;
            return;
        }

        // Add menu items
        items.forEach(item => {
            const isSelected = userVotes[mealType] === item.id;
            const option = document.createElement('div');
            option.className = `voting-option ${isSelected ? 'selected' : ''} ${!isVotingActive ? 'disabled' : ''}`;
            option.dataset.itemId = item.id;

            option.innerHTML = `
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="option-image">` : ''}
                <div class="option-name">${item.name}</div>
                <div class="option-description">${item.description || ''}</div>
                <div class="vote-count">
                    <i class="fas fa-vote-yea"></i>
                    <span>${window.appState.votingResults[mealType]?.[item.id] || 0} votes</span>
                </div>
            `;

            if (isVotingActive) {
                option.addEventListener('click', () => ui.handleVote(mealType, item.id));
            }

            container.appendChild(option);
        });

        // Add skip option
        const isSkipSelected = userVotes[mealType] === 'skip';
        const skipOption = document.createElement('div');
        skipOption.className = `voting-option ${isSkipSelected ? 'selected' : ''} ${!isVotingActive ? 'disabled' : ''}`;
        skipOption.dataset.itemId = 'skip';

        skipOption.innerHTML = `
            <div class="option-name">Skip ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
            <div class="option-description">I won't be eating ${mealType} today</div>
            <div class="vote-count">
                <i class="fas fa-times"></i>
                <span>${window.appState.votingResults[mealType]?.skip || 0} votes</span>
            </div>
        `;

        if (isVotingActive) {
            skipOption.addEventListener('click', () => ui.handleVote(mealType, 'skip'));
        }

        container.appendChild(skipOption);
    },

    // Handle vote submission
    handleVote: async (mealType, itemId) => {
        if (!window.appState.votingActive) {
            utils.showToast('Voting is currently closed', 'warning');
            return;
        }

        if (!window.appState.currentUser) {
            utils.showToast('Please log in to vote', 'error');
            return;
        }

        try {
            await database.submitVote(mealType, itemId, window.appState.currentUser.studentId);
            
            // Update local state
            window.appState.votes[mealType] = itemId;
            
            // Refresh voting results and UI
            await database.loadVotingResults();
            await ui.renderVotingOptions(mealType);
            ui.renderVotingResults();
            
        } catch (error) {
            console.error('Vote submission error:', error);
        }
    },

    // Render voting results
    renderVotingResults: () => {
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        
        mealTypes.forEach(mealType => {
            const container = document.getElementById(`${mealType}Results`);
            if (!container) return;

            const results = window.appState.votingResults[mealType] || {};
            const items = window.appState.menuItems[mealType] || [];
            
            // Calculate total votes
            const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);

            container.innerHTML = '';

            if (totalVotes === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--gray-600);">No votes yet</p>';
                return;
            }

            // Sort items by vote count
            const sortedResults = [
                ...items.map(item => ({
                    id: item.id,
                    name: item.name,
                    votes: results[item.id] || 0,
                    percentage: totalVotes > 0 ? ((results[item.id] || 0) / totalVotes * 100).toFixed(1) : 0
                })),
                {
                    id: 'skip',
                    name: 'Skip',
                    votes: results.skip || 0,
                    percentage: totalVotes > 0 ? ((results.skip || 0) / totalVotes * 100).toFixed(1) : 0
                }
            ].sort((a, b) => b.votes - a.votes);

            sortedResults.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';

                resultItem.innerHTML = `
                    <div class="result-text">
                        <span>${result.name}</span>
                        <span>${result.votes} (${result.percentage}%)</span>
                    </div>
                    <div class="result-bar">
                        <div class="result-progress" style="width: ${result.percentage}%"></div>
                    </div>
                `;

                container.appendChild(resultItem);
            });
        });
    },

    // Render today's winners for students
    renderTodaysWinners: () => {
        const winnersSection = document.getElementById('winnersSection');
        const winnersContainer = document.getElementById('todaysWinners');
        
        if (!winnersSection || !winnersContainer) return;

        const isVotingClosed = !utils.isVotingActive();
        
        // Show/hide winners section based on voting status
        if (isVotingClosed) {
            winnersSection.style.display = 'block';
            winnersContainer.innerHTML = '';

            const mealTypes = ['breakfast', 'lunch', 'dinner'];
            const mealIcons = {
                breakfast: '☕',
                lunch: '🍽️',
                dinner: '🍕'
            };
            const mealNames = {
                breakfast: 'Breakfast',
                lunch: 'Lunch', 
                dinner: 'Dinner'
            };

            let hasWinners = false;

            mealTypes.forEach(mealType => {
                const results = window.appState.votingResults[mealType] || {};
                const items = window.appState.menuItems[mealType] || [];
                
                if (Object.keys(results).length === 0) return;

                // Find the winner (item with most votes)
                let winner = null;
                let maxVotes = 0;
                
                [...items, { id: 'skip', name: 'Skip Meal', description: 'Students chose to skip this meal' }].forEach(item => {
                    const votes = results[item.id] || 0;
                    if (votes > maxVotes) {
                        maxVotes = votes;
                        winner = item;
                    }
                });

                if (winner && maxVotes > 0) {
                    hasWinners = true;
                    const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);
                    const winPercentage = ((maxVotes / totalVotes) * 100).toFixed(1);

                    const winnerCard = document.createElement('div');
                    winnerCard.className = 'winner-meal-card';
                    winnerCard.innerHTML = `
                        <span class="winner-meal-icon">${mealIcons[mealType]}</span>
                        <h3>${mealNames[mealType]}</h3>
                        <div class="winner-item-name">${winner.name}</div>
                        <div class="winner-item-description">${winner.description || ''}</div>
                        <div class="winner-stats">
                            <div class="winner-stat">
                                <span class="winner-stat-value">${maxVotes}</span>
                                <span class="winner-stat-label">Votes</span>
                            </div>
                            <div class="winner-stat">
                                <span class="winner-stat-value">${winPercentage}%</span>
                                <span class="winner-stat-label">Share</span>
                            </div>
                        </div>
                    `;
                    winnersContainer.appendChild(winnerCard);
                }
            });

            // Show message if no winners
            if (!hasWinners) {
                winnersContainer.innerHTML = `
                    <div class="no-winner-message">
                        <i class="fas fa-clock"></i>
                        <p>Voting has ended but no clear winners yet.</p>
                        <p>Please check back later or contact the admin.</p>
                    </div>
                `;
            }
        } else {
            winnersSection.style.display = 'none';
        }
    },

    // Render weekly menu
    renderWeeklyMenu: () => {
        const container = document.getElementById('weeklyMenu');
        if (!container) return;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const today = new Date();
        
        container.innerHTML = '';

        // Show next 7 days starting from today
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = days[date.getDay()];
            const dayNumber = date.getDate();
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            
            const dayCard = document.createElement('div');
            dayCard.className = `day-menu-card ${i === 0 ? 'today' : ''}`;

            // Get planned menu for this date
            const plannedMenu = window.appState.weeklyMenus[dateStr];
            let mealsHtml = '';
            
            if (plannedMenu) {
                mealTypes.forEach(mealType => {
                    const items = plannedMenu[mealType] || [];
                    
                    if (items.length > 0) {
                        const itemNames = items.slice(0, 2).map(item => item.name).join(', ');
                        const moreItems = items.length > 2 ? ` +${items.length - 2} more` : '';
                        
                        mealsHtml += `
                            <div class="meal-preview">
                                <i class="fas fa-${mealType === 'breakfast' ? 'coffee' : mealType === 'lunch' ? 'hamburger' : 'pizza-slice'}"></i>
                                <span>${itemNames}${moreItems}</span>
                            </div>
                        `;
                    } else {
                        mealsHtml += `
                            <div class="meal-preview">
                                <i class="fas fa-${mealType === 'breakfast' ? 'coffee' : mealType === 'lunch' ? 'hamburger' : 'pizza-slice'}"></i>
                                <span style="color: var(--gray-500); font-style: italic;">Not planned</span>
                            </div>
                        `;
                    }
                });
            } else {
                mealsHtml = `
                    <div style="text-align: center; color: var(--gray-500); font-style: italic; padding: var(--spacing-base);">
                        <i class="fas fa-calendar-times" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                        Menu not planned yet
                    </div>
                `;
            }

            dayCard.innerHTML = `
                <div class="day-header">
                    <h4>${dayName}</h4>
                    <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">${monthName} ${dayNumber}</p>
                </div>
                <div class="day-meals">
                    ${mealsHtml}
                </div>
            `;

            container.appendChild(dayCard);
        }
    }
};

// Admin UI Functions
const adminUI = {
    // Initialize admin navigation
    initNavigation: () => {
        const navTabs = document.querySelectorAll('.nav-tab');
        const tabContents = document.querySelectorAll('.admin-tab-content');

        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update active nav tab
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update active content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab) {
                        content.classList.add('active');
                    }
                });

                // Load tab-specific data
                adminUI.loadTabData(targetTab);
            });
        });
    },

    // Load data for specific tab
    loadTabData: async (tabName) => {
        switch (tabName) {
            case 'dashboard':
                await adminUI.updateDashboard();
                break;
            case 'menu-management':
                await adminUI.renderMenuManagement();
                break;
            case 'user-management':
                await adminUI.renderUserManagement();
                break;
            case 'voting-results':
                await adminUI.renderVotingAnalytics();
                break;
            case 'weekly-planning':
                await adminUI.renderWeeklyPlanning();
                break;
            case 'complaints-management':
                await adminUI.loadComplaintsData();
                break;
            case 'system-settings':
                adminUI.renderSystemSettings();
                break;
        }
    },

    // Update dashboard statistics
    updateDashboard: async () => {
        try {
            // Load fresh data
            await Promise.all([
                database.loadUsers(),
                database.loadVotingResults(),
                database.loadMenuItems()
            ]);

            // Update statistics
            const totalStudents = window.appState.users.length;
            const todayVotes = Object.values(window.appState.votingResults)
                .reduce((total, mealResults) => total + Object.values(mealResults).reduce((sum, count) => sum + count, 0), 0);
            const menuItems = Object.values(window.appState.menuItems)
                .reduce((total, items) => total + items.length, 0);
            const participationRate = totalStudents > 0 ? ((todayVotes / (totalStudents * 3)) * 100).toFixed(1) : 0;

            // Update DOM
            const totalStudentsEl = document.getElementById('totalStudents');
            const todayVotesEl = document.getElementById('todayVotes');
            const menuItemsEl = document.getElementById('menuItems');
            const participationRateEl = document.getElementById('participationRate');

            if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
            if (todayVotesEl) todayVotesEl.textContent = todayVotes;
            if (menuItemsEl) menuItemsEl.textContent = menuItems;
            if (participationRateEl) participationRateEl.textContent = `${participationRate}%`;

            // Update charts (simplified version)
            adminUI.renderDashboardCharts();

        } catch (error) {
            console.error('Error updating dashboard:', error);
            utils.showToast('Failed to update dashboard', 'error');
        }
    },

    // Render dashboard charts (simplified)
    renderDashboardCharts: () => {
        const votingProgressChart = document.getElementById('votingProgressChart');
        const weeklyParticipationChart = document.getElementById('weeklyParticipationChart');

        if (votingProgressChart) {
            votingProgressChart.innerHTML = `
                <div style="text-align: center; color: var(--gray-600);">
                    <i class="fas fa-chart-bar" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Voting Progress Chart</p>
                    <p style="font-size: 0.875rem;">Real-time voting statistics would be displayed here</p>
                </div>
            `;
        }

        if (weeklyParticipationChart) {
            weeklyParticipationChart.innerHTML = `
                <div style="text-align: center; color: var(--gray-600);">
                    <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>Weekly Participation Chart</p>
                    <p style="font-size: 0.875rem;">Weekly participation trends would be displayed here</p>
                </div>
            `;
        }
    },

    // Render menu management
    renderMenuManagement: async () => {
        await database.loadMenuItems();

        const menuTabs = document.querySelectorAll('.menu-tab');
        const container = document.getElementById('menuItemsContainer');

        // Initialize menu tabs
        menuTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                menuTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                adminUI.renderMenuItems(tab.dataset.meal);
            });
        });

        // Render initial meal type
        adminUI.renderMenuItems('breakfast');
    },

    // Render menu items for specific meal type
    renderMenuItems: (mealType) => {
        const container = document.getElementById('menuItemsContainer');
        if (!container) return;

        const items = window.appState.menuItems[mealType] || [];
        container.innerHTML = '';

        if (items.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--gray-600);">
                    <i class="fas fa-utensils" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p>No ${mealType} items added yet</p>
                    <p style="font-size: 0.875rem;">Click "Add Menu Item" to get started</p>
                </div>
            `;
            return;
        }

        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'menu-item-card';

            itemCard.innerHTML = `
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="menu-item-image">` : ''}
                <div class="menu-item-content">
                    <h4 class="menu-item-name">${item.name}</h4>
                    <p class="menu-item-description">${item.description || 'No description'}</p>
                    <div class="menu-item-actions">
                        <button class="btn-secondary btn-sm" onclick="adminUI.editMenuItem('${item.id}')">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn-danger btn-sm" onclick="adminUI.deleteMenuItem('${item.id}', '${item.imageUrl || ''}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(itemCard);
        });
    },

    // Edit menu item
    editMenuItem: (itemId) => {
        // Find the item
        const allItems = [
            ...window.appState.menuItems.breakfast,
            ...window.appState.menuItems.lunch,
            ...window.appState.menuItems.dinner
        ];
        const item = allItems.find(i => i.id === itemId);
        
        if (!item) {
            utils.showToast('Menu item not found', 'error');
            return;
        }

        // Populate edit form (reuse add form)
        const modal = document.getElementById('addMenuItemModal');
        const form = document.getElementById('addMenuItemForm');
        const nameInput = document.getElementById('itemName');
        const mealSelect = document.getElementById('itemMeal');
        const descriptionInput = document.getElementById('itemDescription');

        if (nameInput) nameInput.value = item.name;
        if (mealSelect) mealSelect.value = item.mealType;
        if (descriptionInput) descriptionInput.value = item.description || '';

        // Update form for editing
        form.dataset.editId = itemId;
        modal.querySelector('.modal-header h3').innerHTML = '<i class="fas fa-edit"></i> Edit Menu Item';
        modal.querySelector('button[type="submit"]').textContent = 'Update Item';

        adminUI.showModal('addMenuItemModal');
    },

    // Delete menu item
    deleteMenuItem: async (itemId, imageUrl) => {
        if (!confirm('Are you sure you want to delete this menu item?')) {
            return;
        }

        try {
            await database.deleteMenuItem(itemId, imageUrl);
            await database.loadMenuItems();
            
            // Re-render current meal type
            const activeMealTab = document.querySelector('.menu-tab.active');
            if (activeMealTab) {
                adminUI.renderMenuItems(activeMealTab.dataset.meal);
            }
        } catch (error) {
            console.error('Error deleting menu item:', error);
        }
    },

    // Render user management
    renderUserManagement: async () => {
        await database.loadUsers();

        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (window.appState.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem; color: var(--gray-600);">
                        No students registered yet
                    </td>
                </tr>
            `;
            return;
        }

        window.appState.users.forEach(user => {
            const row = document.createElement('tr');
            
            const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date();
            const lastVote = user.lastVote?.toDate ? user.lastVote.toDate() : null;

            row.innerHTML = `
                <td>${user.studentId}</td>
                <td>${user.name}</td>
                <td>${utils.formatDate(createdAt)}</td>
                <td>${lastVote ? utils.formatDate(lastVote) : 'Never'}</td>
                <td>${user.totalVotes || 0}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="adminUI.deleteUser('${user.studentId}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    },

    // Delete user
    deleteUser: async (studentId) => {
        if (!confirm('Are you sure you want to delete this student?')) {
            return;
        }

        try {
            await database.deleteUser(studentId);
            await adminUI.renderUserManagement();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    },

    // Render voting analytics
    renderVotingAnalytics: async () => {
        const container = document.getElementById('analyticsContainer');
        const dateInput = document.getElementById('analyticsDate');

        if (!container) return;

        // Set default date to today
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Load fresh data
        await Promise.all([
            database.loadVotingResults(),
            database.loadMenuItems(),
            database.loadUsers(),
            database.loadSettings()
        ]);

        // Update voting status indicator
        adminUI.updateVotingStatusIndicator();
        
        // Calculate and update summary statistics
        adminUI.updateAnalyticsSummary();
        
        // Check if voting is closed and show winners
        const isVotingClosed = !utils.isVotingActive();
        if (isVotingClosed) {
            adminUI.renderWinnersSection();
        } else {
            // Hide winners section if voting is open
            const winnersSection = document.getElementById('winnersSection');
            if (winnersSection) winnersSection.style.display = 'none';
        }

        // Render detailed analytics for each meal
        container.innerHTML = '';
        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        
        mealTypes.forEach(mealType => {
            const mealCard = document.createElement('div');
            mealCard.className = 'analytics-card';
            
            const results = window.appState.votingResults[mealType] || {};
            const items = window.appState.menuItems[mealType] || [];
            const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);

            // Sort results by vote count
            const sortedResults = [
                ...items.map(item => ({
                    id: item.id,
                    name: item.name,
                    votes: results[item.id] || 0,
                    percentage: totalVotes > 0 ? ((results[item.id] || 0) / totalVotes * 100).toFixed(1) : 0
                })),
                {
                    id: 'skip',
                    name: 'Skip Meal',
                    votes: results.skip || 0,
                    percentage: totalVotes > 0 ? ((results.skip || 0) / totalVotes * 100).toFixed(1) : 0
                }
            ].sort((a, b) => b.votes - a.votes);

            let resultsHtml = '';
            if (totalVotes > 0) {
                sortedResults.forEach((result, index) => {
                    const rankIcon = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🍽️';
                    resultsHtml += `
                        <div class="result-item" style="position: relative;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.2rem;">${rankIcon}</span>
                                ${result.name}
                            </span>
                            <span>${result.votes} votes (${result.percentage}%)</span>
                            <div style="position: absolute; bottom: 0; left: 0; height: 3px; background: var(--primary-color); width: ${result.percentage}%; border-radius: 1px;"></div>
                        </div>
                    `;
                });
            } else {
                resultsHtml = `
                    <div style="text-align: center; color: var(--gray-600); padding: 2rem;">
                        <i class="fas fa-vote-yea" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                        <p>No votes yet for ${mealType}</p>
                        <p style="font-size: 0.875rem;">Students will see this meal option once voting opens.</p>
                    </div>
                `;
            }

            const skipVotes = results.skip || 0;
            const skipPercentage = totalVotes > 0 ? ((skipVotes / totalVotes) * 100).toFixed(1) : 0;
            
            mealCard.innerHTML = `
                <h3>
                    <i class="fas fa-${mealType === 'breakfast' ? 'coffee' : mealType === 'lunch' ? 'hamburger' : 'pizza-slice'}"></i> 
                    ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Results
                    <span style="font-size: 0.875rem; font-weight: normal; color: var(--gray-600);">(${totalVotes} total votes)</span>
                </h3>
                ${skipVotes > 0 ? `
                    <div style="background: var(--warning-light); border: 1px solid var(--warning-color); border-radius: 4px; padding: 8px; margin-bottom: 12px;">
                        <i class="fas fa-times-circle" style="color: var(--warning-color);"></i>
                        <strong>${skipVotes} students (${skipPercentage}%) chose to skip ${mealType}</strong>
                    </div>
                ` : ''}
                <div class="analytics-content">
                    ${resultsHtml}
                </div>
            `;

            container.appendChild(mealCard);
        });
    },

    // Update voting status indicator
    updateVotingStatusIndicator: () => {
        const indicator = document.getElementById('votingStatusIndicator');
        if (!indicator) return;

        const isVotingActive = utils.isVotingActive();
        const statusText = indicator.querySelector('.status-text');
        
        if (isVotingActive) {
            indicator.classList.remove('closed');
            statusText.textContent = 'Voting Open';
        } else {
            indicator.classList.add('closed');
            statusText.textContent = 'Voting Closed';
        }
    },

    // Update analytics summary cards
    updateAnalyticsSummary: () => {
        const totalParticipants = document.getElementById('totalParticipants');
        const totalVotesCount = document.getElementById('totalVotesCount');
        const winnersCount = document.getElementById('winnersCount');
        const participationPercentage = document.getElementById('participationPercentage');

        // Calculate participation statistics
        const allResults = Object.values(window.appState.votingResults);
        let totalVotes = 0;
        let totalSkipVotes = 0;
        let participatedStudents = new Set();

        allResults.forEach(mealResults => {
            Object.entries(mealResults).forEach(([itemId, votes]) => {
                totalVotes += votes;
                if (itemId === 'skip') {
                    totalSkipVotes += votes;
                }
            });
        });

        // Estimate participating students (assuming max 3 votes per student)
        const estimatedParticipants = Math.min(Math.ceil(totalVotes / 3), window.appState.users.length);
        const participationRate = window.appState.users.length > 0 ? 
            ((estimatedParticipants / window.appState.users.length) * 100).toFixed(1) : 0;

        // Count winners (top item from each meal that has votes)
        let winners = 0;
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const results = window.appState.votingResults[mealType] || {};
            const votes = Object.values(results);
            const maxVotes = votes.length > 0 ? Math.max(...votes) : 0;
            if (maxVotes > 0) winners++;
        });

        // Update DOM
        if (totalParticipants) totalParticipants.textContent = estimatedParticipants;
        if (totalVotesCount) totalVotesCount.textContent = totalVotes;
        if (winnersCount) winnersCount.textContent = `${totalSkipVotes} Skip Votes`;
        if (participationPercentage) participationPercentage.textContent = `${participationRate}%`;
    },

    // Render winners section when voting is closed
    renderWinnersSection: () => {
        const winnersSection = document.getElementById('winnersSection');
        const winnersContainer = document.getElementById('winnersContainer');
        if (!winnersSection || !winnersContainer) return;

        winnersSection.style.display = 'block';
        winnersContainer.innerHTML = '';

        const mealTypes = ['breakfast', 'lunch', 'dinner'];
        const mealIcons = {
            breakfast: '☕',
            lunch: '🍽️', 
            dinner: '🍕'
        };

        mealTypes.forEach(mealType => {
            const results = window.appState.votingResults[mealType] || {};
            const items = window.appState.menuItems[mealType] || [];
            
            if (Object.keys(results).length === 0) return;

            // Find the winner (item with most votes)
            let winner = null;
            let maxVotes = 0;
            
            [...items, { id: 'skip', name: 'Skip Meal' }].forEach(item => {
                const votes = results[item.id] || 0;
                if (votes > maxVotes) {
                    maxVotes = votes;
                    winner = item;
                }
            });

            if (winner && maxVotes > 0) {
                const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);
                const winPercentage = ((maxVotes / totalVotes) * 100).toFixed(1);

                const winnerCard = document.createElement('div');
                winnerCard.className = 'winner-card';
                winnerCard.innerHTML = `
                    <div class="winner-medal">
                        ${mealIcons[mealType]}
                    </div>
                    <div class="winner-info">
                        <h4>${winner.name}</h4>
                        <p>${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Winner</p>
                        <div class="winner-stats">
                            <span class="winner-stat">${maxVotes} votes</span>
                            <span class="winner-stat">${winPercentage}% share</span>
                        </div>
                    </div>
                `;
                winnersContainer.appendChild(winnerCard);
            }
        });

        // Show message if no winners
        if (winnersContainer.children.length === 0) {
            winnersContainer.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 2rem;">
                    <i class="fas fa-trophy" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No winners yet - waiting for votes to be cast</p>
                </div>
            `;
        }
    },

    // Render system settings
    renderSystemSettings: () => {
        const startTimeInput = document.getElementById('votingStartTime');
        const endTimeInput = document.getElementById('votingEndTime');
        const cycleDaysInput = document.getElementById('menuCycleDays');

        if (startTimeInput) startTimeInput.value = window.appState.settings.votingStartTime;
        if (endTimeInput) endTimeInput.value = window.appState.settings.votingEndTime;
        if (cycleDaysInput) cycleDaysInput.value = window.appState.settings.menuCycleDays;
    },

    // Show modal
    showModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },

    // Hide modal
    hideModal: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            
            // Reset form if it's an add/edit form
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                delete form.dataset.editId;
                
                // Reset modal title and button text
                const title = modal.querySelector('.modal-header h3');
                const submitBtn = modal.querySelector('button[type="submit"]');
                
                if (modalId === 'addMenuItemModal') {
                    if (title) title.innerHTML = '<i class="fas fa-plus"></i> Add Menu Item';
                    if (submitBtn) submitBtn.textContent = 'Add Item';
                } else if (modalId === 'addUserModal') {
                    if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Add Student';
                    if (submitBtn) submitBtn.textContent = 'Add Student';
                }
            }
        }
    },

    // Initialize modal events
    initModals: () => {
        // Add menu item modal
        const addMenuItemBtn = document.getElementById('addMenuItemBtn');
        const addMenuItemModal = document.getElementById('addMenuItemModal');
        const addMenuItemForm = document.getElementById('addMenuItemForm');

        if (addMenuItemBtn) {
            addMenuItemBtn.addEventListener('click', () => {
                adminUI.showModal('addMenuItemModal');
            });
        }

        if (addMenuItemForm) {
            addMenuItemForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(addMenuItemForm);
                const itemData = {
                    name: formData.get('name') || document.getElementById('itemName').value,
                    mealType: formData.get('mealType') || document.getElementById('itemMeal').value,
                    description: formData.get('description') || document.getElementById('itemDescription').value
                };
                
                const imageFile = document.getElementById('itemImage').files[0];
                const editId = addMenuItemForm.dataset.editId;

                try {
                    if (editId) {
                        // Update existing item
                        await database.updateMenuItem(editId, itemData);
                    } else {
                        // Add new item
                        await database.addMenuItem(itemData, imageFile);
                    }

                    await database.loadMenuItems();
                    
                    // Re-render current meal type
                    const activeMealTab = document.querySelector('.menu-tab.active');
                    if (activeMealTab) {
                        adminUI.renderMenuItems(activeMealTab.dataset.meal);
                    }

                    // Refresh weekly planning menu selects if on that tab
                    const weeklyPlanningTab = document.getElementById('weekly-planning');
                    if (weeklyPlanningTab && weeklyPlanningTab.classList.contains('active')) {
                        adminUI.populateMenuSelects();
                    }

                    adminUI.hideModal('addMenuItemModal');
                } catch (error) {
                    console.error('Error saving menu item:', error);
                }
            });
        }

        // Add user modal
        const addUserBtn = document.getElementById('addUserBtn');
        const addUserModal = document.getElementById('addUserModal');
        const addUserForm = document.getElementById('addUserForm');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                adminUI.showModal('addUserModal');
            });
        }

        if (addUserForm) {
            addUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('newStudentName').value;
                const studentId = document.getElementById('newStudentId').value;

                try {
                    await database.addUser(name, studentId);
                    await adminUI.renderUserManagement();
                    adminUI.hideModal('addUserModal');
                } catch (error) {
                    console.error('Error adding user:', error);
                }
            });
        }

        // Modal close events
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    adminUI.hideModal(modal.id);
                }
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    adminUI.hideModal(modal.id);
                }
            });
        });

        // Weekly planning event listeners
        const saveDailyMenuBtn = document.getElementById('saveDailyMenuBtn');
        const clearWeeklyMenuBtn = document.getElementById('clearWeeklyMenuBtn');
        const addNewMenuItemBtn = document.getElementById('addNewMenuItemBtn');

        if (saveDailyMenuBtn) {
            saveDailyMenuBtn.addEventListener('click', adminUI.saveDailyMenu);
        }

        if (clearWeeklyMenuBtn) {
            clearWeeklyMenuBtn.addEventListener('click', adminUI.clearWeeklyMenu);
        }

        if (addNewMenuItemBtn) {
            addNewMenuItemBtn.addEventListener('click', () => {
                console.log('Add New Menu Item button clicked from Weekly Planning');
                adminUI.showModal('addMenuItemModal');
            });
        } else {
            console.log('Add New Menu Item button not found in Weekly Planning tab');
        }
    },

    // Render weekly planning interface
    renderWeeklyPlanning: async () => {
        await database.loadWeeklyMenus();
        adminUI.renderWeeklyCalendar();
        adminUI.populateMenuSelects();
        
        // Set up the "Add New Menu Item" button event listener
        setTimeout(() => {
            const addNewMenuItemBtn = document.getElementById('addNewMenuItemBtn');
            if (addNewMenuItemBtn) {
                // Remove any existing listeners to avoid duplicates
                addNewMenuItemBtn.removeEventListener('click', adminUI.handleAddNewMenuItem);
                addNewMenuItemBtn.addEventListener('click', adminUI.handleAddNewMenuItem);
                console.log('Add New Menu Item button event listener set up successfully');
            } else {
                console.log('Add New Menu Item button not found');
            }
        }, 100);
    },

    // Handle add new menu item button click
    handleAddNewMenuItem: () => {
        console.log('Add New Menu Item button clicked from Weekly Planning');
        adminUI.showModal('addMenuItemModal');
    },

    // Render weekly calendar
    renderWeeklyCalendar: () => {
        const calendar = document.getElementById('weeklyCalendar');
        if (!calendar) return;

        const today = new Date();
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        calendar.innerHTML = '';
        
        // Create calendar for next 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            dayDiv.dataset.date = dateStr;
            
            // Check if menu is planned for this day
            const hasMenu = window.appState.weeklyMenus[dateStr];
            if (hasMenu) {
                dayDiv.classList.add('planned');
            }
            
            // Check if it's today
            if (i === 0) {
                dayDiv.classList.add('today');
            }
            
            dayDiv.innerHTML = `
                <div class="day-name">${weekDays[date.getDay()]}</div>
                <div class="day-number">${date.getDate()}</div>
                <div class="day-status">${hasMenu ? 'Planned' : 'Not Set'}</div>
            `;
            
            dayDiv.addEventListener('click', () => {
                adminUI.selectDate(date);
            });
            
            calendar.appendChild(dayDiv);
        }
    },

    // Select date for planning
    selectedDate: null,
    selectDate: (date) => {
        adminUI.selectedDate = date;
        const dateStr = date.toISOString().split('T')[0];
        
        // Update calendar selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
            if (day.dataset.date === dateStr) {
                day.classList.add('selected');
            }
        });
        
        // Update selected date display
        const selectedDateDisplay = document.getElementById('selectedDateDisplay');
        if (selectedDateDisplay) {
            selectedDateDisplay.textContent = utils.formatDate(date);
        }
        
        // Load menu for selected date
        adminUI.loadDailyMenu(dateStr);
    },

    // Load daily menu for selected date
    loadDailyMenu: (dateStr) => {
        const plannedMenu = window.appState.weeklyMenus[dateStr] || {
            breakfast: [],
            lunch: [],
            dinner: []
        };
        
        // Display planned items for each meal
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const container = document.getElementById(`planned${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`);
            if (container) {
                container.innerHTML = '';
                
                if (plannedMenu[mealType] && plannedMenu[mealType].length > 0) {
                    plannedMenu[mealType].forEach(item => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'planned-item';
                        itemDiv.innerHTML = `
                            ${item.name}
                            <button class="remove-btn" onclick="adminUI.removeItemFromDailyMenu('${mealType}', '${item.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        container.appendChild(itemDiv);
                    });
                } else {
                    container.innerHTML = '<div style="color: #888; font-style: italic;">No items planned</div>';
                }
            }
        });
    },

    // Populate menu selects with available items
    populateMenuSelects: () => {
        ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
            const select = document.getElementById(`${mealType}ItemSelect`);
            if (select && window.appState.menuItems[mealType]) {
                select.innerHTML = `<option value="">Select ${mealType} item to add</option>`;
                
                window.appState.menuItems[mealType].forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name;
                    select.appendChild(option);
                });
            }
        });
    },

    // Add item to daily menu
    addItemToDailyMenu: (mealType) => {
        if (!adminUI.selectedDate) {
            utils.showToast('Please select a date first', 'warning');
            return;
        }
        
        const select = document.getElementById(`${mealType}ItemSelect`);
        const selectedItemId = select.value;
        
        if (!selectedItemId) {
            utils.showToast('Please select an item to add', 'warning');
            return;
        }
        
        const selectedItem = window.appState.menuItems[mealType].find(item => item.id === selectedItemId);
        if (!selectedItem) return;
        
        const dateStr = adminUI.selectedDate.toISOString().split('T')[0];
        
        // Initialize menu for this date if it doesn't exist
        if (!window.appState.weeklyMenus[dateStr]) {
            window.appState.weeklyMenus[dateStr] = {
                breakfast: [],
                lunch: [],
                dinner: []
            };
        }
        
        // Check if item is already added
        const existingItem = window.appState.weeklyMenus[dateStr][mealType].find(item => item.id === selectedItemId);
        if (existingItem) {
            utils.showToast('Item already added to this meal', 'warning');
            return;
        }
        
        // Add item to the planned menu
        window.appState.weeklyMenus[dateStr][mealType].push(selectedItem);
        
        // Reset select and reload display
        select.value = '';
        adminUI.loadDailyMenu(dateStr);
        adminUI.renderWeeklyCalendar();
        
        utils.showToast('Item added to daily menu', 'success');
    },

    // Remove item from daily menu
    removeItemFromDailyMenu: (mealType, itemId) => {
        if (!adminUI.selectedDate) return;
        
        const dateStr = adminUI.selectedDate.toISOString().split('T')[0];
        const plannedMenu = window.appState.weeklyMenus[dateStr];
        
        if (plannedMenu && plannedMenu[mealType]) {
            plannedMenu[mealType] = plannedMenu[mealType].filter(item => item.id !== itemId);
            adminUI.loadDailyMenu(dateStr);
            adminUI.renderWeeklyCalendar();
            utils.showToast('Item removed from daily menu', 'success');
        }
    },

    // Save daily menu to database
    saveDailyMenu: async () => {
        if (!adminUI.selectedDate) {
            utils.showToast('Please select a date first', 'warning');
            return;
        }
        
        const dateStr = adminUI.selectedDate.toISOString().split('T')[0];
        const menuData = window.appState.weeklyMenus[dateStr] || {
            breakfast: [],
            lunch: [],
            dinner: []
        };
        
        try {
            await database.saveDailyMenu(adminUI.selectedDate, menuData);
            adminUI.renderWeeklyCalendar();
        } catch (error) {
            console.error('Error saving daily menu:', error);
        }
    },

    // Clear weekly menu for selected date
    clearWeeklyMenu: async () => {
        if (!adminUI.selectedDate) {
            utils.showToast('Please select a date first', 'warning');
            return;
        }
        
        if (!confirm('Are you sure you want to clear the menu for this date?')) {
            return;
        }
        
        try {
            await database.clearDailyMenu(adminUI.selectedDate);
            const dateStr = adminUI.selectedDate.toISOString().split('T')[0];
            delete window.appState.weeklyMenus[dateStr];
            adminUI.loadDailyMenu(dateStr);
            adminUI.renderWeeklyCalendar();
        } catch (error) {
            console.error('Error clearing weekly menu:', error);
        }
    },

    // Load complaints management data
    loadComplaintsData: async () => {
        await database.loadComplaints();
        adminUI.renderComplaintsStats();
        adminUI.renderComplaintsList('today');
        adminUI.setupComplaintsEventListeners();
    },

    // Render complaints statistics
    renderComplaintsStats: () => {
        const complaints = window.appState.complaints || [];
        const today = new Date();
        const todayStr = today.toDateString();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayComplaints = complaints.filter(c => 
            c.createdAt && c.createdAt.toDate && c.createdAt.toDate().toDateString() === todayStr
        ).length;

        const pendingComplaints = complaints.filter(c => c.status === 'pending').length;
        
        const resolvedThisWeek = complaints.filter(c => 
            c.status === 'resolved' && 
            c.updatedAt && c.updatedAt.toDate && 
            c.updatedAt.toDate() >= weekAgo
        ).length;

        const weekComplaints = complaints.filter(c => 
            c.createdAt && c.createdAt.toDate && c.createdAt.toDate() >= weekAgo
        ).length;

        // Update stats display
        const todayEl = document.getElementById('todayComplaints');
        const pendingEl = document.getElementById('pendingComplaints');
        const resolvedEl = document.getElementById('resolvedComplaints');
        const weekEl = document.getElementById('weekComplaints');

        if (todayEl) todayEl.textContent = todayComplaints;
        if (pendingEl) pendingEl.textContent = pendingComplaints;
        if (resolvedEl) resolvedEl.textContent = resolvedThisWeek;
        if (weekEl) weekEl.textContent = weekComplaints;
    },

    // Render complaints list based on filter
    renderComplaintsList: (filter = 'today') => {
        const complaints = window.appState.complaints || [];
        const complaintsContainer = document.getElementById('complaintsList');
        const titleElement = document.getElementById('complaintsListTitle');
        
        if (!complaintsContainer) return;

        let filteredComplaints = adminUI.getFilteredComplaints(complaints, filter);
        let title = '';

        switch (filter) {
            case 'today':
                title = "Today's Complaints";
                break;
            case 'yesterday':
                title = "Yesterday's Complaints";
                break;
            case 'week':
                title = "This Week's Complaints";
                break;
            case 'pending':
                title = "Pending Complaints";
                break;
            case 'resolved':
                title = "Resolved Complaints";
                break;
            default:
                title = "All Complaints";
        }

        if (titleElement) {
            titleElement.textContent = title;
        }

        complaintsContainer.innerHTML = '';

        if (filteredComplaints.length === 0) {
            complaintsContainer.innerHTML = `
                <div class="empty-complaints">
                    <i class="fas fa-inbox"></i>
                    <h3>No complaints found</h3>
                    <p>No complaints match the selected filter.</p>
                </div>
            `;
            return;
        }

        filteredComplaints.forEach(complaint => {
            const complaintElement = document.createElement('div');
            complaintElement.className = `complaint-item ${complaint.status}`;
            complaintElement.innerHTML = `
                <div class="complaint-urgency ${complaint.urgency}">${complaint.urgency?.toUpperCase()}</div>
                <div class="complaint-category">${complaint.category?.replace('-', ' ').toUpperCase()}</div>
                <div class="complaint-header">
                    <div class="complaint-meta">
                        <div class="complaint-name">${complaint.name} - Room ${complaint.roomNumber}</div>
                        <div class="complaint-details">
                            <span><i class="fas fa-calendar"></i> ${complaint.createdAt?.toDate ? complaint.createdAt.toDate().toLocaleDateString() : 'Unknown'}</span>
                            <span><i class="fas fa-clock"></i> ${complaint.createdAt?.toDate ? complaint.createdAt.toDate().toLocaleTimeString() : 'Unknown'}</span>
                        </div>
                    </div>
                    <div class="complaint-status ${complaint.status}">
                        <i class="fas fa-${complaint.status === 'pending' ? 'clock' : 'check-circle'}"></i>
                        ${complaint.status?.toUpperCase()}
                    </div>
                </div>
                <div class="complaint-text">${complaint.text}</div>
                ${complaint.response ? `<div class="complaint-response"><strong>Response:</strong> ${complaint.response}</div>` : ''}
            `;

            complaintElement.addEventListener('click', () => {
                adminUI.showComplaintDetails(complaint);
            });

            complaintsContainer.appendChild(complaintElement);
        });
    },

    // Show complaint details in modal
    showComplaintDetails: (complaint) => {
        const modal = document.getElementById('complaintDetailsModal');
        const content = document.getElementById('complaintDetailsContent');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="complaint-detail-header">
                <h4>${complaint.name} - Room ${complaint.roomNumber}</h4>
                <div class="complaint-meta-info">
                    <span class="complaint-status ${complaint.status}">
                        <i class="fas fa-${complaint.status === 'pending' ? 'clock' : 'check-circle'}"></i>
                        ${complaint.status?.toUpperCase()}
                    </span>
                    <span class="complaint-urgency ${complaint.urgency}">${complaint.urgency?.toUpperCase()}</span>
                </div>
            </div>
            <div class="complaint-detail-body">
                <div class="detail-field">
                    <label><i class="fas fa-list"></i> Category:</label>
                    <span>${complaint.category?.replace('-', ' ')}</span>
                </div>
                <div class="detail-field">
                    <label><i class="fas fa-calendar"></i> Submitted:</label>
                    <span>${complaint.createdAt?.toDate ? complaint.createdAt.toDate().toLocaleString() : 'Unknown'}</span>
                </div>
                <div class="detail-field">
                    <label><i class="fas fa-comment"></i> Complaint:</label>
                    <p>${complaint.text}</p>
                </div>
                ${complaint.photoURL ? `
                    <div class="detail-field">
                        <label><i class="fas fa-camera"></i> Photo:</label>
                        <img src="${complaint.photoURL}" alt="Complaint photo" class="complaint-photo" onclick="window.open('${complaint.photoURL}', '_blank')" style="cursor: pointer; max-width: 300px; border-radius: 8px; margin-top: 8px;">
                    </div>
                ` : ''}
                ${complaint.response ? `
                    <div class="detail-field">
                        <label><i class="fas fa-reply"></i> Admin Response:</label>
                        <p>${complaint.response}</p>
                    </div>
                ` : ''}
            </div>
        `;

        // Set up modal action buttons
        const markResolvedBtn = document.getElementById('markResolvedBtn');
        const addResponseBtn = document.getElementById('addResponseBtn');

        if (markResolvedBtn) {
            markResolvedBtn.style.display = complaint.status === 'pending' ? 'block' : 'none';
            markResolvedBtn.onclick = () => adminUI.markComplaintResolved(complaint.id);
        }

        if (addResponseBtn) {
            addResponseBtn.onclick = () => adminUI.addComplaintResponse(complaint.id);
        }

        modal.style.display = 'flex';
    },

    // Mark complaint as resolved
    markComplaintResolved: async (complaintId) => {
        try {
            await database.updateComplaintStatus(complaintId, 'resolved');
            await database.loadComplaints();
            adminUI.renderComplaintsStats();
            adminUI.renderComplaintsList(document.querySelector('.filter-tab.active')?.dataset.filter || 'today');
            adminUI.hideModal('complaintDetailsModal');
        } catch (error) {
            console.error('Error marking complaint as resolved:', error);
        }
    },

    // Add response to complaint
    addComplaintResponse: async (complaintId) => {
        // Create a better response modal instead of prompt
        const responseModal = document.createElement('div');
        responseModal.className = 'modal';
        responseModal.style.display = 'flex';
        responseModal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-reply"></i> Add Response to Complaint</h3>
                    <button class="modal-close" id="closeResponseModal">&times;</button>
                </div>
                <div class="modal-body">
                    <label for="responseText">Your Response:</label>
                    <textarea id="responseText" placeholder="Enter your response to this complaint..." rows="4" style="width: 100%; margin-top: 0.5rem; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.5rem; resize: vertical;"></textarea>
                </div>
                <div class="modal-actions">
                    <button id="submitResponseBtn" class="btn-primary">
                        <i class="fas fa-check"></i> Submit Response
                    </button>
                    <button id="cancelResponseBtn" class="btn-secondary">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(responseModal);
        
        const submitBtn = responseModal.querySelector('#submitResponseBtn');
        const cancelBtn = responseModal.querySelector('#cancelResponseBtn');
        const closeBtn = responseModal.querySelector('#closeResponseModal');
        const responseText = responseModal.querySelector('#responseText');
        
        const closeModal = () => {
            document.body.removeChild(responseModal);
        };
        
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        
        submitBtn.addEventListener('click', async () => {
            const response = responseText.value.trim();
            if (response) {
                try {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
                    await database.updateComplaintStatus(complaintId, 'resolved', response);
                    await database.loadComplaints();
                    adminUI.renderComplaintsStats();
                    adminUI.renderComplaintsList(document.querySelector('.filter-tab.active')?.dataset.filter || 'today');
                    adminUI.hideModal('complaintDetailsModal');
                    closeModal();
                    utils.showToast('Response added successfully!', 'success');
                } catch (error) {
                    console.error('Error adding complaint response:', error);
                    utils.showToast('Failed to add response', 'error');
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Response';
                }
            } else {
                utils.showToast('Please enter a response', 'warning');
            }
        });
        
        // Focus on textarea
        responseText.focus();
        
        // Close modal when clicking outside
        responseModal.addEventListener('click', (e) => {
            if (e.target === responseModal) {
                closeModal();
            }
        });
    },

    // Setup complaints event listeners
    setupComplaintsEventListeners: () => {
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                adminUI.renderComplaintsList(tab.dataset.filter);
            });
        });

        // Export complaints button
        const exportBtn = document.getElementById('exportComplaintsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', adminUI.exportComplaints);
        }

        // Bulk resolve button
        const bulkResolveBtn = document.getElementById('bulkResolveBtn');
        if (bulkResolveBtn) {
            bulkResolveBtn.addEventListener('click', adminUI.bulkResolveComplaints);
        }
    },

    // Get filtered complaints helper
    getFilteredComplaints: (complaints, filter) => {
        const today = new Date();
        const todayStr = today.toDateString();
        const yesterdayStr = new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (filter) {
            case 'today':
                return complaints.filter(c => 
                    c.createdAt && c.createdAt.toDate && c.createdAt.toDate().toDateString() === todayStr
                );
            case 'yesterday':
                return complaints.filter(c => 
                    c.createdAt && c.createdAt.toDate && c.createdAt.toDate().toDateString() === yesterdayStr
                );
            case 'week':
                return complaints.filter(c => 
                    c.createdAt && c.createdAt.toDate && c.createdAt.toDate() >= weekAgo
                );
            case 'pending':
                return complaints.filter(c => c.status === 'pending');
            case 'resolved':
                return complaints.filter(c => c.status === 'resolved');
            default:
                return complaints;
        }
    },

    // Export complaints to CSV
    exportComplaints: () => {
        const complaints = window.appState.complaints || [];
        const filter = document.querySelector('.filter-tab.active')?.dataset.filter || 'today';
        
        let filteredComplaints = adminUI.getFilteredComplaints(complaints, filter);
        
        if (filteredComplaints.length === 0) {
            utils.showToast('No complaints to export', 'warning');
            return;
        }

        // Create CSV content
        const headers = ['Name', 'Room', 'Category', 'Urgency', 'Status', 'Complaint', 'Date', 'Response'];
        const csvContent = [
            headers.join(','),
            ...filteredComplaints.map(c => [
                `"${c.name}"`,
                c.roomNumber,
                `"${c.category}"`,
                `"${c.urgency}"`,
                `"${c.status}"`,
                `"${c.text?.replace(/"/g, '""')}"`,
                `"${c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : ''}"`,
                `"${c.response ? c.response.replace(/"/g, '""') : ''}"`
            ].join(','))
        ].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complaints_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        utils.showToast('Complaints exported successfully!', 'success');
    },

    // Bulk resolve complaints
    bulkResolveComplaints: async () => {
        const pendingComplaints = window.appState.complaints.filter(c => c.status === 'pending');
        
        if (pendingComplaints.length === 0) {
            utils.showToast('No pending complaints to resolve', 'warning');
            return;
        }

        const confirmed = confirm(`Are you sure you want to mark all ${pendingComplaints.length} pending complaints as resolved?`);
        if (!confirmed) return;

        try {
            const promises = pendingComplaints.map(c => 
                database.updateComplaintStatus(c.id, 'resolved', 'Bulk resolved by admin')
            );
            
            await Promise.all(promises);
            await database.loadComplaints();
            adminUI.renderComplaintsStats();
            adminUI.renderComplaintsList(document.querySelector('.filter-tab.active')?.dataset.filter || 'today');
            
            utils.showToast(`${pendingComplaints.length} complaints marked as resolved`, 'success');
        } catch (error) {
            console.error('Error bulk resolving complaints:', error);
            utils.showToast('Failed to resolve complaints', 'error');
        }
    }
};

// Application Initialization
const app = {
    // Initialize the application
    init: async () => {
        try {
            ui.showLoading();

            // Wait for Firebase to be initialized
            if (!window.firebaseInitialized) {
                console.log('Waiting for Firebase initialization...');
                await new Promise(resolve => {
                    const checkInterval = setInterval(() => {
                        if (window.firebaseInitialized) {
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 100);
                });
            }

            console.log('Firebase initialized, starting app...');

            // Check which page we're on
            const isAdminPage = window.location.pathname.includes('admin.html');
            const isComplaintPage = window.location.pathname.includes('complaint.html');

            if (isAdminPage) {
                await app.initAdmin();
            } else if (isComplaintPage) {
                await app.initComplaint();
            } else {
                await app.initStudent();
            }

            ui.hideLoading();
        } catch (error) {
            console.error('Application initialization error:', error);
            ui.hideLoading();
            utils.showToast('Failed to initialize application', 'error');
        }
    },

    // Initialize student interface
    initStudent: async () => {
        // Check for stored authentication
        const authType = auth.checkStoredAuth();
        
        if (authType === 'student') {
            await app.loadStudentData();
            ui.showMainApp();
            app.startPeriodicUpdates();
        } else {
            ui.showStudentLogin();
        }

        // Set up event listeners
        app.setupStudentEventListeners();
        app.setupNavigationEventListeners();
        app.setupComplaintFormHandler();
        
        // Set up admin complaints if on admin page
        if (window.location.pathname.includes('admin.html')) {
            adminUI.setupComplaintsEventListeners();
            await database.loadComplaints();
            adminUI.renderComplaintsStats();
            adminUI.renderComplaintsList('today');
        }
        
        // Set up complaint functionality on main page
        await app.initComplaintFunctionality();
        
        // Initial section display
        ui.showSection('voting');
        
        // Update date and voting status
        ui.updateDateDisplay();
        ui.updateVotingStatus();
    },

    // Initialize complaint functionality within main app
    initComplaintFunctionality: async () => {
        // Set up complaint form handler
        app.setupComplaintFormHandler();
        
        // Set up refresh button
        const refreshBtn = document.getElementById('refreshComplaintsBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                await app.loadUserComplaints();
                refreshBtn.innerHTML = '<i class="fas fa-refresh"></i> Refresh Complaints';
            });
        }
        
        // Set up test complaint button
        const testBtn = document.getElementById('testComplaintBtn');
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                const currentUser = window.appState?.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
                if (!currentUser.name) {
                    utils.showToast('Please log in first', 'warning');
                    return;
                }
                
                testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
                
                const testComplaint = {
                    name: currentUser.name,
                    roomNumber: currentUser.roomNumber || currentUser.studentId || 101,
                    category: 'food-quality',
                    urgency: 'medium',
                    text: 'Test complaint - Food was not fresh today at lunch',
                    status: 'pending',
                    createdAt: serverTimestamp()
                };
                
                try {
                    await database.submitComplaint(testComplaint);
                    utils.showToast('Test complaint created!', 'success');
                    setTimeout(() => app.loadUserComplaints(), 1000);
                } catch (error) {
                    console.error('Error creating test complaint:', error);
                    utils.showToast('Failed to create test complaint', 'error');
                }
                
                testBtn.innerHTML = '<i class="fas fa-plus"></i> Create Test Complaint';
            });
        }
        
        // Load user complaints
        await app.loadUserComplaints();
    },

    // Initialize admin interface
    initAdmin: async () => {
        const authType = auth.checkStoredAuth();
        
        if (authType === 'admin' || window.appState.isAdmin) {
            await app.loadAdminData();
            ui.showAdminApp();
        } else {
            ui.showAdminLogin();
        }

        // Set up admin event listeners
        app.setupAdminEventListeners();
        
        // Update date display
        ui.updateDateDisplay();
    },

    // Load student data
    loadStudentData: async () => {
        try {
            await Promise.all([
                database.loadMenuItems(),
                database.loadVotingResults(),
                database.loadUserVotes(window.appState.currentUser.studentId),
                database.loadSettings(),
                database.loadWeeklyMenus()
            ]);

            // Set up real-time weekly menu listener
            if (!window.weeklyMenuListener) {
                window.weeklyMenuListener = database.setupWeeklyMenuListener();
            }

            ui.updateUserDisplay();
            
            // Render voting options for all meals
            await ui.renderVotingOptions('breakfast');
            await ui.renderVotingOptions('lunch');
            await ui.renderVotingOptions('dinner');
            
            ui.renderVotingResults();
            ui.renderWeeklyMenu();
            ui.updateVotingStatus();
            ui.renderTodaysWinners();
        } catch (error) {
            console.error('Error loading student data:', error);
            utils.showToast('Failed to load menu data', 'error');
        }
    },

    // Load admin data
    loadAdminData: async () => {
        try {
            await Promise.all([
                database.loadMenuItems(),
                database.loadUsers(),
                database.loadVotingResults(),
                database.loadSettings(),
                database.loadWeeklyMenus()
            ]);

            // Set up real-time weekly menu listener for admin
            if (!window.weeklyMenuListener) {
                window.weeklyMenuListener = database.setupWeeklyMenuListener();
            }

            adminUI.initNavigation();
            adminUI.initModals();
            await adminUI.updateDashboard();
            adminUI.renderSystemSettings();
        } catch (error) {
            console.error('Error loading admin data:', error);
            utils.showToast('Failed to load admin data', 'error');
        }
    },

    // Set up student event listeners
    setupStudentEventListeners: () => {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('studentName').value;
                const studentId = document.getElementById('studentId').value;
                
                const success = await auth.loginStudent(name, studentId);
                if (success) {
                    await app.loadStudentData();
                    ui.showMainApp();
                    app.startPeriodicUpdates();
                }
            });
        }

        // Profile dropdown
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdown = document.querySelector('.profile-dropdown');
        const logoutBtn = document.getElementById('logoutBtn');
        
        console.log('Profile elements:', { profileBtn, profileDropdown, logoutBtn });
        
        if (profileBtn && profileDropdown) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('Profile button clicked');
                profileDropdown.classList.toggle('active');
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (profileDropdown && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
        
        // Logout button
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                auth.logout();
            });
        }

        // Profile modal event handlers
        const profileModal = document.getElementById('profileModal');
        const closeProfileModal = document.getElementById('closeProfileModal');
        const logoutFromProfile = document.getElementById('logoutFromProfile');

        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => {
                if (profileModal) profileModal.style.display = 'none';
            });
        }

        if (logoutFromProfile) {
            logoutFromProfile.addEventListener('click', () => {
                if (profileModal) profileModal.style.display = 'none';
                auth.logout();
            });
        }

        // Close profile modal when clicking outside
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    profileModal.style.display = 'none';
                }
            });
        }
    },

    // Set up admin event listeners
    setupAdminEventListeners: () => {
        // Admin login form
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const username = document.getElementById('adminUsername').value;
                const password = document.getElementById('adminPassword').value;
                
                const success = await auth.loginAdmin(username, password);
                if (success) {
                    await app.loadAdminData();
                    ui.showAdminApp();
                }
            });
        }

        // Admin logout button
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener('click', auth.logout);
        }

        // Analytics date change
        const analyticsDate = document.getElementById('analyticsDate');
        const refreshAnalytics = document.getElementById('refreshAnalytics');
        
        if (refreshAnalytics) {
            refreshAnalytics.addEventListener('click', () => {
                adminUI.renderVotingAnalytics();
            });
        }

        if (analyticsDate) {
            analyticsDate.addEventListener('change', () => {
                adminUI.renderVotingAnalytics();
            });
        }

        // Settings save buttons
        const saveVotingHoursBtn = document.querySelector('.setting-card:nth-child(1) .btn-primary');
        const saveMenuCycleBtn = document.querySelector('.setting-card:nth-child(2) .btn-primary');
        
        if (saveVotingHoursBtn) {
            saveVotingHoursBtn.addEventListener('click', async () => {
                const startTime = document.getElementById('votingStartTime').value;
                const endTime = document.getElementById('votingEndTime').value;
                
                if (startTime && endTime) {
                    try {
                        await database.saveSettings({
                            votingStartTime: startTime,
                            votingEndTime: endTime
                        });
                    } catch (error) {
                        console.error('Error saving voting hours:', error);
                    }
                }
            });
        }
        
        if (saveMenuCycleBtn) {
            saveMenuCycleBtn.addEventListener('click', async () => {
                const cycleDays = parseInt(document.getElementById('menuCycleDays').value);
                
                if (cycleDays && cycleDays > 0 && cycleDays <= 14) {
                    try {
                        await database.saveSettings({
                            menuCycleDays: cycleDays
                        });
                    } catch (error) {
                        console.error('Error saving menu cycle:', error);
                    }
                }
            });
        }
    },

    // Setup navigation event listeners
    setupNavigationEventListeners: () => {
        // Handle bottom navigation item clicks
        document.querySelectorAll('.bottom-navigation .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.bottom-navigation .nav-item').forEach(navItem => {
                    navItem.classList.remove('active');
                });
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Handle navigation based on href or id
                const href = item.getAttribute('href');
                if (href) {
                    if (href === '#votingSection') {
                        ui.showSection('voting');
                    } else if (href === '#resultsSection') {
                        ui.showSection('results');
                    } else if (href === '#complaintsSection') {
                        ui.showSection('complaints');
                        // Load user complaints when navigating to complaints section
                        setTimeout(() => app.loadUserComplaints(), 500);
                    } else if (href === '#' || item.id === 'homeNavItem') {
                        // Home navigation
                        ui.showSection('voting');
                    }
                }
                
                // Handle profile modal
                if (item.id === 'profileNavItem') {
                    ui.showProfileModal();
                    return;
                }
            });
        });
    },

    // Show specific section
    showSection: (sectionName) => {
        // Handle different content areas in the main app
        const mainContent = document.querySelector('.main-content');
        const votingSection = document.getElementById('votingSection');
        const resultsSection = document.getElementById('resultsSection');
        const weeklyMenu = document.querySelector('.weekly-menu');
        
        // Hide all sections first
        if (votingSection) votingSection.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
        if (weeklyMenu) weeklyMenu.style.display = 'none';

        // Show target section and load data
        switch (sectionName) {
            case 'home':
                // Show all main content (default view)
                if (votingSection) votingSection.style.display = 'block';
                if (weeklyMenu) weeklyMenu.style.display = 'block';
                app.loadStudentData();
                break;
            case 'voting':
                // Show only voting section
                if (votingSection) votingSection.style.display = 'block';
                app.loadStudentData();
                break;
            case 'result':
                // Show only results section
                if (resultsSection) resultsSection.style.display = 'block';
                app.loadVotingResults();
                break;
            default:
                // Default to home view
                if (votingSection) votingSection.style.display = 'block';
                if (weeklyMenu) weeklyMenu.style.display = 'block';
                app.loadStudentData();
        }
    },

    // Show profile modal
    showProfileModal: () => {
        const profileModal = document.getElementById('profileModal');
        const profileName = document.getElementById('profileName');
        const profileId = document.getElementById('profileId');
        const profileLastLogin = document.getElementById('profileLastLogin');
        
        if (profileModal && window.appState.currentUser) {
            // Update profile information
            if (profileName) profileName.textContent = window.appState.currentUser.name;
            if (profileId) profileId.textContent = window.appState.currentUser.studentId;
            if (profileLastLogin) {
                const lastLogin = localStorage.getItem('lastLogin') || 'Just now';
                profileLastLogin.textContent = lastLogin;
            }
            
            // Show modal
            profileModal.style.display = 'flex';
        }
    },

    // Show profile section
    showProfile: () => {
        const profileName = document.getElementById('profileDisplayName');
        const profileId = document.getElementById('profileDisplayId');
        
        const currentUser = window.appState.currentUser;
        if (currentUser && profileName && profileId) {
            profileName.textContent = currentUser.name;
            profileId.textContent = currentUser.studentId;
        }
    },

    // Load voting results for results section
    loadVotingResults: async () => {
        try {
            await database.loadVotingResults();
            ui.renderVotingResults();
        } catch (error) {
            console.error('Error loading voting results:', error);
        }
    },

    // Setup complaint form handler
    setupComplaintFormHandler: () => {
        const complaintForm = document.getElementById('complaintForm');
        if (complaintForm) {
            // Set up photo upload functionality
            app.setupPhotoUpload();
            
            complaintForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(complaintForm);
                const photoFile = formData.get('photo');
                
                const complaintData = {
                    name: formData.get('name'),
                    roomNumber: parseInt(formData.get('roomNumber')),
                    category: formData.get('category'),
                    urgency: formData.get('urgency'),
                    text: formData.get('complaintText'),
                    status: 'pending',
                    createdAt: new Date(),
                    photoURL: null
                };

                // Validate room number
                if (complaintData.roomNumber < 1 || complaintData.roomNumber > 200) {
                    utils.showToast('Room number must be between 1 and 200', 'error');
                    return;
                }

                // Validate all required fields
                if (!complaintData.name || !complaintData.category || !complaintData.urgency || !complaintData.text) {
                    utils.showToast('Please fill in all required fields', 'error');
                    return;
                }

                try {
                    // Upload photo if provided
                    if (photoFile && photoFile.size > 0) {
                        // Check file size (5MB limit)
                        if (photoFile.size > 5 * 1024 * 1024) {
                            utils.showToast('Photo size must be less than 5MB', 'error');
                            return;
                        }
                        
                        const photoURL = await database.uploadComplaintPhoto(photoFile);
                        complaintData.photoURL = photoURL;
                    }

                    await database.submitComplaint(complaintData);
                    utils.showToast('Complaint submitted successfully!', 'success');
                    complaintForm.reset();
                    app.resetPhotoUpload();
                    
                    // Load user's recent complaints if we're on the complaint page
                    app.loadUserComplaints();
                } catch (error) {
                    console.error('Error submitting complaint:', error);
                    utils.showToast('Failed to submit complaint', 'error');
                }
            });
        }
    },

    // Setup photo upload functionality
    setupPhotoUpload: () => {
        const photoInput = document.getElementById('complaintPhoto');
        const uploadArea = document.getElementById('photoUploadArea');
        const photoPreview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');
        const removePhotoBtn = document.getElementById('removePhotoBtn');

        if (!photoInput || !uploadArea) return;

        // Handle file selection
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                app.handlePhotoSelection(file);
            }
        });

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    photoInput.files = files;
                    app.handlePhotoSelection(file);
                } else {
                    utils.showToast('Please select an image file', 'error');
                }
            }
        });

        // Remove photo button
        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', () => {
                app.resetPhotoUpload();
            });
        }
    },

    // Handle photo selection
    handlePhotoSelection: (file) => {
        const uploadArea = document.getElementById('photoUploadArea');
        const photoPreview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');

        if (!file.type.startsWith('image/')) {
            utils.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            utils.showToast('Photo size must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            uploadArea.style.display = 'none';
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },

    // Reset photo upload
    resetPhotoUpload: () => {
        const photoInput = document.getElementById('complaintPhoto');
        const uploadArea = document.getElementById('photoUploadArea');
        const photoPreview = document.getElementById('photoPreview');
        const previewImage = document.getElementById('previewImage');

        if (photoInput) photoInput.value = '';
        if (uploadArea) uploadArea.style.display = 'block';
        if (photoPreview) photoPreview.style.display = 'none';
        if (previewImage) previewImage.src = '';
    },

    // Load user's recent complaints
    loadUserComplaints: async () => {
        const userComplaintsList = document.getElementById('userComplaintsList');
        if (!userComplaintsList) {
            console.log('User complaints list element not found');
            return;
        }

        try {
            // Get current user from localStorage first, then app state
            let currentUser = null;
            
            // Try to get from localStorage
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    currentUser = JSON.parse(storedUser);
                } catch (e) {
                    console.log('Failed to parse stored user');
                }
            }
            
            // Fallback to app state
            if (!currentUser) {
                currentUser = window.appState?.currentUser;
            }

            if (!currentUser || !currentUser.name) {
                userComplaintsList.innerHTML = '<p class="no-complaints">Please log in to view your complaints.</p>';
                return;
            }

            console.log('Loading complaints for user:', currentUser.name);
            console.log('Current user object:', currentUser);
            const userComplaints = await database.getUserComplaints(currentUser.name);
            console.log('Retrieved complaints:', userComplaints);
            
            if (userComplaints.length === 0) {
                userComplaintsList.innerHTML = '<p class="no-complaints">You haven\'t submitted any complaints yet.</p>';
                return;
            }

            userComplaintsList.innerHTML = '';
            userComplaints.forEach(complaint => {
                const complaintElement = document.createElement('div');
                complaintElement.className = `user-complaint-item ${complaint.status}`;
                complaintElement.innerHTML = `
                    <div class="complaint-header">
                        <span class="complaint-category">${complaint.category?.replace('-', ' ')}</span>
                        <span class="complaint-status ${complaint.status}">${complaint.status}</span>
                    </div>
                    <div class="complaint-text">${complaint.text}</div>
                    ${complaint.photoURL ? `<img src="${complaint.photoURL}" alt="Complaint photo" class="complaint-photo" onclick="window.open('${complaint.photoURL}', '_blank')">` : ''}
                    <div class="complaint-meta">
                        <span><i class="fas fa-calendar"></i> ${complaint.createdAt?.toDate ? complaint.createdAt.toDate().toLocaleDateString() : 'Unknown'}</span>
                        <span><i class="fas fa-flag"></i> ${complaint.urgency}</span>
                    </div>
                    ${complaint.response ? `<div class="admin-response"><strong>Admin Response:</strong> ${complaint.response}</div>` : ''}
                `;
                userComplaintsList.appendChild(complaintElement);
            });
        } catch (error) {
            console.error('Error loading user complaints:', error);
            userComplaintsList.innerHTML = '<p class="error-message">Failed to load your complaints. Please try again.</p>';
        }
    },

    // Start periodic updates for student interface
    startPeriodicUpdates: () => {
        // Update voting status every minute
        setInterval(() => {
            ui.updateVotingStatus();
            ui.renderTodaysWinners(); // Update winners display when voting status changes
        }, 60000);

        // Update voting results every 30 seconds
        setInterval(async () => {
            if (window.appState.currentUser) {
                await database.loadVotingResults();
                ui.renderVotingResults();
                ui.renderTodaysWinners(); // Update winners when new results come in
            }
        }, 30000);

        // Update settings every 2 minutes to reflect admin changes
        setInterval(async () => {
            if (window.appState.currentUser) {
                await database.loadSettings();
                ui.updateVotingStatus();
            }
        }, 120000);
    }
};

// Make functions globally available for onclick handlers
window.adminUI = adminUI;
window.auth = auth;
window.utils = utils;

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase to initialize
    const checkFirebase = setInterval(() => {
        if (window.firebaseInitialized) {
            clearInterval(checkFirebase);
            app.init();
        }
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.appState.currentUser) {
        // Refresh data when page becomes visible
        setTimeout(() => {
            app.loadStudentData();
        }, 1000);
    }
});
