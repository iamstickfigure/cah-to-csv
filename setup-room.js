let widgets = window.playingCards.io.getWidgets();
let keys = Object.keys(widgets).filter(key => key !== "hand");
window.playingCards.io.removeWidgets(keys);

let newWidgets = {};

delete newWidgets["hand"];
window.playingCards.io.addWidgets(Object.values(newWidgets));