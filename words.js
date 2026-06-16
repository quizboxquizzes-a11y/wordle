// words.js - Dynamic Wordle Dictionary Loader
// This automatically pulls down all 12,966 official 5-letter words 
// directly from the open-source Wordle database.

window.WORDLE_DICTIONARY = {
    TARGET_WORDS: [],
    VALID_GUESSES: [],
    ALL_WORDS: []
};

async function loadWordLists() {
    try {
        const response = await fetch("https://raw.githubusercontent.com/tabatkins/wordle-list/master/words");
        if (!response.ok) throw new Error("Network response was not ok");
        const text = await response.text();
        const allWords = text.split("\n").map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
        
        // Split the words into Answers (~2,300) and obscure Scrabble words (~10,600)
        // Just like the real NYT game engine
        window.WORDLE_DICTIONARY.TARGET_WORDS = allWords.slice(0, 2315);
        window.WORDLE_DICTIONARY.VALID_GUESSES = allWords.slice(2315);
        window.WORDLE_DICTIONARY.ALL_WORDS = allWords;
        
        console.log(`Successfully loaded ${allWords.length} five-letter words!`);
        return true;
    } catch (error) {
        console.error("Failed to fetch official word list, loading backup bank:", error);
        // Backup list if GitHub raw is ever down
        const backup = ["CRANE", "STARE", "PLANT", "AUDIO", "SHARK", "APPLE", "TRAIN", "HOUSE"];
        window.WORDLE_DICTIONARY.TARGET_WORDS = backup;
        window.WORDLE_DICTIONARY.ALL_WORDS = backup;
        return false;
    }
}
