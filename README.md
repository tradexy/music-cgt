## Instructions
Here is an overview of how to test the app and your options for deploying it to the web.
1. How to Test / "Play" the App
To test music-cgt (which you referred to as music-zai) locally on your computer, you cannot simply double-click the index.html file. Because the app uses React, TypeScript (.tsx), and ES Modules, browsers cannot read these files directly from your hard drive; they need to be "compiled" into standard JavaScript and served via a local web server.
The recommended way to run this locally:
Install Node.js: Download and install Node.js from nodejs.org.
Set up a project: Open your terminal/command prompt.
Use Vite (Recommended): Type npm create vite@latest music-cgt -- --template react-ts.
Copy Files: Copy the file contents I provided (App.tsx, components/, services/, etc.) into the src folder of that new project.
Run: Type npm run dev. This will start a local server (usually at http://localhost:5173).
Browser: Open that URL in Google Chrome or Microsoft Edge.
Why Chrome/Edge?
This app relies on the Web MIDI API. Currently, Chrome and Edge have the best native support for Web MIDI. Firefox and Safari often require specific manual configuration or do not support it fully.
Regarding "Pay":
If you meant "Play": You simply press the Play button in the UI once the app is running.
If you meant "Pay" (money): This code is generated for you by an AI; it is yours to use for free!
2. Deploying to the Internet
You can absolutely host this on GitHub Pages, Netlify, or Cloudflare. However, there are two critical requirements for this specific app:
HTTPS is Mandatory: The Web MIDI API requires a "Secure Context." This means the website must be served over https:// (not http://). Fortunately, GitHub Pages, Netlify, and Cloudflare all provide HTTPS for free automatically.
Build Step Required: As mentioned above, browsers cannot run .tsx files directly. You must "build" the project first (converting TypeScript to JavaScript).
Option A: Netlify (Easiest & Recommended)
Netlify is generally the easiest for React apps because it detects your settings automatically.
Push your code (the Vite project created in step 1) to a GitHub repository.
Log in to Netlify and click "Add new site" -> "Import an existing project".
Select your GitHub repository.
Netlify will detect it is a Vite/React app.
Build Command: npm run build
Publish Directory: dist
Click Deploy.
Option B: GitHub Pages
This works well but requires a little more configuration for React apps.
You cannot just upload the files. You need to set up a GitHub Action or use the gh-pages package to build the code and push the dist folder to a special branch.
It is free and fast, but if you are new to web development, the configuration can be tricky compared to Netlify.
Option C: Cloudflare Pages
This is very similar to Netlify (and slightly faster).
Connect your GitHub account to Cloudflare Pages.
Select the repo.
Select "Vite" or "React" as the framework.
It handles the rest.
Summary Recommendation
For music-cgt:
Testing: Use Chrome or Edge (essential for MIDI).
Hosting: Use Netlify. It is the most "set-it-and-forget-it" option for modern React applications. It handles the HTTPS certificate (crucial for MIDI) and the build process automatically.

---

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1mec8rb0LImgmJ-gs7OE1kuDiudMYPYRw

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
