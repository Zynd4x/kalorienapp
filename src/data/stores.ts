import type { Store } from '../types';

export const stores: Store[] = [
  {
    id: 'aldi',
    name: 'Aldi',
    color: '#00457C',
    light: '#E7F0F8',
    url: 'https://www.aldi-sued.de/prospekte',
  },
  {
    id: 'edeka',
    name: 'Edeka',
    color: '#B8860B',
    light: '#FDF6DC',
    url: 'https://www.edeka.de/angebote/',
  },
  {
    id: 'rewe',
    name: 'REWE',
    color: '#CC071E',
    light: '#FBE9EB',
    url: 'https://www.rewe.de/angebote/',
  },
  {
    id: 'lidl',
    name: 'Lidl',
    color: '#0050AA',
    light: '#E8F1FB',
    url: 'https://www.lidl.de/prospekte',
  },
  {
    id: 'penny',
    name: 'Penny',
    color: '#C8102E',
    light: '#FBE9EC',
    url: 'https://www.penny.de/angebote',
  },
  {
    id: 'netto',
    name: 'Netto',
    color: '#B79A00',
    light: '#FCF8DE',
    url: 'https://www.netto-online.de/angebote',
  },
  {
    id: 'kaufland',
    name: 'Kaufland',
    color: '#D40F1C',
    light: '#FBE9EA',
    url: 'https://www.kaufland.de/angebote/',
  },
];

export function getStore(id: string): Store | undefined {
  return stores.find((store) => store.id === id);
}
