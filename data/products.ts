export type Product = {
  slug: string;
  name:string;
  type:string;
  image:string;
  description:string;
  price: number | null;
}

export const products: Product [] = [
  { slug: "rashguard-naughty-by-nature",name: "Rashguard “Naughty by Nature”", type: "Rashguard · Edición limitada", image: "/assets/rashguard-naughty.jpeg" ,description: "Rashguard de edición limitada diseñada para entrenamientos de Jiu Jitsu No-Gi y Submission Grappling.",price: 24},
  { slug: "rashguard-onix",name: "Rashguard ONYX", type: "Rashguard manga larga", image: "/assets/rashguard-onyx.jpeg",description: "Rashguard manga larga con identidad TVA, diseñada para entrenamiento y competición.",price: 24},
  { slug: "fightshort-protect-ya-neck",name: 'Fightshort Protect Ya Neck', type: 'Fightshort No-Gi', image: '/assets/fightshort-protect.jpeg',description:"Fightshort de la colección Protect Ya Neck para Jiu Jitsu No-Gi, MMA y Submission Grappling.",price: 15 },
  { slug: "coleccion-serpiente",name: 'Colección Serpiente', type: 'Fightshort TVA', image: '/assets/fightshort-collection.jpg', description:"Diseño inspirado en la identidad Dark Side de Team Vivas Academy.",price: 15 },
  { slug: "tva-50-50", name: 'TVA 50/50', type: 'Fightshort TVA', image: '/assets/tva_50_50.jpeg',description: "Fightshort TVA desarrollado para libertad de movimiento durante el entrenamiento.",price: 40},
  { slug: "hoodies-tva",name: 'Hoodies TVA', type: 'Hoodie TVA', image: '/assets/hoodies.png', description: "Conjunto TVA disponible edición “False Reap Devils” (rojo) y “Shinobi Style” (negro).",price: 40},
  { slug: "rashguard-protect-ya-neck",name: 'Rashguard Protect Ya Neck', type: 'Rashguard', image: '/assets/rash_wu_tang.jpg',description:"Rashguard de la colección Protect Ya Neck para Jiu Jitsu No-Gi, MMA y Submission Grappling.",price: 22},
];
