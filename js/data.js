/* ==========================================================================
   Jadis & Fleurs — données du site (à modifier ici, sans toucher au reste)
   Sources : fiche Google Maps, page Facebook et Instagram de la boutique (nov. 2026).
   ========================================================================== */
window.JF = {
  name: 'Jadis & Fleurs',
  tel: '03 83 31 83 92',
  telHref: 'tel:+33383318392',
  email: 'jadisetfleurs@outlook.fr',

  // Numéro MOBILE de la boutique (ex. '+33612345678'). Le 03 83 31 83 92 est un fixe :
  // un SMS n'y arriverait pas. Si tu renseignes un mobile, un bouton « SMS » apparaît dans la réservation.
  sms: '',

  address: '8a rue de Nancy, 54230 Chavigny',
  mapsUrl: 'https://www.google.com/maps/place/Jadis+%26+Fleurs/@48.6276076,6.1225736,17z/data=!4m6!3m5!1s0x4794a1250694124b:0xe3c9f5a7ad7f05f9!8m2!3d48.6276076!4d6.1225736!16s%2Fg%2F11zyslfjkv',
  facebook: 'https://www.facebook.com/jadisetfleurs/',
  instagram: 'https://www.instagram.com/jadisetfleurs/',
  tz: 'Europe/Paris',

  // Horaires (0 = dimanche … 6 = samedi) — fiche Google, nov. 2026
  hours: {
    0: [['10:00', '13:00']],
    1: [['14:30', '19:00']],
    2: [['09:30', '12:00'], ['14:30', '19:00']],
    3: [['09:30', '12:00']],
    4: [['09:30', '12:00'], ['14:30', '19:00']],
    5: [['09:30', '12:00'], ['14:30', '19:00']],
    6: [['09:30', '12:00'], ['14:30', '19:00']]
  },
  // Jours de fermeture exceptionnelle, au format 'AAAA-MM-JJ' (ex. jours fériés)
  closedDates: [],
  // Délai minimum entre la demande et le retrait le jour même (minutes)
  leadMinutes: 120,

  // Précommande de plantes de Noël (publication Facebook du 16 novembre 2026)
  noel: {
    deadlineISO: '2026-11-21T23:59:59+01:00', // date limite de commande : samedi 21 novembre
    deadlineLabel: 'samedi 21 novembre',
    readyFrom: '2026-12-02',                 // « première semaine de décembre, à partir du mercredi »
    readyLabel: 'mercredi 2 décembre',
    categories: {
      agrume: 'Agrumes',
      mimosa: 'Mimosa',
      verte: 'Plantes vertes'
    },
    items: [
      { id: 'citron-vert',        cat: 'agrume', name: 'Citron vert',          spec: 'Pot 20 cm · ht 70-80 cm',          price: 62.5 },
      { id: 'citronnier',         cat: 'agrume', name: 'Citronnier',           spec: 'Pot 24 cm · ht 130-150 cm',        price: 112.5 },
      { id: 'citronnier-tige',    cat: 'agrume', name: 'Citronnier tige',      spec: 'Pot 20 cm · ht 70-80 cm',          price: 62.5 },
      { id: 'clementinier-tige',  cat: 'agrume', name: 'Clémentinier tige',    spec: 'Pot 20 cm · ht 70-80 cm',          price: 62.5 },
      { id: 'kumquat-tige',       cat: 'agrume', name: 'Kumquat tige',         spec: 'Pot 20 cm · ht 65-75 cm',          price: 62.5 },
      { id: 'orange-20',          cat: 'agrume', name: 'Orangé',               spec: 'Pot 20 cm · 70-80 cm',             price: 62.5 },
      { id: 'orange-24',          cat: 'agrume', name: 'Orangé',               spec: 'Pot 24 cm · ht 130-150 cm',        price: 100 },
      { id: 'mimosa',             cat: 'mimosa', name: 'Mimosa Gaulois',       spec: 'Pot 15 cm · ht 40-45 cm',          price: 25 },
      { id: 'mimosa-tige',        cat: 'mimosa', name: 'Mimosa Gaulois tige',  spec: 'Pot 24 cm · ht 140-150 cm',        price: 62.5 },
      { id: 'beaucarnea',         cat: 'verte',  name: 'Beaucarnea',           spec: 'Pot 20 cm',                        price: 40 },
      { id: 'ficus-ginseng',      cat: 'verte',  name: 'Ficus Ginseng',        spec: '1,5 kg · pot 25 cm · ht 55-60 cm', price: 112.5 },
      { id: 'ficus-ginseng-coupe',cat: 'verte',  name: 'Ficus Ginseng coupe',  spec: 'Pot 20 cm · 45-50 cm',             price: 40 },
      { id: 'monstera',           cat: 'verte',  name: 'Monstera',             spec: 'Pot 21 cm · ht 60-70 cm',          price: 47.5 },
      { id: 'strelitzia',         cat: 'verte',  name: 'Strelitzia Augusta',   spec: 'Pot 26 cm',                        price: 112.5 }
    ]
  },

  // Types de demande proposés dans le formulaire de réservation
  types: [
    { id: 'bouquet',     label: 'Bouquet composé',              thumb: 'img/thumbs/bouquet.jpg' },
    { id: 'roses',       label: 'Roses',                        thumb: 'img/thumbs/roses.jpg' },
    { id: 'plante',      label: 'Plante ou orchidée',           thumb: 'img/thumbs/plante.jpg' },
    { id: 'noel',        label: 'Création de Noël',             thumb: 'img/thumbs/noel.jpg' },
    { id: 'precommande', label: 'Précommande plantes de Noël',  thumb: 'img/thumbs/precommande.jpg' },
    { id: 'cheque',      label: 'Chèque-cadeau',                thumb: 'img/thumbs/cheque.jpg' },
    { id: 'autre',       label: 'Autre demande',                thumb: 'img/thumbs/autre.jpg' }
  ],
  budgets: ['Environ 25 €', 'Environ 40 €', 'Environ 60 €', 'Environ 80 €', '100 € et plus', 'À voir ensemble']
};
