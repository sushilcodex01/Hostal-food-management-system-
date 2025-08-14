# Hostel Food Menu System

## Overview

This is a web-based hostel food menu management system that allows students to vote on food preferences and enables administrators to manage menus. The application features a student voting portal and an admin panel for menu management, built with vanilla HTML, CSS, and JavaScript with Firebase as the backend.

## User Preferences

Preferred communication style: Simple, everyday language.
Authentication: Students must be pre-registered by admin before login.
Student ID format: 1-10 digits only.
UI design: Profile dropdown with logout hidden under user icon.
Analytics: Enhanced Voting Analytics with winners section when voting closes.
Results display: Show winning menu items with visual indicators and statistics.
Skip votes: Students can skip any meal by voting "Skip Meal" option.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla HTML5, CSS3, and ES6+ JavaScript
- **Design Pattern**: Single Page Application (SPA) with multiple HTML entry points
- **UI Framework**: Custom CSS with responsive design principles
- **External Libraries**: Font Awesome for icons, Google Fonts for typography

### Backend Architecture
- **Database**: Firebase Firestore (NoSQL document database)
- **Storage**: Firebase Storage for file uploads
- **Authentication**: Custom authentication logic (no Firebase Auth integration)
- **Real-time Updates**: Firestore real-time listeners for live data synchronization

### Module System
- **ES6 Modules**: Used for code organization and Firebase integration
- **Firebase Configuration**: Centralized in `firebaseconfig.js`
- **Main Logic**: Consolidated in `script.js` with modular functions

## Key Components

### 1. Student Portal (`index.html`)
- **Purpose**: Entry point for students to vote on food preferences
- **Features**: Student login with name and ID, menu voting interface
- **Authentication**: Simple form-based login without password verification

### 2. Admin Panel (`admin.html`)
- **Purpose**: Administrative interface for menu management
- **Features**: Admin login with username/password, menu CRUD operations
- **Authentication**: Username/password based admin access

### 3. Firebase Integration (`firebaseconfig.js`)
- **Database**: Firestore for storing menu items, votes, and user data
- **Storage**: Firebase Storage for menu item images
- **Configuration**: Placeholder configuration requiring actual Firebase project setup

### 4. Core Application Logic (`script.js`)
- **State Management**: Global application state object
- **Firebase Operations**: CRUD operations for menus, votes, and users
- **Real-time Updates**: Firestore listeners for live data synchronization
- **Utility Functions**: Date formatting, validation, and helper methods

### 5. Styling System (`style.css`)
- **Design System**: CSS custom properties for consistent theming
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Color Palette**: Professional color scheme with primary orange theme
- **Typography**: Inter and Poppins fonts for modern appearance

## Data Flow

### Student Voting Flow
1. Student enters name and ID on login screen
2. System validates and stores student information
3. Student views available menu options for different meals
4. Student submits votes for preferred food items
5. Votes are stored in Firestore with timestamp and student ID
6. Real-time updates reflect voting results

### Admin Management Flow
1. Admin logs in with credentials
2. Admin can create, read, update, and delete menu items
3. Admin can upload images for menu items to Firebase Storage
4. Admin can view voting results and analytics
5. Admin can manage voting periods and system settings

### Data Storage Structure
- **Collections**: menus, votes, users, settings
- **Documents**: Organized by date, meal type, and user ID
- **Real-time Sync**: Automatic updates across all connected clients

## External Dependencies

### Firebase Services
- **Firestore**: Document database for application data
- **Storage**: File storage for menu item images
- **Hosting**: Potential deployment platform

### CDN Dependencies
- **Font Awesome 6.4.0**: Icon library for UI elements
- **Google Fonts**: Inter and Poppins font families
- **Firebase SDK 9.22.0**: Client-side Firebase integration

### Browser APIs
- **ES6 Modules**: For modern JavaScript module system
- **Local Storage**: For client-side data persistence
- **Fetch API**: For HTTP requests (if needed for additional integrations)

## Deployment Strategy

### Current Setup
- **Static Files**: HTML, CSS, and JavaScript files for client-side rendering
- **Firebase Backend**: Requires Firebase project configuration
- **Configuration**: Firebase config object needs actual project credentials

### Deployment Options
1. **Firebase Hosting**: Natural choice given Firebase backend integration
2. **Static Hosting**: Any static file hosting service (Netlify, Vercel, GitHub Pages)
3. **Local Development**: Can run with local server for development

### Environment Configuration
- **Development**: Firebase emulators can be used for local testing
- **Production**: Requires Firebase project setup with proper security rules
- **Environment Variables**: Firebase configuration should be environment-specific

### Security Considerations
- **Firestore Rules**: Need to be configured for proper data access control
- **Storage Rules**: Required for image upload security
- **Input Validation**: Client-side validation needs server-side reinforcement
- **Admin Authentication**: Current system uses simple credential checking

The application follows a straightforward architecture suitable for a hostel environment, prioritizing ease of use for students and comprehensive management capabilities for administrators.