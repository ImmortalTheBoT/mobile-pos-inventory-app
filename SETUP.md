
## 🛠️ Complete Beginner's Setup Guide

To use this application for your own store, you must connect it to your own Google Sheet and build the app on your computer. Follow these steps carefully.

### Step 1: Set Up Your Google Sheet Database

Your app needs a database to store items and bills. We use a free Google Sheet for this.

1. Create a brand new Google Sheet.
2. Rename the tabs at the bottom of the screen to exactly match these five names: `Inventory`, `Sales_History`, `Users`, `Coupons`, and `Stock_History`.
3. In the top menu, click **Extensions** and select **Apps Script**.
4. Delete any code there, and paste the code from the `GoogleAppsScript.js` file provided in this repository.
5. Click the **Save** icon (floppy disk).
6. Click the blue **Deploy** button at the top right, then **New deployment**.
7. Click the gear icon next to "Select type" and choose **Web app**.
8. Under "Execute as", select **Me**.
9. Under "Who has access", select **Anyone**.
10. Click **Deploy**, authorize the permissions with your Google account, and copy the **Web App URL** it gives you. Keep this URL safe!

### Step 2: Install Required Software

To edit the code and build an Android app, you need three free tools on your computer:

1. **Visual Studio Code (VS Code):** The code editor. Download it from code.visualstudio.com.
2. **Node.js:** The environment that runs the code. Download the "LTS" version from nodejs.org.
3. **Android Studio:** Required to compile the app into an APK. Download it from developer.android.com and install with default settings.

### Step 3: Open the Project in VS Code

1. Download this entire repository to your computer and extract the folder.
2. Open **VS Code**.
3. Go to the top menu and click **File > Open Folder**.
4. Select the downloaded app folder (e.g., `MataDiApp`).

### Step 4: Install Dependencies (Printing & Core Packages)

The app relies on external packages (like `react-native-print` for generating PDFs and thermal receipts). You need to download these packages to your computer.

1. In VS Code, go to the top menu and click **Terminal > New Terminal**.
2. A command line will open at the bottom of the screen.
3. Type the following command and press Enter: `npm install`
4. Wait for the process to finish. This will create a `node_modules` folder containing all the required imports and printing tools.

### Step 5: Connect Your Google Sheet to the Code

1. In the left-hand file explorer in VS Code, open the `src` folder, then click on `api.js`.
2. Look at the very top of the file for the `API_URL` variable.
3. Delete the placeholder text and paste the **Web App URL** you copied in Step 1.
4. Go to **File > Save**.

### Step 6: Compile and Build the APK

Now you will convert the code into an installable Android `.apk` file.

1. In your VS Code terminal, type the following command to move into the Android folder and press Enter: `cd android`
2. Type the following command to start the build process and press Enter (Note: This may take 5 to 15 minutes depending on your computer speed): `./gradlew assembleRelease`
3. Once you see "BUILD SUCCESSFUL", open your computer's file explorer.
4. Navigate to: `android > app > build > outputs > apk > release`.
5. You will find a file named `app-release.apk`.
6. Transfer this `.apk` file to your Android phone via USB or Google Drive, tap it, and install your brand-new inventory app!