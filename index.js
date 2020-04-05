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

    for(let i of black) {
        blackCsv.push({
            label: label,
            prompt: fixBlackText(blackCards[i].text)
        });
    }

    for(let i of white) {
        whiteCsv.push({
            label: label,
            resp: fixText(whiteCards[i])
        });
    }

    await Promise.all([
        blackCsvWriter.writeRecords(blackCsv),
        whiteCsvWriter.writeRecords(whiteCsv)
    ]);
}

async function addExtraCsv(path, outPath) {
    if(!(await fs.pathExists(path))) {
        console.log(`Warning: ${path} does not exist, skipping`).
        return;
    }

    const extraCsv = await fs.readFile(path);
    await fs.appendFile(outPath, extraCsv);
}

function getLabel(deckName) {
    if(deckName !== "Base Set") {
        return deckName;
    }

    return "";
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
    await addJson('cah-decks/cah-main-exps.json', ['greenbox']);

    await addExtraCsv('csv-out/cah-coronavirus-white.csv', whiteCsvPath);

    // These extra house cards are a bunch of inside jokes, so not going to add that to the repo.
    await addExtraCsv('csv-out/cah-house-white.csv', whiteCsvPath);
}

addDecks().catch(err => console.log(err));
