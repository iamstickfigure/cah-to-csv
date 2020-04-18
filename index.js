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
            await writeDeck(cardObj, deckId);
        }
    }
}

async function writeDeck(cardObj, deckId) {
    const {
        blackCards,
        whiteCards,
    } = cardObj;

    const {
        name,
        black,
        white
    } = cardObj[deckId];

    let blackCsv = [];
    let whiteCsv = [];

    const label = getLabel(name);

    const doBlack = i => {
        const text = fixBlackText(blackCards[i].text);

        if(dedupe(text)) {
            blackCsv.push({
                label: label,
                prompt: text
            });
    
            numCards++;
        }
    }

    const doWhite = i => {
        const text = fixText(whiteCards[i]);

        if(dedupe(text)) {
            whiteCsv.push({
                label: label,
                resp: text
            });
    
            numCards++;
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

    await Promise.all([
        blackCsvWriter.writeRecords(blackCsv),
        whiteCsvWriter.writeRecords(whiteCsv)
    ]);
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

async function randomRemove(path, numToRemove, keepRegex=null) {
    const csv = await fs.readFile(path);
    const lines = csv.toString().split("\n").filter(line => line.length > 0);
    const numLines = lines.length;
    let removalSet = {};

    for(let i = 0; i < numToRemove;) {
        const rand = Math.floor(Math.random() * (numLines-1)) + 1;

        if(rand > 0 && rand < numLines && !removalSet[rand]) {
            if(!keepRegex || !lines[rand].match(keepRegex)) {
                removalSet[rand] = true;
                i++;
            }
        }
    }

    const filtered = lines.filter((val, i) => {
        if(removalSet[i]) {
            console.log(`Randomly removing: ${val}`);
            return false;
        }

        return true;
    });

    await fs.writeFile(path, filtered.join('\n'));

    numCards -= numToRemove;
}

function getLabel(deckName) {
    if(deckName !== "Base Set") {
        return deckName;
    }

    return "";
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

    const bigWords = words.filter(w => w.length > 14);

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
        'CAHe5', 
        // 'CAHe4', 
        // 'CAHe3', 
        // 'CAHe2',
        'CAHe1',
    ]);
    await addJson('cah-decks/cah-sci-food.json', ['science']);
    await addJson('cah-decks/cah-fant-www.json');

    await addJson('cah-decks/cah-coronavirus.json');
    await addJson('cah-decks/cah-house.json'); // These extra house cards are a bunch of inside jokes, so not going to add that to the repo.

    await randomRemove('csv-out/cah-black.csv', 136);
    await randomRemove('csv-out/cah-white.csv', 50, /coronavirus pack|house cards/i);

    console.log(`${numCards} cards ${numCards > maxCards ? '(over limit)' : ''}`);
}

addDecks().catch(err => console.log(err));
