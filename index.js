const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs-extra');
const Entities = require('html-entities').AllHtmlEntities;
 
const htmlEnt = new Entities();

const blackHeader = [
    { id: 'label', title: 'label' },
    { id: 'prompt', title: 'prompt' }
]
const whiteHeader = [
    { id: 'label', title: 'label' },
    { id: 'resp', title: 'response' }
]
const blackCsvWriter = createCsvWriter({ path: 'cah-black.csv', header: blackHeader });
const whiteCsvWriter = createCsvWriter({ path: 'cah-white.csv', header: whiteHeader });

async function addJson(path) {
    const cardObj = await fs.readJson(path);

    const {
        order
    } = cardObj;

    for(let deckId of order) {
        await writeDeck(cardObj, deckId);
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

    return str;
}

function extendBlanks(prompt) {
    return prompt.replace(/([^_])_([^_])/g, "$1______$2")
        .replace(/([^_])_$/g, "$1______")
        .replace(/^_([^_])/g, "______$1");
}

function convertBreaks(prompt) {
    return prompt.replace("<br>", "                         ");
}

function decodeHtml(prompt) {
    return htmlEnt.decode(prompt);
}

function removeTags(prompt) {
    return prompt.replace(/<[^<>]*?>/g, "");
}

async function addDecks() {
    await addJson('cah-base.json');
    await addJson('cah-main-exps.json');
}

try {
    addDecks();
}
catch(err) {
    console.log(err);
}