const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs-extra');
const Entities = require('html-entities').AllHtmlEntities;
 
const htmlEnt = new Entities();

const blackCsvPath = 'csv-out/cah-black.csv';
const whiteCsvPath = 'csv-out/cah-white.csv';
const blackHeader = [
    { id: 'label', title: 'label' },
    { id: 'prompt', title: 'prompt' }
]
const whiteHeader = [
    { id: 'label', title: 'label' },
    { id: 'resp', title: 'response' }
]
const blackCsvWriter = createCsvWriter({ path: blackCsvPath, header: blackHeader });
const whiteCsvWriter = createCsvWriter({ path: whiteCsvPath, header: whiteHeader });
const blacklistP = loadBlacklist();

let blackCsv = [];
let whiteCsv = [];

const maxCards = 1183;
let numCards = 0;
let deduplicator = {};

async function addJson(path, exclude=[]) {
    const cardObj = await fs.readJson(path);

    const {
        order
    } = cardObj;

    for(let deckId of order) {
        if(!exclude.includes(deckId)) {
            await convertDeck(cardObj, deckId);
        }
    }
}

async function convertDeck(cardObj, deckId) {
    const blacklist = await blacklistP;

    const {
        blackCards,
        whiteCards,
    } = cardObj;

    const {
        name,
        black,
        white
    } = cardObj[deckId];

    const label = getLabel(name);

    const doBlack = i => {
        const text = blackCards[i].text;

        if(handleBlacklist(blacklist, text)) {
            blackCsv.push({
                label: label,
                prompt: fixBlackText(text)
            });
        }
    }

    const doWhite = i => {
        const text = whiteCards[i];

        if(handleBlacklist(blacklist, text)) {
            whiteCsv.push({
                label: label,
                resp: fixText(text)
            });
        }
    }

    if(Array.isArray(black)) {
        for(let i of black) {
            doBlack(i);
        }
    }
    else {
        for(let i = 0; i < blackCards.length; i++) {
            doBlack(i);
        }
    }

    if(Array.isArray(white)) {
        for(let i of white) {
            doWhite(i);
        }
    }
    else {
        for(let i = 0; i < whiteCards.length; i++) {
            doWhite(i);
        }
    }

    numCards = blackCsv.length + whiteCsv.length;
}

function handleBlacklist(blacklist, text) {
    const logRemove = () => console.log(`Blacklist: ${text}`);

    if(blacklist.fulltextSet[text]) {
        logRemove(text);
        return false;
    }

    for(let ex of blacklist.regex) {
        if(text.match(new RegExp(ex, 'i'))) {
            logRemove(text);
            return false;
        }
    }

    return true;
}

// Deprecated: This function was a mistake. Makes things kind of complicated.
async function addExtraCsv(path, outPath) {
    if(!(await fs.pathExists(path))) {
        console.log(`Warning: ${path} does not exist, skipping`).
        return;
    }

    const extraCsv = await fs.readFile(path);
    const lines = extraCsv.toString().split("\n");
    numCards += lines.length - 1;

    await fs.appendFile(outPath, lines.join('\n'));
}

async function loadBlacklist() {
    const json = await fs.readJson('blacklist.json');
    
    const { regex, fulltext } = json;
    const fulltextSet = {};

    for(let text of fulltext) {
        fulltextSet[text] = true;
    }

    return {
        fulltextSet,
        fulltext,
        regex
    };
}

function randomRemove(numBlack, numWhite) {
    let removalSetB = {};
    let removalSetW = {};

    for(let i = 0; i < numBlack;) {
        const rand = Math.floor(Math.random() * blackCsv.length);

        if(!removalSetB[rand]) {
            removalSetB[rand] = true;
            i++;
        }
    }

    for(let i = 0; i < numWhite;) {
        const rand = Math.floor(Math.random() * whiteCsv.length);

        if(!removalSetW[rand]) {
            removalSetW[rand] = true;
            i++;
        }
    }

    blackCsv = blackCsv.filter((val, i) => {
        if(removalSetB[i]) {
            console.log(`Randomly removing: ${JSON.stringify(val)}`);
            return false;
        }

        return true;
    });

    whiteCsv = whiteCsv.filter((val, i) => {
        if(removalSetW[i]) {
            console.log(`Randomly removing: ${JSON.stringify(val)}`);
            return false;
        }

        return true;
    });

    numCards = blackCsv.length + whiteCsv.length;
}

function getLabel(deckName) {
    if(deckName !== "Base Set") {
        return deckName;
    }

    return "";
}

function dedupeAll() {
    blackCsv = blackCsv.filter(card => dedupe(card.prompt));
    whiteCsv = whiteCsv.filter(card => dedupe(card.resp));

    numCards = blackCsv.length + whiteCsv.length;
}

function dedupe(text) {
    const key = dedupeKey(text);
    const match = deduplicator[key];

    if(match) {
        console.log(`Found duplicate, ${text} matches ${match}`);
        return false;
    }

    deduplicator[key] = text;
    return true;
}

function dedupeKey(text) {
    return text.toLowerCase().replace(/(\W|^)(a|the|of)\W/g, "").replace(/[\W_]/g, "");
}

function fixBlackText(text) {
    return extendBlanks(fixText(text));
}

function fixText(text) {
    let str = convertBreaks(text);
    str = removeTags(str);
    str = decodeHtml(str);

    checkText(str);

    return str;
}

function checkText(text) {
    let words = text.split(/\W+/g);

    const bigWords = words.filter(w => w.length > 15);

    if(bigWords.length > 0) {
        console.log(`Warning: Big words detected in "${text}" (Word over 14 chars)`);
    }
}

function extendBlanks(prompt) {
    return prompt.replace(/([^_])_([^_])/g, "$1______$2")
        .replace(/([^_])_$/g, "$1______")
        .replace(/^_([^_])/g, "______$1");
}

function convertBreaks(prompt) {
    return prompt.replace(/<br>/g, "                         ");
}

function decodeHtml(prompt) {
    return htmlEnt.decode(prompt);
}

function removeTags(prompt) {
    return prompt.replace(/<[^<>]*?>/g, "");
}

async function addDecks() {
    await addJson('cah-decks/cah-base.json');
    await addJson('cah-decks/cah-main-exps.json', [
        // 'greenbox', 
        // 'CAHe6', 
        // 'CAHe5', 
        // 'CAHe4', 
        // 'CAHe3', 
        // 'CAHe2',
        // 'CAHe1',
    ]);
    await addJson('cah-decks/cah-sci-food.json');
    await addJson('cah-decks/cah-fant-www.json');
    await addJson('cah-decks/cah-reject.json');
    await addJson('cah-decks/cah-crabs.json');

    // Randomly remove cards from the previous decks, then afterwards, add decks that we want to keep in full.
    randomRemove(300, 700);

    await addJson('cah-decks/cah-coronavirus.json');

    // These extra custom decks are a bunch of inside jokes or hand-picked from already created decks, so not going to add that to the repo.
    await addJson('cah-decks-custom/cah-house.json');
    await addJson('cah-decks-custom/cah-doc-edit.json');

    dedupeAll();

    console.log(`${numCards} cards ${numCards > maxCards ? '(over limit)' : ''}`);

    await Promise.all([
        blackCsvWriter.writeRecords(blackCsv),
        whiteCsvWriter.writeRecords(whiteCsv)
    ]);
}

addDecks().catch(err => console.log(err));
