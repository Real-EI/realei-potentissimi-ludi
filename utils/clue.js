
import { CalendarDays, Euro, Home, Ruler } from "lucide-react";


// Clue definitions shown in the game. Answers are checked on the server: app/api/check + utils/answers.js.


export const CLUE_DEFINITIONS = [
    {
        id: "superficie",
        icon: Ruler,
        label: "Superficie",
        question: "Qual è la superficie commerciale dell'immobile?",
        placeholder: "Es. 45,00 m²",
        color: "blue",
        points: 100,
    },

    {
        id: "prezzoBase",
        icon: Euro,
        label: "Prezzo base",
        question: "Qual è il prezzo base d'asta?",
        placeholder: "Es. € 100.000",
        color: "emerald",
        points: 150,
    },

    {
        id: "dataAsta",
        icon: CalendarDays,
        label: "Data dell'asta",
        question: "Quando si svolge l'asta?",
        placeholder: "Es. 19/05/2026",
        color: "violet",
        points: 200,
    },

    {
        id: "occupazione",
        icon: Home,
        label: "Occupazione",
        question: "Qual è lo stato di occupazione dell'immobile?",
        placeholder: "Es. occupato dal debitore",
        color: "amber",
        points: 150,
    },
];

