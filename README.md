# 🐱 Sir Isaac's Vocab Studio

**Sir Isaac's Vocab Studio** is a creative, AI-powered vocabulary learning tool designed to make studying new words visually engaging and fun. Guided by "Sir Isaac" (a chubby orange tabby cat), users can generate vocabulary lists based on topics, create whimsical watercolor illustrations for each word, and arrange them into beautiful study cards or collages.

Powered by **Google Gemini 2.5 Flash** and **Gemini 3 Preview**.

## ✨ Features

### 🧠 AI Vocabulary Generation
*   **Topic-Based Generation**: Enter a theme (e.g., "Space Exploration", "Cooking") and select proficiency levels (A1-C2, TOEIC, etc.) to generate a curated list of words.
*   **Manual Input**: Input specific words to get detailed definitions, KK phonetics, and example sentences in English and the target language.
*   **Contextual Learning**: Every word comes with a definition and bilingual example sentences.

### 🖥️ Flexible Workspace
*   **Resizable Panels**: Drag the dividers to adjust the width of the "Setup Studio" and "Results" panels to your liking.
*   **Collapsible Drawers**: maximize your canvas area by collapsing the side panels with a single click.
*   **Responsive Design**: Optimized UI that adapts intelligently to different panel widths.

### 🎨 AI Image Studio
*   **Auto-Generation**: Automatically generates "Soft watercolor and ink" style illustrations for every vocabulary word using **Gemini 2.5 Flash Image**.
*   **Magic Editor**: Use natural language prompts to edit existing images (e.g., "Add a party hat", "Make it snowy").
*   **Drag & Drop Grid**: Arrange your cards in various layouts (Single, Split, Grid 4, Grid 9, Focus views).

### 🛠️ Customization & Export
*   **Smart Layouts**: Toggle between text overlays, definitions, and sentences on the cards.
*   **Collage Stitching**: Stitch your grid layout into a single high-resolution PNG for download.
*   **Enhanced Styling Settings**:
    *   **Line Styles**: Choose from Solid, Dashed, Dotted, Double, or Groove styles for your collage dividers.
    *   **Modern Color Picker**: Select from curated presets or use the rainbow gradient picker for any color.
    *   **Visual Controls**: Adjust line thickness with visual feedback.

## 🚀 Tech Stack

*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS
*   **AI Integration**: Google GenAI SDK (`@google/genai`)
*   **Icons**: Lucide React
*   **Font**: Comic Neue & Noto Sans TC

## 🛠️ Getting Started

### Prerequisites
*   Node.js (v18 or higher recommended)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key from [Google AI Studio](https://aistudio.google.com/).

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/sir-isaacs-vocab-studio.git
    cd sir-isaacs-vocab-studio
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Google Gemini API Key:
    
    ```env
    API_KEY=your_actual_api_key_here
    ```
    
    > **Note**: The application uses `process.env.API_KEY`. Ensure your build tool (Webpack/Vite/Parcel) supports environment variable injection.

4.  **Run the application**
    ```bash
    npm start
    ```

## 📖 Usage

1.  **Setup Panel**: Open the left panel (click the "Nap Mode/Studio Open" toggle on desktop).
2.  **Generate Words**: Choose a topic or enter manual words. Select your target language.
3.  **Select Layout**: Use the top bar to choose a grid layout (e.g., 4-grid).
4.  **Assign Words**: Click a box in the grid, then select a word from the generated list on the left.
5.  **Generate Images**: Click "Generate" on the grid cell to create an AI illustration.
6.  **Export**: Click "Stitch & Download Collage" at the bottom to save your creation.

## 🔒 Security Note

This project uses the API Key on the client-side (frontend). 
*   **For Development**: Using `.env` is fine.
*   **For Production**: It is highly recommended to set up **HTTP Referrer restrictions** on your API Key in the Google Cloud Console to prevent unauthorized usage if you deploy this to a public URL.

## 📄 License

This project is open source.
