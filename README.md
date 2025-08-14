# Hostel Food Menu System 🍽️

A comprehensive web-based hostel food menu management system with advanced complaint tracking, built using Firebase integration. This application enables students to vote on food preferences while providing administrators with powerful tools to manage menus and track feedback.

## 🌟 Features

### Student Portal
- **Easy Login**: Simple registration with name and student ID (1-10 digits)
- **Menu Voting**: Vote on daily food preferences for breakfast, lunch, and dinner
- **Skip Option**: Students can skip any meal with dedicated "Skip Meal" voting
- **Real-time Updates**: Live synchronization of menu changes and voting results
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Admin Panel
- **Secure Access**: Username/password protected admin authentication
- **Menu Management**: Complete CRUD operations for menu items
- **Image Upload**: Firebase Storage integration for food item photos
- **Voting Analytics**: Enhanced analytics with winners section and statistics
- **Real-time Monitoring**: Live tracking of student votes and preferences

### Advanced Features
- **Complaint System**: Comprehensive complaint submission and tracking mechanism
- **Photo Evidence**: Image upload functionality for complaint documentation
- **Admin Response Management**: Structured system for handling and responding to complaints
- **Real-time Database**: Firebase Firestore for instant data synchronization
- **Modern UI/UX**: Clean, intuitive interface with glassmorphism design elements

## 🚀 Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Firebase Firestore (NoSQL Database)
- **Storage**: Firebase Storage for image uploads
- **Architecture**: Single Page Application (SPA) with modular design
- **Styling**: Custom CSS with responsive design principles
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Inter & Poppins from Google Fonts

## 📁 Project Structure

```
├── index.html          # Student portal entry point
├── admin.html          # Admin panel interface
├── script.js           # Core application logic (3466 lines)
├── style.css           # Comprehensive styling (2981 lines)
├── firebaseconfig.js   # Firebase configuration and initialization
├── replit.md           # Project documentation and architecture
└── README.md           # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase project with Firestore and Storage enabled
- Basic understanding of HTML/CSS/JavaScript

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/hostel-food-menu-system.git
   cd hostel-food-menu-system
   ```

2. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database and Storage
   - Copy your Firebase config object

3. **Configure Firebase**
   - Open `firebaseconfig.js`
   - Replace the placeholder config with your actual Firebase configuration:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project.firebaseio.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

4. **Deploy**
   - Upload files to your web server or hosting platform
   - Or run locally with Python: `python3 -m http.server 5000`
   - Access the application at `http://localhost:5000`

## 📖 Usage Guide

### For Students
1. Visit the application homepage
2. Enter your full name and student ID (1-10 digits)
3. Browse available menu options for each meal
4. Vote for your preferred food items
5. Option to skip any meal if desired
6. Submit complaints with photo evidence if needed

### For Administrators
1. Navigate to `/admin.html`
2. Login with admin credentials
3. **Menu Management**:
   - Add new food items with images
   - Edit existing menu options
   - Remove outdated items
   - Set meal categories (breakfast, lunch, dinner)
4. **Analytics Dashboard**:
   - View voting statistics
   - See winning menu items
   - Track student preferences
5. **Complaint Management**:
   - Review submitted complaints
   - Respond to student feedback
   - Track resolution status

## 🔒 Security Features

- **Input Validation**: Comprehensive form validation and sanitization
- **Admin Protection**: Secure admin panel with authentication
- **Firebase Rules**: Proper Firestore security rules implementation
- **Data Integrity**: Real-time validation and error handling

## 📊 Database Structure

### Collections
- `students`: Student registration data
- `menus`: Menu items with categories and images
- `votes`: Student voting records
- `complaints`: Complaint submissions with photos
- `admin_responses`: Administrative responses to complaints

## 🎨 UI/UX Design

- **Modern Interface**: Clean, professional design with intuitive navigation
- **Glassmorphism Effects**: Modern UI elements with blur and transparency
- **Responsive Layout**: Optimized for all device sizes
- **Color Scheme**: Professional color palette with accessibility considerations
- **Typography**: Inter and Poppins fonts for excellent readability

## 🔧 Configuration

### Environment Variables
- Firebase configuration is managed through `firebaseconfig.js`
- No additional environment variables required

### Admin Setup
- Default admin credentials can be configured in the application
- Recommend changing default passwords before production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and structure
- Test all features thoroughly
- Update documentation for new features
- Ensure responsive design compatibility

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports & Feature Requests

Please use the GitHub Issues tab to report bugs or request new features. When reporting bugs, include:
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📞 Support

For additional support or questions:
- Create an issue on GitHub
- Check the `replit.md` file for detailed architecture information
- Review the code comments for implementation details

## 🏆 Acknowledgments

- Firebase team for excellent backend services
- Font Awesome for comprehensive icon library
- Google Fonts for beautiful typography
- The open-source community for inspiration and best practices

---

**Built with ❤️ for hostel communities worldwide**

*Last updated: August 2025*