import type { Recipe, ShoppingCategory } from '../types';

const ingredient = (
  id: string,
  name: string,
  amount: string,
  category: ShoppingCategory,
) => ({ id, name, amount, category });

export const seedRecipes: Recipe[] = [
  {
    id: 'recipe-haehnchen-reis',
    name: 'Hähnchen-Reis-Pfanne',
    description:
      'Schnelles Meal-Prep-Gericht mit viel Protein, buntem Gemüse und einer leichten Sojasoße.',
    emoji: '🍗',
    servings: 2,
    minutes: 25,
    tags: ['High Protein', 'Meal Prep', 'Schnell'],
    kcalPerServing: 512,
    createdAt: 1,
    ingredients: [
      ingredient('hr-1', 'Hähnchenbrustfilet', '300 g', 'Fleisch & Fisch'),
      ingredient('hr-2', 'Basmatireis', '150 g', 'Vorrat'),
      ingredient('hr-3', 'Brokkoli', '250 g', 'Obst & Gemüse'),
      ingredient('hr-4', 'Paprika rot', '1 Stück', 'Obst & Gemüse'),
      ingredient('hr-5', 'Sojasoße', '3 EL', 'Vorrat'),
      ingredient('hr-6', 'Olivenöl', '1 EL', 'Vorrat'),
      ingredient('hr-7', 'Knoblauch', '1 Zehe', 'Obst & Gemüse'),
    ],
    steps: [
      'Reis nach Packungsangabe kochen.',
      'Hähnchen in Streifen schneiden, würzen und im heißen Olivenöl rundherum goldbraun braten.',
      'Brokkoli und Paprika klein schneiden und 5 Minuten mitbraten.',
      'Knoblauch und Sojasoße dazugeben, kurz durchschwenken und mit dem Reis servieren.',
    ],
  },
  {
    id: 'recipe-nudelsalat',
    name: 'Mediterraner Nudelsalat',
    description:
      'Frischer Nudelsalat mit Tomaten, Gurke, Feta und einem Zitronen-Olivenöl-Dressing.',
    emoji: '🥗',
    servings: 4,
    minutes: 20,
    tags: ['Vegetarisch', 'Meal Prep', 'Schnell'],
    kcalPerServing: 386,
    createdAt: 2,
    ingredients: [
      ingredient('ns-1', 'Nudeln (Farfalle)', '400 g', 'Vorrat'),
      ingredient('ns-2', 'Tomaten', '300 g', 'Obst & Gemüse'),
      ingredient('ns-3', 'Gurke', '1 Stück', 'Obst & Gemüse'),
      ingredient('ns-4', 'Feta', '200 g', 'Molkerei & Eier'),
      ingredient('ns-5', 'Oliven', '100 g', 'Vorrat'),
      ingredient('ns-6', 'Zitrone', '1 Stück', 'Obst & Gemüse'),
      ingredient('ns-7', 'Olivenöl', '4 EL', 'Vorrat'),
    ],
    steps: [
      'Nudeln al dente kochen, abtropfen und kurz abkühlen lassen.',
      'Tomaten und Gurke würfeln, Feta grob zerbröseln.',
      'Zitronensaft mit Olivenöl, Salz und Pfeffer verrühren.',
      'Alle Zutaten mischen, Dressing unterheben und 10 Minuten ziehen lassen.',
    ],
  },
  {
    id: 'recipe-overnight-oats',
    name: 'Overnight Oats mit Beeren',
    description:
      'Cremige Haferflocken über Nacht eingeweicht – das perfekte Frühstück zum Mitnehmen.',
    emoji: '🥣',
    servings: 1,
    minutes: 10,
    tags: ['Vegetarisch', 'Schnell', 'Frühstück'],
    kcalPerServing: 424,
    createdAt: 3,
    ingredients: [
      ingredient('oo-1', 'Haferflocken zart', '60 g', 'Vorrat'),
      ingredient('oo-2', 'Naturjoghurt 3,5 %', '150 g', 'Molkerei & Eier'),
      ingredient('oo-3', 'Milch 1,5 %', '100 ml', 'Molkerei & Eier'),
      ingredient('oo-4', 'Beeren gemischt', '100 g', 'Obst & Gemüse'),
      ingredient('oo-5', 'Chiasamen', '1 EL', 'Vorrat'),
      ingredient('oo-6', 'Honig', '1 TL', 'Vorrat'),
    ],
    steps: [
      'Haferflocken, Joghurt, Milch und Chiasamen in einem Glas verrühren.',
      'Über Nacht (mindestens 4 Stunden) in den Kühlschrank stellen.',
      'Am Morgen mit Beeren und einem Teelöffel Honig toppen.',
    ],
  },
  {
    id: 'recipe-lachs-brokkoli',
    name: 'Ofenlachs mit Brokkoli',
    description:
      'Zarter Lachs auf einem Blech mit Brokkoli, Zitrone und Kräutern – wenig Aufwand, viel Geschmack.',
    emoji: '🐟',
    servings: 2,
    minutes: 30,
    tags: ['High Protein', 'Low Carb', 'Schnell'],
    kcalPerServing: 468,
    createdAt: 4,
    ingredients: [
      ingredient('lb-1', 'Lachsfilet', '2 Stück', 'Fleisch & Fisch'),
      ingredient('lb-2', 'Brokkoli', '500 g', 'Obst & Gemüse'),
      ingredient('lb-3', 'Zitrone', '1 Stück', 'Obst & Gemüse'),
      ingredient('lb-4', 'Olivenöl', '2 EL', 'Vorrat'),
      ingredient('lb-5', 'Kirschtomaten', '200 g', 'Obst & Gemüse'),
      ingredient('lb-6', 'Dill', '1 Bund', 'Obst & Gemüse'),
    ],
    steps: [
      'Backofen auf 200 °C Ober-/Unterhitze vorheizen.',
      'Brokkoli und Tomaten mit Olivenöl, Salz und Pfeffer auf ein Blech geben.',
      '10 Minuten vorbacken, dann Lachs darauflegen und weitere 12–15 Minuten garen.',
      'Mit Zitronenspalten und frischem Dill servieren.',
    ],
  },
  {
    id: 'recipe-veggie-chili',
    name: 'Veggie-Chili',
    description:
      'Würziges Chili sin Carne mit Kidneybohnen, Mais und Paprika. Perfekt zum Vorkochen.',
    emoji: '🌶️',
    servings: 4,
    minutes: 35,
    tags: ['Vegan', 'Meal Prep', 'Familie'],
    kcalPerServing: 342,
    createdAt: 5,
    ingredients: [
      ingredient('vc-1', 'Kidneybohnen (Dose)', '2 Dosen', 'Vorrat'),
      ingredient('vc-2', 'Mais (Dose)', '1 Dose', 'Vorrat'),
      ingredient('vc-3', 'Passierte Tomaten', '500 g', 'Vorrat'),
      ingredient('vc-4', 'Paprika rot', '2 Stück', 'Obst & Gemüse'),
      ingredient('vc-5', 'Zwiebel', '2 Stück', 'Obst & Gemüse'),
      ingredient('vc-6', 'Reis', '200 g', 'Vorrat'),
      ingredient('vc-7', 'Chilipulver', '1 TL', 'Vorrat'),
    ],
    steps: [
      'Zwiebeln und Paprika würfeln und in etwas Öl anschwitzen.',
      'Chilipulver dazugeben, dann passierte Tomaten, Bohnen und Mais einrühren.',
      '20 Minuten köcheln lassen und mit Salz, Pfeffer und Kreuzkümmel abschmecken.',
      'Mit gekochtem Reis servieren oder portionsweise einfrieren.',
    ],
  },
  {
    id: 'recipe-protein-pancakes',
    name: 'Protein-Pancakes',
    description:
      'Fluffige Pancakes mit Quark und Whey – ein süßes Frühstück mit ordentlich Protein.',
    emoji: '🥞',
    servings: 2,
    minutes: 15,
    tags: ['High Protein', 'Vegetarisch', 'Schnell'],
    kcalPerServing: 356,
    createdAt: 6,
    ingredients: [
      ingredient('pp-1', 'Magerquark', '200 g', 'Molkerei & Eier'),
      ingredient('pp-2', 'Eier', '2 Stück', 'Molkerei & Eier'),
      ingredient('pp-3', 'Haferflocken zart', '60 g', 'Vorrat'),
      ingredient('pp-4', 'Whey Protein Vanille', '30 g', 'Vorrat'),
      ingredient('pp-5', 'Backpulver', '1 TL', 'Vorrat'),
      ingredient('pp-6', 'Beeren gemischt', '100 g', 'Obst & Gemüse'),
    ],
    steps: [
      'Quark, Eier, Haferflocken, Whey und Backpulver zu einem Teig mixen.',
      'Teig 5 Minuten quellen lassen.',
      'Portionsweise in einer beschichteten Pfanne bei mittlerer Hitze goldbraun backen.',
      'Mit Beeren servieren.',
    ],
  },
];

export function findRecipe(recipes: Recipe[], id: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.id === id);
}
